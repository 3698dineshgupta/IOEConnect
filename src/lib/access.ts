// Access rules shared by server code (authoritative) and UI (display only).
// Always re-check on the server before serving any file.
import type { AccessType, Profile, ResourceStatus } from "@/lib/types";

/**
 * `scoped_premium` carries the per-program decision (see lib/program-premium.ts): when it is set it
 * replaces the account-wide premium flag, because one purchase unlocks one program only.
 */
type AccessProfile = Pick<Profile, "is_premium" | "premium_expires_at" | "role"> & { scoped_premium?: boolean };
type AccessResource = { access_type: AccessType; status: ResourceStatus };

/** Account-wide: is_premium && premium_expires_at > now (or the per-program decision when `scoped_premium` is set). */
export function isPremiumActive(
  profile: (Pick<Profile, "is_premium" | "premium_expires_at"> & { scoped_premium?: boolean }) | null | undefined,
  now: Date = new Date(),
): boolean {
  if (profile && profile.scoped_premium !== undefined) return profile.scoped_premium;
  if (!profile?.is_premium || !profile.premium_expires_at) return false;
  const expires = new Date(profile.premium_expires_at).getTime();
  return Number.isFinite(expires) && expires > now.getTime();
}

/**
 * Whether `profile` (null = anonymous) may open `resource`.
 * - Admins: any resource.
 * - Others: only PUBLISHED; FREE for everyone, PREMIUM needs active premium.
 * Note: if site_settings.resources.require_login_for_free is enabled, callers
 * must additionally require a signed-in user for FREE resources.
 */
export function canAccessResource(profile: AccessProfile | null | undefined, resource: AccessResource): boolean {
  if (profile && (profile.role === "ADMIN" || profile.role === "SUPER_ADMIN")) return true;
  if (resource.status !== "PUBLISHED") return false;
  if (resource.access_type === "FREE") return true;
  return isPremiumActive(profile);
}

/**
 * Download and print are Premium features (admins too). Everyone else, including free members
 * and guests, is view-only. This is the single rule; the download route re-checks it server-side.
 */
export function canDownloadPdf(profile: AccessProfile | null | undefined): boolean {
  if (!profile) return false;
  if (profile.role === "ADMIN" || profile.role === "SUPER_ADMIN") return true;
  return isPremiumActive(profile);
}

/** Days of premium remaining (0 when inactive). */
export function premiumDaysLeft(
  profile: Pick<Profile, "is_premium" | "premium_expires_at"> | null | undefined,
  now: Date = new Date(),
): number {
  if (!isPremiumActive(profile, now)) return 0;
  const ms = new Date(profile!.premium_expires_at!).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

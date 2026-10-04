import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/types";

export interface AuditEntry {
  /** Acting admin's profile id (null for system actions). */
  adminId: string | null;
  /** Dotted verb, e.g. "resource.publish", "user.role_change", "settings.update". */
  action: string;
  targetType?: string | null;
  targetId?: string | number | null;
  metadata?: Record<string, Json | undefined>;
}

/**
 * Append an audit log entry. Uses the service-role client, so call it only
 * AFTER the caller has been authorized (requireAdmin). Never throws: audit
 * failures are logged server-side and reported via the return value.
 */
export async function logAudit({ adminId, action, targetType, targetId, metadata }: AuditEntry): Promise<boolean> {
  try {
    const cleaned = metadata
      ? Object.fromEntries(Object.entries(metadata).filter(([, v]) => v !== undefined))
      : {};
    const { error } = await createAdminClient()
      .from("audit_logs")
      .insert({
        admin_id: adminId,
        action,
        target_type: targetType ?? null,
        target_id: targetId == null ? null : String(targetId),
        metadata: cleaned,
      });
    if (error) {
      console.error("[audit] insert failed", { action, error });
      return false;
    }
    return true;
  } catch (err) {
    console.error("[audit] insert failed", { action, err });
    return false;
  }
}

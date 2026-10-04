import type { Metadata } from "next";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/page-header";
import { UsersTable, type AdminUserRow } from "@/components/admin/users-table";
import { Button, EmptyState, Input } from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Users" };

const PAGE_SIZE = 20;
const COLUMNS = "id, full_name, email, college, year, semester, referral_code, is_premium, premium_started_at, premium_expires_at, role, created_at";
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user, profile } = await requireAdmin("/admin/users");
  const sp = await searchParams;
  const q = (one(sp.q) ?? "").trim().slice(0, 80);
  const filter = one(sp.filter) === "premium" ? "premium" : one(sp.filter) === "admins" ? "admins" : "all";
  const page = Math.max(1, Math.floor(Number(one(sp.page))) || 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = createAdminClient().from("profiles").select(COLUMNS, { count: "exact" });
  if (q) {
    // Strip characters that have meaning inside a PostgREST filter expression.
    const safe = q.replace(/[,()%*\\"']/g, " ").trim();
    if (safe) query = query.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%`);
  }
  if (filter === "premium") query = query.eq("is_premium", true).gt("premium_expires_at", new Date().toISOString());
  if (filter === "admins") query = query.in("role", ["ADMIN", "SUPER_ADMIN"]);
  const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
  if (error) console.error("[admin/users] load failed", error);

  const { data: programRows } = await createAdminClient().from("programs").select("id, name, short_name").eq("is_active", true).order("sort_order", { ascending: true });
  const programs = (programRows ?? []).map((p) => ({ id: p.id as string, label: ((p.short_name as string | null) ? `${p.short_name} - ${p.name}` : (p.name as string)) }));

  const users = (data ?? []) as unknown as AdminUserRow[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const href = (p: number, f = filter) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (f !== "all") params.set("filter", f);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `/admin/users?${s}` : "/admin/users";
  };

  return (
    <>
      <AdminPageHeader title="Users" description={`${total.toLocaleString("en-US")} ${total === 1 ? "account" : "accounts"} ${q ? "match your search" : "in total"}.`} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form action="/admin/users" role="search" className="flex flex-1 gap-2 sm:max-w-md">
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
          <div className="relative flex-1">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={q} placeholder="Search by name or email" aria-label="Search users" className="pl-9" />
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>
        <div className="inline-flex rounded-lg bg-muted p-1" role="group" aria-label="Filter users">
          {([["all", "All"], ["premium", "Premium"], ["admins", "Admins"]] as const).map(([k, label]) => (
            <Link
              key={k}
              href={href(1, k)}
              aria-current={filter === k ? "true" : undefined}
              className={cn("rounded-md px-3 py-1.5 text-sm font-medium", filter === k ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">Users could not be loaded. Refresh to try again.</p>
      ) : users.length ? (
        <>
          <UsersTable users={users} isSuper={profile.role === "SUPER_ADMIN"} currentUserId={user.id} programs={programs} />
          <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Page {page} of {pages}</span>
            <span className="flex gap-2">
              {page > 1 ? <Link href={href(page - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>Previous</Link> : <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none opacity-50")} aria-disabled="true">Previous</span>}
              {page < pages ? <Link href={href(page + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>Next</Link> : <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none opacity-50")} aria-disabled="true">Next</span>}
            </span>
          </nav>
        </>
      ) : (
        <EmptyState icon={<Users aria-hidden />} title="No users found" description={q ? "Try a different name or email." : "Accounts appear here after people sign up."} />
      )}
    </>
  );
}

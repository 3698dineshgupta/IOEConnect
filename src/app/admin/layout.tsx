import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin | IOE Connect" },
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin("/admin");
  return (
    <AdminShell user={{ name: profile.full_name, email: profile.email, avatar: profile.avatar, role: profile.role }}>
      {children}
    </AdminShell>
  );
}

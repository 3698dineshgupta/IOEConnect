import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import type { MerchProduct } from "@/lib/types";
import { CommunityAdminHeader } from "@/components/community/admin-header";
import { MerchAdmin } from "@/components/community/MerchAdmin";
import { FormMessage } from "@/components/community/FormMessage";

export const metadata: Metadata = { title: "Merchandise | Admin" };
export const dynamic = "force-dynamic";

export default async function AdminMerchandisePage() {
  await requireAdmin("/admin/merchandise");
  const supabase = await createServerClient();
  const { data, error } = await supabase.from("merch_products").select("*").order("created_at", { ascending: false });

  return (
    <div>
      <CommunityAdminHeader title="Merchandise" description="Manage products shown on the public /merch page." />
      {error ? (
        <FormMessage kind="error">Could not load products. Please refresh.</FormMessage>
      ) : (
        <MerchAdmin products={(data ?? []) as MerchProduct[]} />
      )}
    </div>
  );
}

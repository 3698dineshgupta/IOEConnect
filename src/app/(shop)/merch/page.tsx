import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { PublicShell } from "@/components/layout/public-shell";
import { Badge, Card, EmptyState, buttonVariants } from "@/components/ui";
import { createServerClient } from "@/lib/supabase/server";
import type { MerchProduct } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatNpr } from "@/components/community/common";
import { getShellUser } from "@/components/community/shell-user";

export const metadata: Metadata = {
  title: "IOE Connect Merchandise",
  description: "IOE Connect merchandise for IOE students. Browse the items and contact us to place an order.",
};
export const dynamic = "force-dynamic";

export default async function MerchPage() {
  const shellUser = await getShellUser();
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("merch_products")
    .select("id, name, description, price, stock, images, is_available")
    .eq("is_available", true)
    .order("created_at", { ascending: false })
    .limit(60);
  const products = (data ?? []) as Pick<MerchProduct, "id" | "name" | "description" | "price" | "stock" | "images" | "is_available">[];

  return (
    <PublicShell user={shellUser}>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Merchandise</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Show your IOE Connect pride. Online checkout is coming soon. For now, contact us to place an order.
        </p>

        <div className="mt-8">
          {error ? (
            <EmptyState title="Could not load products" description="Please refresh the page or try again later." />
          ) : products.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag aria-hidden />}
              title="No merchandise yet"
              description="New items will appear here soon."
            />
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => {
                const soldOut = p.stock <= 0;
                const image = p.images?.[0];
                return (
                  <li key={p.id}>
                    <Card className="flex h-full flex-col overflow-hidden">
                      <div className="relative aspect-square bg-muted">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={image}
                            alt={p.name}
                            loading="lazy"
                            className={cn("size-full object-cover", soldOut && "opacity-60")}
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-muted-foreground">
                            <ShoppingBag aria-hidden className="size-10" />
                          </div>
                        )}
                        <div className="absolute left-3 top-3">
                          {soldOut ? (
                            <Badge variant="danger">Out of stock</Badge>
                          ) : p.stock <= 5 ? (
                            <Badge variant="warning">Only {p.stock} left</Badge>
                          ) : (
                            <Badge variant="success">In stock</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-4">
                        <h2 className="break-words font-semibold">{p.name}</h2>
                        {p.description && (
                          <p className="line-clamp-3 whitespace-pre-line break-words text-sm text-muted-foreground">{p.description}</p>
                        )}
                        <p className="mt-auto pt-2 text-lg font-bold text-primary">{formatNpr(Number(p.price))}</p>
                        <Link
                          href={`/contact?subject=merch`}
                          className={cn(buttonVariants({ variant: soldOut ? "outline" : "primary" }), "w-full")}
                        >
                          {soldOut ? "Ask about restock" : "Contact to order"}
                        </Link>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </PublicShell>
  );
}

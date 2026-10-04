"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Pencil, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Switch,
  Textarea,
} from "@/components/ui";
import { createBrowserClient } from "@/lib/supabase/client";
import { deleteMerchProduct, saveMerchProduct, setMerchAvailability } from "@/lib/actions/merch";
import type { MerchProduct } from "@/lib/types";
import { formatBytes } from "@/lib/utils";
import { IMAGE_MIME_TYPES, formatNpr } from "./common";
import { ConfirmActionButton } from "./ConfirmActionButton";
import { FormMessage } from "./FormMessage";

const MAX_IMAGES = 8;
const MAX_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

interface Draft {
  id: string | null;
  name: string;
  description: string;
  price: string;
  stock: string;
  isAvailable: boolean;
  images: string[];
}

const emptyDraft: Draft = { id: null, name: "", description: "", price: "", stock: "0", isAvailable: true, images: [] };

export function MerchAdmin({ products }: { products: MerchProduct[] }) {
  const router = useRouter();
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [newFiles, setNewFiles] = React.useState<File[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [rowError, setRowError] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  const previews = React.useMemo(() => newFiles.map((f) => ({ f, url: URL.createObjectURL(f) })), [newFiles]);
  React.useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  function open(p: MerchProduct | null) {
    setError(null);
    setNewFiles([]);
    setDraft(
      p
        ? {
            id: p.id,
            name: p.name,
            description: p.description ?? "",
            price: String(p.price),
            stock: String(p.stock),
            isAvailable: p.is_available,
            images: p.images ?? [],
          }
        : emptyDraft,
    );
  }

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!draft) return;
    const accepted: File[] = [];
    for (const f of picked) {
      if (!(IMAGE_MIME_TYPES as readonly string[]).includes(f.type)) return setError("Images must be PNG, JPG or WebP.");
      if (f.size > MAX_BYTES) return setError(`${f.name} is ${formatBytes(f.size)}. The maximum is 5 MB per image.`);
      accepted.push(f);
    }
    if (draft.images.length + newFiles.length + accepted.length > MAX_IMAGES) {
      return setError(`At most ${MAX_IMAGES} images per product.`);
    }
    setNewFiles((cur) => [...cur, ...accepted]);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setError(null);
    setBusy(true);
    const uploaded: string[] = [];
    const supabase = createBrowserClient();
    try {
      for (const f of newFiles) {
        const path = `products/${crypto.randomUUID()}.${EXT[f.type]}`;
        const { error: upErr } = await supabase.storage.from("merch").upload(path, f, { contentType: f.type, upsert: false });
        if (upErr) {
          console.error(upErr);
          throw new Error("An image could not be uploaded. Please try again.");
        }
        uploaded.push(supabase.storage.from("merch").getPublicUrl(path).data.publicUrl);
      }
      const res = await saveMerchProduct(draft.id, {
        name: draft.name,
        description: draft.description,
        price: draft.price,
        stock: draft.stock,
        isAvailable: draft.isAvailable,
        images: [...draft.images, ...uploaded],
      });
      if (!res.ok) {
        throw new Error(res.error);
      }
      setDraft(null);
      setNewFiles([]);
      router.refresh();
    } catch (err) {
      // Roll back images uploaded in this attempt.
      if (uploaded.length) {
        const prefix = "/object/public/merch/";
        const paths = uploaded.map((u) => decodeURIComponent(u.slice(u.indexOf(prefix) + prefix.length)));
        await supabase.storage.from("merch").remove(paths).catch(() => undefined);
      }
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function toggle(p: MerchProduct, value: boolean) {
    setRowError(null);
    startTransition(async () => {
      const res = await setMerchAvailability(p.id, value);
      if (!res.ok) setRowError(res.error);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => open(null)}>
          <Plus aria-hidden /> Add product
        </Button>
      </div>
      {rowError && <FormMessage kind="error" className="mb-4">{rowError}</FormMessage>}

      {products.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag aria-hidden />}
          title="No products yet"
          description="Add your first merchandise item."
          action={<Button onClick={() => open(null)}>Add product</Button>}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <li key={p.id}>
              <Card className="flex h-full flex-col overflow-hidden">
                <div className="aspect-[4/3] bg-muted">
                  {p.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0]} alt={p.name} loading="lazy" className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                      <ShoppingBag aria-hidden className="size-8" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="break-words font-semibold">{p.name}</h2>
                    <Badge variant={p.is_available ? "success" : "neutral"}>{p.is_available ? "Listed" : "Hidden"}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatNpr(Number(p.price))} - {p.stock} in stock - {p.images?.length ?? 0} image(s)
                  </p>
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Switch checked={p.is_available} onCheckedChange={(v) => toggle(p, v)} aria-label={`Available: ${p.name}`} />
                      Available
                    </label>
                    <div className="ml-auto flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => open(p)}>
                        <Pencil aria-hidden /> Edit
                      </Button>
                      <ConfirmActionButton
                        title={`Delete ${p.name}?`}
                        description="The product and its images will be permanently removed."
                        confirmLabel="Delete"
                        variant="danger"
                        action={() => deleteMerchProduct(p.id)}
                      >
                        <Trash2 aria-hidden /> Delete
                      </ConfirmActionButton>
                    </div>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={draft !== null}
        onOpenChange={(o) => !busy && !o && setDraft(null)}
        title={draft?.id ? "Edit product" : "Add product"}
        className="max-h-[90vh] max-w-xl overflow-y-auto"
      >
        {draft && (
          <form onSubmit={save} className="space-y-4" noValidate>
            <DialogHeader>
              <DialogTitle>{draft.id ? "Edit product" : "Add product"}</DialogTitle>
              <DialogDescription>Images are stored in the public merch bucket.</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="mp-name">Name</Label>
              <Input id="mp-name" value={draft.name} maxLength={150} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mp-desc">Description</Label>
              <Textarea id="mp-desc" value={draft.description} maxLength={2000} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="mp-price">Price (NPR)</Label>
                <Input id="mp-price" type="number" inputMode="decimal" min={0} step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mp-stock">Stock</Label>
                <Input id="mp-stock" type="number" inputMode="numeric" min={0} step={1} value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} required />
              </div>
            </div>
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={draft.isAvailable} onCheckedChange={(v) => setDraft({ ...draft, isAvailable: v })} aria-label="Available for sale" />
              Visible on the shop page
            </label>

            <div className="space-y-2">
              <Label htmlFor="mp-images">Images ({draft.images.length + newFiles.length}/{MAX_IMAGES})</Label>
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {draft.images.map((url, i) => (
                  <li key={url} className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Product image ${i + 1}`} className="size-full object-cover" />
                    <button
                      type="button"
                      aria-label={`Remove image ${i + 1}`}
                      onClick={() => setDraft({ ...draft, images: draft.images.filter((u) => u !== url) })}
                      className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
                    >
                      <X aria-hidden className="size-3" />
                    </button>
                  </li>
                ))}
                {previews.map((p, i) => (
                  <li key={p.url} className="relative aspect-square overflow-hidden rounded-md border border-dashed border-primary bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={`New image ${i + 1}`} className="size-full object-cover" />
                    <button
                      type="button"
                      aria-label={`Remove new image ${i + 1}`}
                      onClick={() => setNewFiles(newFiles.filter((f) => f !== p.f))}
                      className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
                    >
                      <X aria-hidden className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
              <label
                htmlFor="mp-images"
                className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-card px-3 text-sm font-semibold hover:bg-muted"
              >
                <ImagePlus aria-hidden className="size-4" /> Add images
              </label>
              <input id="mp-images" type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={onFiles} className="sr-only" />
            </div>

            {error && <FormMessage kind="error">{error}</FormMessage>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDraft(null)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" loading={busy}>
                {draft.id ? "Save changes" : "Add product"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>
    </div>
  );
}

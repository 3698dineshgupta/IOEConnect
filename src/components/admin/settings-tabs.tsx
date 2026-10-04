"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageUp, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Select,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { ACCESS_TYPES, type PaymentMethodSetting, type PremiumPlan, type SettingKey, type SettingsMap } from "@/lib/types";
import { deletePlanAction, saveSettingAction, savePlanAction, uploadQrAction } from "@/app/admin/settings/actions";
import { ScgpaTab } from "./scgpa-tab";

export interface AuditRow {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  created_at: string;
  admin: string | null;
  metadata: Record<string, unknown>;
}

function useSave<K extends SettingKey>(key: K, success = "Settings saved") {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const save = async (value: SettingsMap[K]) => {
    setSaving(true);
    const res = await saveSettingAction(key, value);
    setSaving(false);
    if (res.ok) {
      toast.success(success);
      router.refresh();
    } else toast.error(res.error);
  };
  return { saving, save };
}

function Field({ label, htmlFor, hint, children, className }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Toggle({ id, label, hint, checked, onChange }: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

const toNum = (raw: string) => (raw.trim() === "" || Number.isNaN(Number(raw)) ? 0 : Number(raw));

function Section({ title, description, children, footer }: { title: string; description?: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
      <div className="flex justify-end border-t border-border p-4">{footer}</div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Website
// ---------------------------------------------------------------------------
function WebsiteTab({ initial }: { initial: SettingsMap["site"] }) {
  const [s, setS] = React.useState(initial);
  const { saving, save } = useSave("site", "Website settings saved");
  const social = (k: keyof SettingsMap["site"]["social"]) => ({
    value: s.social[k] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, social: { ...s.social, [k]: e.target.value } }),
  });
  return (
    <Section
      title="Website"
      description="Name, contact details and social links shown across the site."
      footer={<Button loading={saving} onClick={() => save(s)}>Save website settings</Button>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Site name" htmlFor="s-name"><Input id="s-name" value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} /></Field>
        <Field label="Contact email" htmlFor="s-email"><Input id="s-email" type="email" value={s.contact_email} onChange={(e) => setS({ ...s, contact_email: e.target.value })} /></Field>
      </div>
      <Field label="Tagline" htmlFor="s-tag"><Input id="s-tag" value={s.tagline} onChange={(e) => setS({ ...s, tagline: e.target.value })} /></Field>
      <Field label="Description" htmlFor="s-desc"><Textarea id="s-desc" rows={3} value={s.description} onChange={(e) => setS({ ...s, description: e.target.value })} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        {(["facebook", "instagram", "telegram", "discord", "youtube"] as const).map((k) => (
          <Field key={k} label={k.charAt(0).toUpperCase() + k.slice(1) + " URL"} htmlFor={`s-${k}`}>
            <Input id={`s-${k}`} type="url" placeholder="https://" {...social(k)} />
          </Field>
        ))}
      </div>
      <div className="space-y-3">
        <Toggle id="s-ann" label="Show announcement banner" checked={s.announcement.enabled} onChange={(v) => setS({ ...s, announcement: { ...s.announcement, enabled: v } })} />
        {s.announcement.enabled && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Announcement message" htmlFor="s-ann-m"><Input id="s-ann-m" value={s.announcement.message} maxLength={300} onChange={(e) => setS({ ...s, announcement: { ...s.announcement, message: e.target.value } })} /></Field>
            <Field label="Announcement link (optional)" htmlFor="s-ann-h"><Input id="s-ann-h" value={s.announcement.href} onChange={(e) => setS({ ...s, announcement: { ...s.announcement, href: e.target.value } })} /></Field>
          </div>
        )}
        <Toggle id="s-reg" label="Allow new registrations" checked={s.allow_registrations} onChange={(v) => setS({ ...s, allow_registrations: v })} />
        <Toggle id="s-maint" label="Maintenance mode" hint="Visitors see a maintenance notice." checked={s.maintenance_mode} onChange={(v) => setS({ ...s, maintenance_mode: v })} />
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Premium (settings + plans CRUD)
// ---------------------------------------------------------------------------
type PlanDraft = { id?: string; name: string; price: string; duration_days: string; description: string; benefits: string; is_active: boolean; sort_order: string };
const blankPlan = (order: number): PlanDraft => ({ name: "", price: "", duration_days: "30", description: "", benefits: "", is_active: true, sort_order: String(order) });

function PremiumTab({ initial, plans }: { initial: SettingsMap["premium"]; plans: PremiumPlan[] }) {
  const router = useRouter();
  const [s, setS] = React.useState(initial);
  const [benefits, setBenefits] = React.useState(initial.benefits.join("\n"));
  const { saving, save } = useSave("premium", "Premium settings saved");
  const [draft, setDraft] = React.useState<PlanDraft | null>(null);
  const [del, setDel] = React.useState<PremiumPlan | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function savePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    const res = await savePlanAction({
      id: draft.id,
      name: draft.name,
      price: toNum(draft.price),
      duration_days: toNum(draft.duration_days),
      description: draft.description.trim() || null,
      benefits: draft.benefits.split("\n").map((b) => b.trim()).filter(Boolean),
      is_active: draft.is_active,
      sort_order: toNum(draft.sort_order),
    });
    setBusy(false);
    if (res.ok) {
      toast.success(draft.id ? "Plan updated" : "Plan created");
      setDraft(null);
      router.refresh();
    } else toast.error(res.error);
  }

  async function removePlan() {
    if (!del) return;
    setBusy(true);
    const res = await deletePlanAction(del.id);
    setBusy(false);
    if (res.ok) {
      toast.success("Plan deleted");
      setDel(null);
      router.refresh();
    } else toast.error(res.error);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Plans</CardTitle>
            <CardDescription>What students can buy. Inactive plans are hidden from the premium page.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setDraft(blankPlan((plans.at(-1)?.sort_order ?? 0) + 1))}><Plus aria-hidden /> Add plan</Button>
        </CardHeader>
        <CardContent>
          {plans.length ? (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {plans.map((p) => (
                <li key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {p.name}
                      <Badge variant={p.is_active ? "success" : "neutral"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {initial.currency} {p.price} · {p.duration_days} days · order {p.sort_order}
                    </p>
                    {p.description && <p className="mt-1 text-sm">{p.description}</p>}
                    {p.benefits?.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{p.benefits.length} benefits</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setDraft({ id: p.id, name: p.name, price: String(p.price), duration_days: String(p.duration_days), description: p.description ?? "", benefits: (p.benefits ?? []).join("\n"), is_active: p.is_active, sort_order: String(p.sort_order) })}>
                      <Pencil aria-hidden /> Edit
                    </Button>
                    <Button size="sm" variant="outline" aria-label={`Delete ${p.name}`} onClick={() => setDel(p)}><Trash2 aria-hidden /></Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No plans yet" description="Add a plan so students can subscribe." />
          )}
        </CardContent>
      </Card>

      <Section
        title="Premium page"
        description="General premium behaviour."
        footer={
          <Button
            loading={saving}
            onClick={() => save({ ...s, benefits: benefits.split("\n").map((b) => b.trim()).filter(Boolean) })}
          >
            Save premium settings
          </Button>
        }
      >
        <Toggle id="p-en" label="Premium purchases enabled" checked={s.enabled} onChange={(v) => setS({ ...s, enabled: v })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Currency" htmlFor="p-cur"><Input id="p-cur" value={s.currency} onChange={(e) => setS({ ...s, currency: e.target.value })} /></Field>
          <Field label="Free preview pages" htmlFor="p-prev" hint="Pages non-premium users can read of premium PDFs."><Input id="p-prev" type="number" min={0} value={s.free_preview_pages} onChange={(e) => setS({ ...s, free_preview_pages: toNum(e.target.value) })} /></Field>
        </div>
        <Field label="Benefits shown on the premium page" htmlFor="p-ben" hint="One benefit per line."><Textarea id="p-ben" rows={5} value={benefits} onChange={(e) => setBenefits(e.target.value)} /></Field>
      </Section>

      {draft && (
        <Dialog open onOpenChange={(o) => !o && setDraft(null)} title={draft.id ? "Edit plan" : "Add plan"} className="max-h-[90dvh] max-w-lg overflow-y-auto">
          <form onSubmit={savePlan} className="space-y-4">
            <DialogHeader><DialogTitle>{draft.id ? "Edit plan" : "Add plan"}</DialogTitle></DialogHeader>
            <Field label="Name" htmlFor="pl-name"><Input id="pl-name" value={draft.name} required maxLength={80} data-autofocus onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label={`Price (${initial.currency})`} htmlFor="pl-price"><Input id="pl-price" type="number" min={0} step="any" required value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></Field>
              <Field label="Days" htmlFor="pl-days"><Input id="pl-days" type="number" min={1} required value={draft.duration_days} onChange={(e) => setDraft({ ...draft, duration_days: e.target.value })} /></Field>
              <Field label="Order" htmlFor="pl-ord"><Input id="pl-ord" type="number" min={0} value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })} /></Field>
            </div>
            <Field label="Description" htmlFor="pl-desc"><Input id="pl-desc" value={draft.description} maxLength={500} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
            <Field label="Benefits" htmlFor="pl-ben" hint="One per line."><Textarea id="pl-ben" rows={4} value={draft.benefits} onChange={(e) => setDraft({ ...draft, benefits: e.target.value })} /></Field>
            <Toggle id="pl-act" label="Plan is active" checked={draft.is_active} onChange={(v) => setDraft({ ...draft, is_active: v })} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
              <Button type="submit" loading={busy}>{draft.id ? "Save plan" : "Create plan"}</Button>
            </DialogFooter>
          </form>
        </Dialog>
      )}
      {del && (
        <Dialog open onOpenChange={(o) => !o && setDel(null)} title="Delete plan">
          <DialogHeader>
            <DialogTitle>Delete {del.name}?</DialogTitle>
            <DialogDescription>Plans that already have payments cannot be deleted. Mark them inactive instead.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDel(null)} data-autofocus>Keep plan</Button>
            <Button variant="danger" loading={busy} onClick={removePlan}>Delete plan</Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------
function PaymentTab({ initial, qrUrls }: { initial: SettingsMap["payment"]; qrUrls: Record<string, string | null> }) {
  const [s, setS] = React.useState(initial);
  const [urls, setUrls] = React.useState(qrUrls);
  const [uploading, setUploading] = React.useState<string | null>(null);
  const { saving, save } = useSave("payment", "Payment settings saved");

  const update = (i: number, patch: Partial<PaymentMethodSetting>) => setS({ ...s, methods: s.methods.map((m, j) => (j === i ? { ...m, ...patch } : m)) });

  async function upload(i: number, file: File | undefined) {
    if (!file) return;
    const m = s.methods[i];
    if (file.size > 900_000) return void toast.error("QR images must be under 900 KB.");
    setUploading(m.id);
    const fd = new FormData();
    fd.set("method_id", m.id);
    fd.set("file", file);
    const res = await uploadQrAction(fd);
    setUploading(null);
    if (res.ok && res.data) {
      update(i, { qr_path: res.data.path });
      setUrls({ ...urls, [m.id]: res.data.url });
      toast.success("QR uploaded. Save payment settings to publish it.");
    } else if (!res.ok) toast.error(res.error);
  }

  return (
    <Section
      title="Payment"
      description="Instructions and accounts students see when paying for premium."
      footer={<Button loading={saving} onClick={() => save(s)}>Save payment settings</Button>}
    >
      <Field label="Payment instructions" htmlFor="pay-ins"><Textarea id="pay-ins" rows={4} value={s.instructions} onChange={(e) => setS({ ...s, instructions: e.target.value })} /></Field>
      <Field label="Currency" htmlFor="pay-cur" className="max-w-40"><Input id="pay-cur" value={s.currency} onChange={(e) => setS({ ...s, currency: e.target.value })} /></Field>

      <div className="space-y-4">
        {s.methods.map((m, i) => {
          const preview = m.qr_path ? urls[m.id] : null;
          return (
            <fieldset key={i} className="rounded-lg border border-border p-4">
              <legend className="px-1 text-sm font-semibold">{m.label || "New method"}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Label" htmlFor={`pm-l-${i}`}><Input id={`pm-l-${i}`} value={m.label} onChange={(e) => update(i, { label: e.target.value })} /></Field>
                <Field label="Id" htmlFor={`pm-i-${i}`} hint="Lowercase letters, numbers, - or _."><Input id={`pm-i-${i}`} value={m.id} onChange={(e) => update(i, { id: e.target.value.toLowerCase() })} /></Field>
                <Field label="Account name" htmlFor={`pm-n-${i}`}><Input id={`pm-n-${i}`} value={m.account_name} onChange={(e) => update(i, { account_name: e.target.value })} /></Field>
                <Field label="Account number or ID" htmlFor={`pm-a-${i}`}><Input id={`pm-a-${i}`} value={m.account_id} onChange={(e) => update(i, { account_id: e.target.value })} /></Field>
                {m.bank_name !== undefined && (
                  <Field label="Bank name" htmlFor={`pm-b-${i}`}><Input id={`pm-b-${i}`} value={m.bank_name} onChange={(e) => update(i, { bank_name: e.target.value })} /></Field>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt={`${m.label} QR code`} className="size-24 rounded-md border border-border bg-white object-contain" />
                ) : (
                  <span className="flex size-24 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">{m.qr_path ? "Saved" : "No QR"}</span>
                )}
                <div className="space-y-2">
                  <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-input bg-card px-3 text-xs font-semibold hover:bg-muted">
                    <ImageUp aria-hidden className="size-4" /> {uploading === m.id ? "Uploading…" : m.qr_path ? "Replace QR" : "Upload QR"}
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploading === m.id} onChange={(e) => { void upload(i, e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                  {m.qr_path && <button type="button" onClick={() => update(i, { qr_path: null })} className="block text-xs text-danger hover:underline">Remove QR</button>}
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <label htmlFor={`pm-e-${i}`} className="text-sm">Enabled</label>
                  <Switch id={`pm-e-${i}`} checked={m.enabled} onCheckedChange={(v) => update(i, { enabled: v })} aria-label={`${m.label} enabled`} />
                  <Button size="sm" variant="ghost" aria-label={`Remove ${m.label}`} onClick={() => setS({ ...s, methods: s.methods.filter((_, j) => j !== i) })}><Trash2 aria-hidden /></Button>
                </div>
              </div>
            </fieldset>
          );
        })}
        <Button variant="outline" onClick={() => setS({ ...s, methods: [...s.methods, { id: `method-${s.methods.length + 1}`, label: "", enabled: true, account_name: "", account_id: "", qr_path: null }] })}>
          <Plus aria-hidden /> Add payment method
        </Button>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Referral (read-only pointer)
// ---------------------------------------------------------------------------
function ReferralTab({ initial }: { initial: SettingsMap["referral"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Referral program</CardTitle>
        <CardDescription>Referral rewards are managed on the Referrals page.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md bg-muted/60 p-3"><dt className="text-xs text-muted-foreground">Status</dt><dd className="font-semibold">{initial.enabled ? "Enabled" : "Disabled"}</dd></div>
          <div className="rounded-md bg-muted/60 p-3"><dt className="text-xs text-muted-foreground">Reward</dt><dd className="font-semibold">{initial.reward_days} premium days</dd></div>
          <div className="rounded-md bg-muted/60 p-3"><dt className="text-xs text-muted-foreground">Cash reward</dt><dd className="font-semibold">{initial.reward_amount}</dd></div>
        </dl>
        <Link href="/admin/referrals" className="inline-flex h-10 items-center rounded-md bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary-hover">Open Referrals</Link>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------
function ResourcesTab({ initial }: { initial: SettingsMap["resources"] }) {
  const [s, setS] = React.useState(initial);
  const { saving, save } = useSave("resources", "Resource settings saved");
  return (
    <Section
      title="Resources"
      description="Defaults and limits for uploads and viewing."
      footer={<Button loading={saving} onClick={() => save(s)}>Save resource settings</Button>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Default access for new uploads" htmlFor="r-acc">
          <Select id="r-acc" value={s.default_access_type} onChange={(e) => setS({ ...s, default_access_type: e.target.value as SettingsMap["resources"]["default_access_type"] })}>
            {ACCESS_TYPES.map((a) => <option key={a} value={a}>{a === "FREE" ? "Free" : "Premium"}</option>)}
          </Select>
        </Field>
        <Field label="Maximum file size (MB)" htmlFor="r-max" hint="1 to 200."><Input id="r-max" type="number" min={1} max={200} value={s.max_upload_mb} onChange={(e) => setS({ ...s, max_upload_mb: toNum(e.target.value) })} /></Field>
        <Field label="View dedupe window (minutes)" htmlFor="r-dd"><Input id="r-dd" type="number" min={1} value={s.view_dedupe_minutes} onChange={(e) => setS({ ...s, view_dedupe_minutes: toNum(e.target.value) })} /></Field>
        <Field label="PDF link lifetime (seconds)" htmlFor="r-ttl" hint="30 to 3600."><Input id="r-ttl" type="number" min={30} max={3600} value={s.pdf_token_ttl_seconds} onChange={(e) => setS({ ...s, pdf_token_ttl_seconds: toNum(e.target.value) })} /></Field>
      </div>
      <div className="space-y-3">
        <Toggle id="r-comp" label="Compress PDFs on upload" checked={s.compress_pdfs} onChange={(v) => setS({ ...s, compress_pdfs: v })} />
        <Toggle id="r-login" label="Require login for free resources" checked={s.require_login_for_free} onChange={(v) => setS({ ...s, require_login_for_free: v })} />
        <Toggle id="r-su" label="Allow student uploads" checked={s.allow_student_uploads} onChange={(v) => setS({ ...s, allow_student_uploads: v })} />
        <Toggle id="r-rq" label="Allow resource requests" checked={s.allow_requests} onChange={(v) => setS({ ...s, allow_requests: v })} />
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------
function AuditTab({ rows }: { rows: AuditRow[] }) {
  if (!rows.length) return <EmptyState title="No audit entries yet" description="Admin actions are recorded here." />;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit log</CardTitle>
        <CardDescription>The latest {rows.length} admin actions.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {rows.map((r) => (
            <li key={r.id} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">{r.action}</code>
                <span className="text-muted-foreground">{r.admin ?? "System"}</span>
                <span className="ml-auto text-xs text-muted-foreground">{formatDate(r.created_at, { withTime: true })}</span>
              </div>
              {(r.target_type || r.target_id) && (
                <p className="mt-1 break-all text-xs text-muted-foreground">{[r.target_type, r.target_id].filter(Boolean).join(" · ")}</p>
              )}
              {Object.keys(r.metadata).length > 0 && (
                <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{JSON.stringify(r.metadata)}</p>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
export function SettingsTabs({
  settings,
  plans,
  qrUrls,
  audit,
}: {
  settings: SettingsMap;
  plans: PremiumPlan[];
  qrUrls: Record<string, string | null>;
  audit: AuditRow[];
}) {
  return (
    <Tabs defaultValue="website">
      <TabsList aria-label="Settings sections">
        <TabsTrigger value="website">Website</TabsTrigger>
        <TabsTrigger value="premium">Premium</TabsTrigger>
        <TabsTrigger value="payment">Payment</TabsTrigger>
        <TabsTrigger value="referral">Referral</TabsTrigger>
        <TabsTrigger value="resources">Resources</TabsTrigger>
        <TabsTrigger value="scgpa">SCGPA</TabsTrigger>
        <TabsTrigger value="audit">Audit log</TabsTrigger>
      </TabsList>
      <TabsContent value="website"><WebsiteTab initial={settings.site} /></TabsContent>
      <TabsContent value="premium"><PremiumTab initial={settings.premium} plans={plans} /></TabsContent>
      <TabsContent value="payment"><PaymentTab initial={settings.payment} qrUrls={qrUrls} /></TabsContent>
      <TabsContent value="referral"><ReferralTab initial={settings.referral} /></TabsContent>
      <TabsContent value="resources"><ResourcesTab initial={settings.resources} /></TabsContent>
      <TabsContent value="scgpa"><ScgpaTab initial={settings.scgpa} /></TabsContent>
      <TabsContent value="audit"><AuditTab rows={audit} /></TabsContent>
    </Tabs>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Check, Copy, ImageUp, QrCode, ShieldCheck, Trash2 } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { submitPayment } from "@/lib/actions/payments";
import { createBrowserClient } from "@/lib/supabase/client";
import { cn, formatBytes } from "@/lib/utils";
import {
  PAYMENT_SCREENSHOT_BUCKET,
  SCREENSHOT_EXT_BY_MIME,
  SCREENSHOT_MAX_BYTES,
  SCREENSHOT_MIME_TYPES,
  formatMoney,
  type PaymentMethodView,
} from "./constants";
import { PlanCardBody, bestValueIndex, type PlanView } from "./plan-card";

type FieldErrors = Partial<Record<"program" | "plan" | "method" | "reference" | "screenshot", string>>;

/** An active program the buyer can unlock (premium is per program). */
export interface ProgramOption {
  id: string;
  name: string;
  shortName: string | null;
}

function validateImage(file: File): string | null {
  if (!(SCREENSHOT_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "Please upload a PNG, JPG or WebP image.";
  }
  if (file.size === 0) return "That file looks empty. Please choose another image.";
  if (file.size > SCREENSHOT_MAX_BYTES) {
    return `The image is ${formatBytes(file.size)}. Please upload one smaller than ${formatBytes(SCREENSHOT_MAX_BYTES)}.`;
  }
  return null;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={`Copy ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Couldn't copy. Please copy it manually.");
        }
      }}
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      <span className="sr-only sm:not-sr-only">{copied ? "Copied" : "Copy"}</span>
    </Button>
  );
}

export function PaymentForm({
  userId,
  plans,
  programs,
  initialProgramId,
  methods,
  currency,
  instructions,
  initialPlanId,
}: {
  userId: string;
  plans: PlanView[];
  programs: ProgramOption[];
  initialProgramId?: string | null;
  methods: PaymentMethodView[];
  currency: string;
  instructions: string;
  initialPlanId?: string | null;
}) {
  const router = useRouter();
  const formId = React.useId();
  const [planId, setPlanId] = React.useState<string>(
    initialPlanId && plans.some((p) => p.id === initialPlanId) ? initialPlanId : (plans[0]?.id ?? ""),
  );
  const [programId, setProgramId] = React.useState<string>(
    initialProgramId && programs.some((p) => p.id === initialProgramId) ? initialProgramId : programs.length === 1 ? programs[0].id : "",
  );
  const [methodId, setMethodId] = React.useState<string>(methods[0]?.id ?? "");
  const [reference, setReference] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [stage, setStage] = React.useState<"idle" | "uploading" | "saving">("idle");
  const previewRef = React.useRef<string | null>(null);
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const galleryRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  const program = programs.find((p) => p.id === programId) ?? null;
  const plan = plans.find((p) => p.id === planId) ?? null;
  const method = methods.find((m) => m.id === methodId) ?? null;
  const best = bestValueIndex(plans);
  const busy = stage !== "idle";

  function setPreview(next: File | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = next ? URL.createObjectURL(next) : null;
    previewRef.current = url;
    setPreviewUrl(url);
    setFile(next);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    e.target.value = ""; // allow re-selecting the same file
    if (!picked) return;
    const problem = validateImage(picked);
    if (problem) {
      setErrors((prev) => ({ ...prev, screenshot: problem }));
      toast.error(problem);
      return;
    }
    setErrors((prev) => ({ ...prev, screenshot: undefined }));
    setPreview(picked);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    const next: FieldErrors = {};
    if (!program) next.program = "Please choose the program you want premium for.";
    if (!plan) next.plan = "Please choose a plan.";
    if (!method) next.method = "Please choose a payment method.";
    const ref = reference.trim();
    if (ref.length < 4) next.reference = "Enter the transaction ID / reference shown in your payment app.";
    else if (ref.length > 100) next.reference = "The transaction reference is too long.";
    else if (!/^[\w\-./#: ]+$/.test(ref)) next.reference = "Use only letters, numbers and - . / # : characters.";
    if (!file) next.screenshot = "Please upload a screenshot of your payment.";
    else {
      const problem = validateImage(file);
      if (problem) next.screenshot = problem;
    }
    setErrors(next);
    if (Object.keys(next).length > 0 || !file || !plan || !method || !program) {
      const firstKey = (["program", "plan", "method", "reference", "screenshot"] as const).find((k) => next[k]);
      if (firstKey) document.getElementById(`${formId}-${firstKey}`)?.focus();
      return;
    }

    const ext = SCREENSHOT_EXT_BY_MIME[file.type as keyof typeof SCREENSHOT_EXT_BY_MIME];
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;

    try {
      setStage("uploading");
      const supabase = createBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from(PAYMENT_SCREENSHOT_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false, cacheControl: "3600" });
      if (uploadError) {
        console.error("[premium] screenshot upload failed", uploadError);
        toast.error("We couldn't upload your screenshot. Check your connection and try again.");
        setStage("idle");
        return;
      }

      setStage("saving");
      const result = await submitPayment({
        planId: plan.id,
        programId: program.id,
        paymentMethod: method.id,
        transactionReference: ref,
        screenshotPath: path,
      });
      if (!result.ok) {
        toast.error(result.error);
        setStage("idle");
        return;
      }

      toast.success("Payment submitted! We'll verify it soon, usually within 24 hours.");
      setReference("");
      setPreview(null);
      setStage("idle");
      router.refresh();
    } catch (err) {
      console.error("[premium] submit failed", err);
      toast.error("Something went wrong. Please try again.");
      setStage("idle");
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6" aria-describedby={`${formId}-intro`}>
      <p id={`${formId}-intro`} className="sr-only">
        Choose your program and a plan, pay using the QR code or account details, then submit your transaction reference and a screenshot.
      </p>

      {/* Step 1: program (premium is per program) */}
      <fieldset className="space-y-3">
        <legend className="flex items-center gap-2 text-base font-bold tracking-[-0.015em]">
          <StepDot n={1} /> Choose your program
        </legend>
        <div id={`${formId}-program`} tabIndex={-1} role="radiogroup" aria-label="Program" className="flex flex-wrap gap-2">
          {programs.map((p) => {
            const selected = p.id === programId;
            return (
              <label
                key={p.id}
                className={cn(
                  "cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] focus-within:outline-2 focus-within:outline-ring",
                  selected ? "border-primary bg-primary-soft text-primary" : "border-border bg-card hover:bg-muted",
                )}
              >
                <input
                  type="radio"
                  name="program"
                  value={p.id}
                  checked={selected}
                  onChange={() => {
                    setProgramId(p.id);
                    setErrors((prev) => ({ ...prev, program: undefined }));
                  }}
                  className="sr-only"
                />
                {p.shortName ?? p.name}
              </label>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Premium unlocks one program only{program ? `: ${program.name}` : ""}. Subjects shared with another program are open to both. Need another program? Buy it separately.
        </p>
        {errors.program && <FieldError>{errors.program}</FieldError>}
      </fieldset>

      {/* Step 2: plan */}
      <fieldset className="space-y-3">
        <legend className="flex items-center gap-2 text-base font-bold tracking-[-0.015em]">
          <StepDot n={2} /> Choose a plan
        </legend>
        <div
          id={`${formId}-plan`}
          tabIndex={-1}
          role="radiogroup"
          aria-invalid={errors.plan ? true : undefined}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {plans.map((p, i) => {
            const selected = p.id === planId;
            return (
              <label
                key={p.id}
                className={cn(
                  "card-lift relative cursor-pointer rounded-2xl border bg-card p-5 focus-within:outline-2 focus-within:outline-ring",
                  selected ? "border-primary shadow-glow" : "border-border",
                )}
              >
                <input
                  type="radio"
                  name="plan"
                  value={p.id}
                  checked={selected}
                  onChange={() => {
                    setPlanId(p.id);
                    setErrors((prev) => ({ ...prev, plan: undefined }));
                  }}
                  className="sr-only"
                />
                <PlanCardBody plan={p} currency={currency} selected={selected} bestValue={i === best} />
                {selected && (
                  <span className="absolute right-3 bottom-3 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check aria-hidden className="size-4" />
                  </span>
                )}
              </label>
            );
          })}
        </div>
        {errors.plan && <FieldError>{errors.plan}</FieldError>}
      </fieldset>

      {/* Step 3: pay */}
      <fieldset className="space-y-3">
        <legend className="flex items-center gap-2 text-base font-bold tracking-[-0.015em]">
          <StepDot n={3} /> Pay {plan ? formatMoney(plan.price, currency) : ""}
        </legend>

        {methods.length > 1 && (
          <div id={`${formId}-method`} tabIndex={-1} role="radiogroup" aria-label="Payment method" className="flex flex-wrap gap-2">
            {methods.map((m) => {
              const selected = m.id === methodId;
              return (
                <label
                  key={m.id}
                  className={cn(
                    "cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] focus-within:outline-2 focus-within:outline-ring",
                    selected ? "border-primary bg-primary-soft text-primary" : "border-border bg-card hover:bg-muted",
                  )}
                >
                  <input
                    type="radio"
                    name="method"
                    value={m.id}
                    checked={selected}
                    onChange={() => {
                      setMethodId(m.id);
                      setErrors((prev) => ({ ...prev, method: undefined }));
                    }}
                    className="sr-only"
                  />
                  {m.label}
                </label>
              );
            })}
          </div>
        )}
        {errors.method && <FieldError>{errors.method}</FieldError>}

        {method && (
          <Card>
            <CardContent className="grid gap-5 p-5 sm:grid-cols-[auto_1fr]">
              <div className="mx-auto w-full max-w-[240px] sm:mx-0 sm:w-56">
                {method.qrUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- signed storage URL, not optimisable
                  <img
                    src={method.qrUrl}
                    alt={`${method.label} QR code for payment`}
                    className="aspect-square w-full rounded-lg border border-border bg-white object-contain p-2"
                  />
                ) : (
                  <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-center text-xs text-muted-foreground">
                    <QrCode aria-hidden className="size-8" />
                    QR code not available. Use the account details instead.
                  </div>
                )}
              </div>
              <div className="min-w-0 space-y-3 text-sm">
                <p className="font-semibold">{method.label}</p>
                <dl className="space-y-2">
                  {method.bank_name && <DetailRow label="Bank" value={method.bank_name} />}
                  {method.account_name && <DetailRow label="Account name" value={method.account_name} />}
                  {method.account_id && <DetailRow label="Account / ID" value={method.account_id} copy />}
                  {plan && <DetailRow label="Amount" value={formatMoney(plan.price, currency)} />}
                </dl>
                {!method.account_id && !method.account_name && !method.qrUrl && (
                  <p className="rounded-md bg-warning-soft px-3 py-2 text-xs">
                    Payment details for this method haven&apos;t been set up yet. Please choose another method or contact us.
                  </p>
                )}
                {instructions && <p className="whitespace-pre-line text-muted-foreground">{instructions}</p>}
              </div>
            </CardContent>
          </Card>
        )}
      </fieldset>

      {/* Step 4: proof */}
      <fieldset className="space-y-4">
        <legend className="flex items-center gap-2 text-base font-bold tracking-[-0.015em]">
          <StepDot n={4} /> Submit proof of payment
        </legend>

        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-reference`}>Transaction ID / reference</Label>
          <Input
            id={`${formId}-reference`}
            value={reference}
            onChange={(e) => {
              setReference(e.target.value);
              if (errors.reference) setErrors((prev) => ({ ...prev, reference: undefined }));
            }}
            placeholder="e.g. 0A1B2C3D4E"
            autoComplete="off"
            inputMode="text"
            maxLength={100}
            aria-invalid={errors.reference ? true : undefined}
            aria-describedby={`${formId}-reference-hint${errors.reference ? ` ${formId}-reference-error` : ""}`}
            disabled={busy}
            required
          />
          <p id={`${formId}-reference-hint`} className="text-xs text-muted-foreground">
            Find it in your payment app&apos;s transaction details.
          </p>
          {errors.reference && <FieldError id={`${formId}-reference-error`}>{errors.reference}</FieldError>}
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium" id={`${formId}-screenshot-label`}>
            Payment screenshot
          </span>
          <input
            ref={cameraRef}
            type="file"
            accept={SCREENSHOT_MIME_TYPES.join(",")}
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={onFileChange}
          />
          <input
            ref={galleryRef}
            type="file"
            accept={SCREENSHOT_MIME_TYPES.join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={onFileChange}
          />

          {previewUrl && file ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
              <img src={previewUrl} alt="Selected payment screenshot preview" className="size-20 shrink-0 rounded-md object-cover" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-medium">{file.name || "Screenshot"}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <Button variant="ghost" size="icon" aria-label="Remove screenshot" onClick={() => setPreview(null)} disabled={busy}>
                <Trash2 aria-hidden />
              </Button>
            </div>
          ) : (
            <div
              id={`${formId}-screenshot`}
              tabIndex={-1}
              aria-labelledby={`${formId}-screenshot-label`}
              className={cn(
                "grid grid-cols-2 gap-2 rounded-xl border border-dashed p-3",
                errors.screenshot ? "border-danger" : "border-border",
              )}
            >
              <Button variant="outline" className="h-auto flex-col gap-1 py-4" onClick={() => cameraRef.current?.click()} disabled={busy}>
                <Camera aria-hidden />
                <span>Take photo</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-1 py-4" onClick={() => galleryRef.current?.click()} disabled={busy}>
                <ImageUp aria-hidden />
                <span>Choose image</span>
              </Button>
              <p className="col-span-2 text-center text-xs text-muted-foreground">
                PNG, JPG or WebP, up to {formatBytes(SCREENSHOT_MAX_BYTES)}. Make sure the amount and transaction ID are visible.
              </p>
            </div>
          )}
          {errors.screenshot && <FieldError>{errors.screenshot}</FieldError>}
        </div>
      </fieldset>

      <div className="space-y-3">
        <Button type="submit" size="lg" className="w-full sm:w-auto" loading={busy} disabled={!program || !plan || !method}>
          {stage === "uploading" ? "Uploading screenshot…" : stage === "saving" ? "Submitting…" : "Submit payment for review"}
        </Button>
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
          Your screenshot is stored privately and only seen by our verification team.
        </p>
      </div>
    </form>
  );
}

function StepDot({ n }: { n: number }) {
  return (
    <span aria-hidden className="flex size-6 items-center justify-center rounded-full bg-gradient-brand text-xs font-bold text-white shadow-[0_4px_12px_-4px_var(--glow-strong)]">
      {n}
    </span>
  );
}

function FieldError({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <p id={id} role="alert" className="text-sm text-danger">
      {children}
    </p>
  );
}

function DetailRow({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2">
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="break-all font-medium">{value}</dd>
      </div>
      {copy && <CopyButton value={value} label={label} />}
    </div>
  );
}

export function PaymentFormUnavailable({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

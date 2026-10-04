"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Switch, Textarea } from "@/components/ui";
import { updateReferralSettings } from "@/lib/actions/referrals";
import type { ReferralSettings } from "@/lib/types";

export function ReferralSettingsForm({ initial, currency }: { initial: ReferralSettings; currency: string }) {
  const router = useRouter();
  const id = React.useId();
  const [enabled, setEnabled] = React.useState(initial.enabled);
  const [rewardDays, setRewardDays] = React.useState(String(initial.reward_days));
  const [rewardAmount, setRewardAmount] = React.useState(String(initial.reward_amount));
  const [description, setDescription] = React.useState(initial.description);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const days = Number(rewardDays);
    const amount = Number(rewardAmount);
    if (rewardDays.trim() === "" || !Number.isInteger(days) || days < 0 || days > 365) {
      return setError("Reward days must be a whole number between 0 and 365.");
    }
    if (rewardAmount.trim() === "" || !Number.isFinite(amount) || amount < 0 || amount > 100000) {
      return setError("Reward amount must be between 0 and 100000.");
    }
    setError(null);
    startTransition(async () => {
      const res = await updateReferralSettings({ enabled, reward_days: days, reward_amount: amount, description });
      if (!res.ok) {
        setError(res.error);
        toast.error(res.error);
        return;
      }
      toast.success("Referral settings saved.");
      router.refresh();
    });
  }

  const days = Number(rewardDays);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reward settings</CardTitle>
        <CardDescription>
          Rewards are applied when a referred user&apos;s <strong>first</strong> premium payment is approved.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
            <div>
              <p id={`${id}-enabled-label`} className="text-sm font-medium">
                Referral program active
              </p>
              <p className="text-xs text-muted-foreground">When off, approvals don&apos;t qualify or reward referrals.</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} aria-labelledby={`${id}-enabled-label`} disabled={pending} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-days`}>Reward days (premium for referrer)</Label>
              <Input
                id={`${id}-days`}
                type="number"
                inputMode="numeric"
                min={0}
                max={365}
                step={1}
                value={rewardDays}
                onChange={(e) => setRewardDays(e.target.value)}
                disabled={pending}
              />
              <p className="text-xs text-muted-foreground">
                {Number.isFinite(days) && days > 0
                  ? `Referrer automatically gets ${days} premium day${days === 1 ? "" : "s"}; referral becomes Rewarded.`
                  : "0 = no automatic premium; referral becomes Qualified for a manual payout."}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-amount`}>Reward amount ({currency})</Label>
              <Input
                id={`${id}-amount`}
                type="number"
                inputMode="decimal"
                min={0}
                max={100000}
                step="0.01"
                value={rewardAmount}
                onChange={(e) => setRewardAmount(e.target.value)}
                disabled={pending}
              />
              <p className="text-xs text-muted-foreground">Recorded on each referral (e.g. for cash/manual payouts).</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-desc`}>Conditions / description shown to users</Label>
            <Textarea
              id={`${id}-desc`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              disabled={pending}
            />
            <p className="text-right text-xs text-muted-foreground">{description.length}/500</p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" loading={pending}>
            Save settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trophy } from "lucide-react";
import { Button, Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui";
import { markReferralRewarded } from "@/lib/actions/referrals";

export function MarkRewardedButton({
  referralId,
  referrerLabel,
  rewardLabel,
}: {
  referralId: string;
  referrerLabel: string;
  rewardLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function confirm() {
    startTransition(async () => {
      const res = await markReferralRewarded(referralId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Referral marked as rewarded.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} aria-label={`Mark referral by ${referrerLabel} as rewarded`}>
        <Trophy aria-hidden /> Mark rewarded
      </Button>
      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)} title="Mark referral as rewarded">
        <DialogHeader>
          <DialogTitle>Mark as rewarded?</DialogTitle>
          <DialogDescription>
            Confirm you have paid {referrerLabel} their reward ({rewardLabel}). This only updates the status; it does not grant
            premium days. This action is audit-logged.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={confirm} loading={pending}>
            Mark rewarded
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

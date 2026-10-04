"use client";

import { Trash2 } from "lucide-react";
import { deleteOwnUpload } from "@/lib/actions/uploads";
import { cancelOwnRequest } from "@/lib/actions/requests";
import { ConfirmActionButton } from "./ConfirmActionButton";

export function WithdrawUploadButton({ id }: { id: string }) {
  return (
    <ConfirmActionButton
      title="Withdraw this upload?"
      description="The file will be deleted and will not be reviewed."
      confirmLabel="Withdraw"
      variant="danger"
      action={() => deleteOwnUpload(id)}
    >
      <Trash2 aria-hidden /> Withdraw
    </ConfirmActionButton>
  );
}

export function CancelRequestButton({ id }: { id: string }) {
  return (
    <ConfirmActionButton
      title="Cancel this request?"
      description="Your request will be removed."
      confirmLabel="Remove request"
      variant="danger"
      action={() => cancelOwnRequest(id)}
    >
      <Trash2 aria-hidden /> Cancel
    </ConfirmActionButton>
  );
}

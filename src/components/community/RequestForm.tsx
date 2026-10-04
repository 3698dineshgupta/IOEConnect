"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { createResourceRequest } from "@/lib/actions/requests";
import { RESOURCE_TYPES, RESOURCE_TYPE_LABELS, type ResourceType } from "@/lib/types";
import type { SubjectOption } from "./common";
import { SubjectPicker } from "./SubjectPicker";
import { FormMessage } from "./FormMessage";

export function RequestForm({ options, initialSubjectId }: { options: SubjectOption[]; initialSubjectId?: string }) {
  const router = useRouter();
  const [subjectId, setSubjectId] = React.useState(initialSubjectId ?? "");
  const [subjectText, setSubjectText] = React.useState("");
  const [type, setType] = React.useState<ResourceType>("PYQ");
  const [years, setYears] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!subjectId && subjectText.trim().length < 2) return setError("Choose a subject or type its name.");
    startTransition(async () => {
      const res = await createResourceRequest({
        subjectId,
        subjectText: subjectId ? "" : subjectText,
        resourceType: type,
        years,
        message,
      });
      if (!res.ok) return setError(res.error);
      setSuccess(true);
      setSubjectId("");
      setSubjectText("");
      setYears("");
      setMessage("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <SubjectPicker
        options={options}
        value={subjectId}
        onChange={setSubjectId}
        idPrefix="rq"
        allowOther
        otherLabel="Not listed (type below)"
        disabled={pending}
      />
      {!subjectId && (
        <div className="space-y-1.5">
          <Label htmlFor="rq-text">Subject name</Label>
          <Input
            id="rq-text"
            value={subjectText}
            maxLength={200}
            onChange={(e) => setSubjectText(e.target.value)}
            placeholder="If it is not in the list, type it here"
            disabled={pending}
          />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="rq-type">What do you need?</Label>
          <Select id="rq-type" value={type} onChange={(e) => setType(e.target.value as ResourceType)} disabled={pending}>
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {RESOURCE_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rq-years">Years (optional)</Label>
          <Input
            id="rq-years"
            value={years}
            maxLength={100}
            onChange={(e) => setYears(e.target.value)}
            placeholder="e.g. 2078, 2079"
            disabled={pending}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rq-msg">Message (optional)</Label>
        <Textarea
          id="rq-msg"
          value={message}
          maxLength={1500}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what exactly you are looking for"
          disabled={pending}
        />
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {success && <FormMessage kind="success">Request sent. We will update its status here.</FormMessage>}
      <Button type="submit" loading={pending}>
        <Send aria-hidden /> Send request
      </Button>
    </form>
  );
}

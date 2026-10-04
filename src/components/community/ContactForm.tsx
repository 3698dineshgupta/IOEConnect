"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { submitContactMessage } from "@/lib/actions/contact";
import { FormMessage } from "./FormMessage";

export function ContactForm({
  defaultName = "",
  defaultEmail = "",
  defaultSubject = "",
}: {
  defaultName?: string;
  defaultEmail?: string;
  defaultSubject?: string;
}) {
  const [name, setName] = React.useState(defaultName);
  const [email, setEmail] = React.useState(defaultEmail);
  const [subject, setSubject] = React.useState(defaultSubject);
  const [message, setMessage] = React.useState("");
  const [website, setWebsite] = React.useState(""); // honeypot
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await submitContactMessage({ name, email, subject, message, website });
      if (!res.ok) return setError(res.error);
      setSent(true);
      setMessage("");
      setSubject("");
    });
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <FormMessage kind="success">Thanks for reaching out! We have received your message and will reply by email.</FormMessage>
        <Button variant="outline" onClick={() => setSent(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ct-name">Name</Label>
          <Input id="ct-name" value={name} maxLength={200} autoComplete="name" onChange={(e) => setName(e.target.value)} disabled={pending} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ct-email">Email</Label>
          <Input id="ct-email" type="email" value={email} maxLength={320} autoComplete="email" onChange={(e) => setEmail(e.target.value)} disabled={pending} required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ct-subject">Subject</Label>
        <Input id="ct-subject" value={subject} maxLength={300} onChange={(e) => setSubject(e.target.value)} disabled={pending} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ct-message">Message</Label>
        <Textarea id="ct-message" value={message} maxLength={5000} rows={6} onChange={(e) => setMessage(e.target.value)} disabled={pending} required />
      </div>
      {/* Honeypot: hidden from people and assistive tech, bots fill it in. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>
          Leave this field empty
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <Button type="submit" loading={pending} className="w-full sm:w-auto">
        <Send aria-hidden /> Send message
      </Button>
    </form>
  );
}

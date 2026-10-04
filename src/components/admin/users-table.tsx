"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Crown, Eye, MoreHorizontal, ShieldCheck } from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { USER_ROLES, type UserRole } from "@/lib/types";
import {
  changeRoleAction,
  getUserDetailAction,
  grantPremiumAction,
  revokePremiumAction,
  setPremiumExpiryAction,
  type UserDetail,
} from "@/app/admin/users/actions";

export interface AdminUserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  college: string | null;
  year: number | null;
  semester: number | null;
  referral_code: string;
  is_premium: boolean;
  premium_started_at: string | null;
  premium_expires_at: string | null;
  role: UserRole;
  created_at: string;
}

export interface ProgramChoice {
  id: string;
  label: string;
}

type Dlg = { kind: "detail" | "expiry" | "grant" | "revoke" | "role"; user: AdminUserRow } | null;

function premiumActive(u: AdminUserRow) {
  return u.is_premium && !!u.premium_expires_at && new Date(u.premium_expires_at).getTime() > Date.now();
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <Badge variant={role === "SUPER_ADMIN" ? "accent" : role === "ADMIN" ? "primary" : "neutral"}>
      {role !== "USER" && <ShieldCheck aria-hidden />}
      {role === "SUPER_ADMIN" ? "Super admin" : role === "ADMIN" ? "Admin" : "User"}
    </Badge>
  );
}

function PremiumBadge({ u }: { u: AdminUserRow }) {
  if (premiumActive(u)) return <Badge variant="success"><Crown aria-hidden /> Premium</Badge>;
  if (u.premium_expires_at) return <Badge variant="warning">Expired</Badge>;
  return <Badge variant="neutral">Free</Badge>;
}

export function UsersTable({ users, isSuper, currentUserId, programs }: { users: AdminUserRow[]; isSuper: boolean; currentUserId: string; programs: ProgramChoice[] }) {
  const [dlg, setDlg] = React.useState<Dlg>(null);
  const router = useRouter();
  const close = () => setDlg(null);
  const done = () => {
    setDlg(null);
    router.refresh();
  };

  const menu = (u: AdminUserRow) => (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Actions for ${u.full_name || u.email}`} className="inline-flex size-8 items-center justify-center rounded-md border border-input bg-card hover:bg-muted">
        <MoreHorizontal aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={() => setDlg({ kind: "detail", user: u })}><Eye aria-hidden /> View details</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setDlg({ kind: "grant", user: u })}>Grant premium</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setDlg({ kind: "expiry", user: u })}>Edit premium expiry</DropdownMenuItem>
        <DropdownMenuItem danger disabled={!u.is_premium} onSelect={() => setDlg({ kind: "revoke", user: u })}>Revoke premium</DropdownMenuItem>
        {isSuper && u.id !== currentUserId && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setDlg({ kind: "role", user: u })}>Change role</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Premium</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <p className="max-w-64 truncate font-semibold">{u.full_name || "Unnamed"}</p>
                  <p className="max-w-64 truncate text-xs text-muted-foreground">{u.email}</p>
                </TableCell>
                <TableCell><RoleBadge role={u.role} /></TableCell>
                <TableCell><PremiumBadge u={u} /></TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(u.premium_expires_at)}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                <TableCell className="text-right">{menu(u)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {users.map((u) => (
          <li key={u.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold">{u.full_name || "Unnamed"}</p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
              </div>
              {menu(u)}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <RoleBadge role={u.role} />
              <PremiumBadge u={u} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Joined {formatDate(u.created_at)}
              {u.premium_expires_at ? ` · Premium until ${formatDate(u.premium_expires_at)}` : ""}
            </p>
          </li>
        ))}
      </ul>

      {dlg?.kind === "detail" && <DetailDialog user={dlg.user} onClose={close} />}
      {dlg?.kind === "grant" && <GrantDialog user={dlg.user} programs={programs} onClose={close} onDone={done} />}
      {dlg?.kind === "expiry" && <ExpiryDialog user={dlg.user} programs={programs} onClose={close} onDone={done} />}
      {dlg?.kind === "revoke" && <RevokeDialog user={dlg.user} programs={programs} onClose={close} onDone={done} />}
      {dlg?.kind === "role" && <RoleDialog user={dlg.user} onClose={close} onDone={done} />}
    </>
  );
}

const name = (u: AdminUserRow) => u.full_name || u.email || "this user";

function useRun(onDone: () => void, success: string) {
  const [busy, setBusy] = React.useState(false);
  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (r.ok) {
      toast.success(success);
      onDone();
    } else toast.error(r.error ?? "Something went wrong.");
  };
  return { busy, run };
}

function ProgramSelect({ id, programs, value, onChange, all }: { id: string; programs: ProgramChoice[]; value: string; onChange: (v: string) => void; all?: boolean }) {
  return (
    <>
      <Label htmlFor={id}>Program</Label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} data-autofocus>
        {all && <option value="all">All programs</option>}
        {programs.map((p) => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </Select>
    </>
  );
}

function GrantDialog({ user, programs, onClose, onDone }: { user: AdminUserRow; programs: ProgramChoice[]; onClose: () => void; onDone: () => void }) {
  const [days, setDays] = React.useState("30");
  const [program, setProgram] = React.useState(programs[0]?.id ?? "");
  const { busy, run } = useRun(onDone, "Premium granted");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Grant premium">
      <DialogHeader>
        <DialogTitle>Grant premium</DialogTitle>
        <DialogDescription>Adds days of premium for ONE program to {name(user)}. If that program is already active, the days are added after its current expiry.</DialogDescription>
      </DialogHeader>
      <ProgramSelect id="g-program" programs={programs} value={program} onChange={setProgram} />
      <Label htmlFor="g-days">Days of premium</Label>
      <Input id="g-days" type="number" min={1} max={3650} value={days} onChange={(e) => setDays(e.target.value)} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={busy} disabled={!program} onClick={() => run(() => grantPremiumAction(user.id, Number(days), program))}>Grant premium</Button>
      </DialogFooter>
    </Dialog>
  );
}

function ExpiryDialog({ user, programs, onClose, onDone }: { user: AdminUserRow; programs: ProgramChoice[]; onClose: () => void; onDone: () => void }) {
  const [program, setProgram] = React.useState(programs[0]?.id ?? "");
  const [date, setDate] = React.useState(user.premium_expires_at ? user.premium_expires_at.slice(0, 10) : "");
  const { busy, run } = useRun(onDone, "Expiry updated");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Edit premium expiry">
      <DialogHeader>
        <DialogTitle>Edit premium expiry</DialogTitle>
        <DialogDescription>Premium for {name(user)} in the chosen program ends at the end of the chosen day. A past date ends it now.</DialogDescription>
      </DialogHeader>
      <ProgramSelect id="x-program" programs={programs} value={program} onChange={setProgram} />
      <Label htmlFor="x-date">Expires on</Label>
      <Input id="x-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={busy} disabled={!date || !program} onClick={() => run(() => setPremiumExpiryAction(user.id, date, program))}>Save expiry</Button>
      </DialogFooter>
    </Dialog>
  );
}

function RevokeDialog({ user, programs, onClose, onDone }: { user: AdminUserRow; programs: ProgramChoice[]; onClose: () => void; onDone: () => void }) {
  const [program, setProgram] = React.useState("all");
  const { busy, run } = useRun(onDone, "Premium revoked");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Revoke premium">
      <DialogHeader>
        <DialogTitle>Revoke premium?</DialogTitle>
        <DialogDescription>{name(user)} loses access to the premium resources of the chosen program immediately.</DialogDescription>
      </DialogHeader>
      <ProgramSelect id="v-program" programs={programs} value={program} onChange={setProgram} all />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Keep premium</Button>
        <Button variant="danger" loading={busy} onClick={() => run(() => revokePremiumAction(user.id, program))}>Revoke premium</Button>
      </DialogFooter>
    </Dialog>
  );
}

function RoleDialog({ user, onClose, onDone }: { user: AdminUserRow; onClose: () => void; onDone: () => void }) {
  const [role, setRole] = React.useState<UserRole>(user.role);
  const { busy, run } = useRun(onDone, "Role updated");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Change role">
      <DialogHeader>
        <DialogTitle>Change role</DialogTitle>
        <DialogDescription>Admins can manage content and users. Only super admins can change roles.</DialogDescription>
      </DialogHeader>
      <Label htmlFor="r-role">Role for {name(user)}</Label>
      <Select id="r-role" value={role} onChange={(e) => setRole(e.target.value as UserRole)} data-autofocus>
        {USER_ROLES.map((r) => (
          <option key={r} value={r}>{r === "SUPER_ADMIN" ? "Super admin" : r === "ADMIN" ? "Admin" : "User"}</option>
        ))}
      </Select>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={busy} disabled={role === user.role} onClick={() => run(() => changeRoleAction(user.id, role))}>Save role</Button>
      </DialogFooter>
    </Dialog>
  );
}

function DetailDialog({ user, onClose }: { user: AdminUserRow; onClose: () => void }) {
  const [detail, setDetail] = React.useState<UserDetail | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  React.useEffect(() => {
    let live = true;
    getUserDetailAction(user.id).then((r) => {
      if (!live) return;
      if (r.ok && r.data) setDetail(r.data);
      else setErr(r.ok ? "No details." : r.error);
    });
    return () => {
      live = false;
    };
  }, [user.id]);

  const rows: [string, React.ReactNode][] = [
    ["Email", user.email ?? "—"],
    ["College", user.college ?? "—"],
    ["Year / semester", user.year ? `Year ${user.year}${user.semester ? `, semester ${user.semester}` : ""}` : "—"],
    ["Joined", formatDate(user.created_at, { withTime: true })],
    ["Referral code", <code key="c" className="font-mono">{user.referral_code}</code>],
    ["Premium started", formatDate(user.premium_started_at)],
    ["Premium expires", formatDate(user.premium_expires_at)],
  ];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="User details" className="max-h-[90dvh] max-w-lg overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{user.full_name || "Unnamed user"}</DialogTitle>
        <div className="flex flex-wrap gap-1.5 pt-1"><RoleBadge role={user.role} /><PremiumBadge u={user} /></div>
      </DialogHeader>
      <dl className="divide-y divide-border text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="min-w-0 break-words text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <h4 className="mb-2 mt-5 text-sm font-semibold">Referrals and payments</h4>
      {!detail && !err && <p className="text-sm text-muted-foreground">Loading…</p>}
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      {detail && (
        <>
          <p className="mb-2 text-sm text-muted-foreground">
            Referred {detail.referredCount} {detail.referredCount === 1 ? "person" : "people"}
            {detail.referrerName ? ` · Joined through ${detail.referrerName}` : ""}
          </p>
          {detail.payments.length ? (
            <ul className="divide-y divide-border rounded-md border border-border text-sm">
              {detail.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span>{formatDate(p.created_at)} · {p.payment_method}</span>
                  <span className="flex items-center gap-2 font-medium">
                    {p.amount}
                    <Badge variant={p.status === "APPROVED" ? "success" : p.status === "REJECTED" ? "danger" : "warning"}>{p.status.toLowerCase()}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No payments yet.</p>
          )}
        </>
      )}
      <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
    </Dialog>
  );
}

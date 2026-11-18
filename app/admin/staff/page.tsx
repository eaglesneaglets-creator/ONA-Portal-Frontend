"use client";

import { MailPlus, MoreHorizontal, UserCog, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/dashboard/states";
import { TextField } from "@/components/dashboard/text-field";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLoaded } from "@/hooks/use-paged-list";
import { type StaffMember, staffApi } from "@/lib/api/account";
import { fmtShortDay } from "@/lib/api/bookings";
import { ApiError, type FieldErrors } from "@/lib/api/errors";
import { initials } from "@/lib/initials";
import { cn, omit } from "@/lib/utils";

/**
 * /admin/staff — who can sign in to this console. Adding someone emails
 * them a link to choose a password; deactivating locks them out at once.
 * You cannot deactivate yourself or the last active account (the API
 * refuses too). Every change is in the audit log.
 */
export default function AdminStaffPage() {
  const { data, refresh } = useLoaded(() => staffApi.list(), []);
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<StaffMember | null>(null);
  const isMobile = useIsMobile();
  const active = data ? data.filter((m) => m.is_active).length : 0;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Staff accounts"
        description={data ? `${active} active · everyone here can run the whole console.` : "Who can sign in to the ONA console."}
        actions={
          <Button className="h-11 md:h-9" onClick={() => setAdding(true)}>
            <UserPlus aria-hidden="true" />
            Add staff member
          </Button>
        }
      />

      {data === null ? (
        <ErrorState message="Staff could not be loaded." onRetry={refresh} />
      ) : data === undefined ? (
        <RowsSkeleton rows={3} />
      ) : data.length === 0 ? (
        <EmptyState icon={UserCog} title="No staff accounts" body="Add the people who run bookings and payments." />
      ) : isMobile ? (
        <ul className="grid gap-3">
          {data.map((m) => (
            <li key={m.id} data-testid="staff-row" className="flex items-center gap-3 rounded-xl border border-border-default bg-surface p-4">
              <Person m={m} />
              <Actions m={m} onChanged={refresh} onDeactivate={setConfirm} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-default bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last signed in</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((m) => (
                <TableRow key={m.id} data-testid="staff-row" className={cn(!m.is_active && "opacity-70")}>
                  <TableCell><Person m={m} withStatus={false} /></TableCell>
                  <TableCell><Status m={m} /></TableCell>
                  <TableCell className="tabular-nums text-ink-dim">{m.last_login ? fmtShortDay(m.last_login) : "Never"}</TableCell>
                  <TableCell className="tabular-nums text-ink-dim">{fmtShortDay(m.date_joined)}</TableCell>
                  <TableCell className="text-right"><Actions m={m} onChanged={refresh} onDeactivate={setConfirm} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AddStaffDialog open={adding} onOpenChange={setAdding} onAdded={refresh} />
      <DeactivateDialog member={confirm} onClose={() => setConfirm(null)} onDone={refresh} />
    </div>
  );
}

function Status({ m }: { m: StaffMember }) {
  const [label, tone] = !m.is_active
    ? ["Deactivated", "bg-surface-sunk text-ink-dim"]
    : m.invite_pending
      ? ["Invite sent", "bg-warn-bg text-warn"]
      : ["Active", "bg-ok-bg text-ok"];
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-bold whitespace-nowrap", tone)}>{label}</span>;
}

function Person({ m, withStatus = true }: { m: StaffMember; withStatus?: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <Avatar className="size-9">
        <AvatarFallback className="bg-surface-sunk text-[12.5px] font-bold text-ink">{initials(m.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink">
          {m.name}
          {m.is_you ? <span className="ml-2 text-[12px] font-normal text-ink-mute">(you)</span> : null}
        </p>
        <p className="truncate text-[13px] text-ink-mute">{m.email}</p>
        {withStatus ? <div className="mt-1.5"><Status m={m} /></div> : null}
      </div>
    </div>
  );
}

function Actions({ m, onChanged, onDeactivate }: {
  m: StaffMember;
  onChanged: () => void;
  onDeactivate: (m: StaffMember) => void;
}) {
  async function resend() {
    try {
      const r = await staffApi.resendInvite(m.id);
      toast.success(r.detail);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.formError : "Could not send the invite.");
    }
  }
  async function reactivate() {
    try {
      await staffApi.update(m.id, { is_active: true });
      toast.success(`${m.name} can sign in again.`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.formError : "Could not reactivate.");
    }
  }
  if (m.is_you) return <span className="w-11 md:w-8" />;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for ${m.name}`} className="size-11 md:size-8">
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {m.is_active && m.invite_pending ? (
          <DropdownMenuItem className="min-h-11 md:min-h-8" onSelect={() => void resend()}>
            <MailPlus aria-hidden="true" />
            Send invite again
          </DropdownMenuItem>
        ) : null}
        {m.is_active ? (
          <>
            {m.invite_pending ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem className="min-h-11 text-err md:min-h-8" onSelect={() => onDeactivate(m)}>
              Deactivate
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem className="min-h-11 md:min-h-8" onSelect={() => void reactivate()}>
            Reactivate
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AddStaffDialog({ open, onOpenChange, onAdded }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdded: () => void;
}) {
  const [form, setForm] = useState({ email: "", first_name: "", last_name: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  function edit(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((prev) => omit(prev, k));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const local: FieldErrors = {};
    if (!form.first_name.trim()) local.first_name = ["Enter their first name."];
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) local.email = ["Enter an email address."];
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }
    setBusy(true);
    try {
      const m = await staffApi.invite(form);
      toast.success(`${m.name} added. An email to choose a password is on its way to ${m.email}.`);
      setForm({ email: "", first_name: "", last_name: "" });
      onOpenChange(false);
      onAdded();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors);
      else toast.error(err instanceof Error ? err.message : "Could not add them. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setErrors({}); onOpenChange(o); }}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Add a staff member</DialogTitle>
            <DialogDescription>
              They get an email to choose a password, then can use the whole console — bookings, payments,
              identity checks and staff accounts.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="s-first" label="First name" autoComplete="off" value={form.first_name}
              onChange={(v) => edit("first_name", v)} error={errors.first_name?.[0]} />
            <TextField id="s-last" label="Last name (optional)" autoComplete="off" value={form.last_name}
              onChange={(v) => edit("last_name", v)} error={errors.last_name?.[0]} />
          </div>
          <TextField id="s-email" label="Work email" type="email" inputMode="email" autoComplete="off"
            value={form.email} onChange={(v) => edit("email", v)} error={errors.email?.[0]} />
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11" disabled={busy} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="h-11" disabled={busy}>
              {busy ? "Adding…" : "Add and send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeactivateDialog({ member, onClose, onDone }: {
  member: StaffMember | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  async function go() {
    if (!member) return;
    setBusy(true);
    try {
      await staffApi.update(member.id, { is_active: false });
      toast.success(`${member.name} can no longer sign in.`);
      onClose();
      onDone();
    } catch (err) {
      const msg = err instanceof ApiError ? (err.fieldErrors.is_active?.[0] ?? err.formError) : "Could not deactivate.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={member !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deactivate {member?.name}?</DialogTitle>
          <DialogDescription>
            They are signed out straight away and cannot sign in again until someone reactivates them.
            Their past work stays in the records.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" className="h-11" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button type="button" className="h-11 bg-err text-white hover:bg-err/90" disabled={busy} onClick={go}>
            {busy ? "Deactivating…" : "Deactivate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

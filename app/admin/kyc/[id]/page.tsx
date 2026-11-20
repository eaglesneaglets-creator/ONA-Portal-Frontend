"use client";

import {
  ArrowLeft,
  BadgeCheck,
  Eye,
  FileText,
  ImageOff,
  Loader2,
  MessageSquareWarning,
  RotateCw,
  ShieldX,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/dashboard/states";
import { KycStatusBadge } from "@/components/kyc/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useLoaded } from "@/hooks/use-paged-list";
import {
  FLAG_LABEL,
  STATUS_LABEL,
  docsFor,
  kycAdminApi,
  type Decision,
  type DocumentKind,
  type ReviewDetail,
  type ReviewEvent,
} from "@/lib/api/kyc";
import { cn } from "@/lib/utils";

const fmtDay = (iso: string | null | undefined) =>
  iso ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso)) : "—";
const fmtWhen = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );

function age(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) years -= 1;
  return years;
}

/** Do the name on the ID and the account name share a word? A prompt to look, not a verdict. */
function namesOverlap(a: string, b: string): boolean {
  const words = (s: string) => new Set(s.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 1));
  const x = words(a);
  return [...words(b)].some((w) => x.has(w));
}

const DOC_TITLE: Record<DocumentKind, string> = { id_front: "ID front", id_back: "ID back", selfie: "Selfie" };

/**
 * /admin/kyc/[id] — one identity check. The reviewer compares the scans
 * with the typed details and the ONA account, then decides. The decision
 * is made in the KYC service, which locks the check while it does: if a
 * colleague decided first, this page says so instead of overwriting it.
 */
export default function AdminKycDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, refresh } = useLoaded(() => kycAdminApi.detail(id), [id]);

  if (data === null) return <ErrorState message="This identity check could not be loaded." onRetry={refresh} />;
  if (data === undefined) {
    return (
      <div aria-busy="true" aria-label="Loading" className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-10 w-1/2 rounded-lg" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }
  return <Review v={data} onChanged={refresh} />;
}

function Review({ v, onChanged }: { v: ReviewDetail; onChanged: () => void }) {
  const open = v.status === "submitted" || v.status === "in_review";
  return (
    <div className="mx-auto w-full max-w-6xl">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3 h-11 md:h-8">
        <Link href="/admin/kyc">
          <ArrowLeft aria-hidden="true" /> Identity checks
        </Link>
      </Button>
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-[clamp(24px,3.4vw,30px)] font-black leading-tight tracking-tight text-ink">
          {v.full_name || "Unnamed check"}
        </h1>
        <KycStatusBadge status={v.status} />
      </header>

      {v.flags.length ? (
        <Alert className="mb-4 border-warn/40 bg-warn-bg">
          <TriangleAlert aria-hidden="true" className="text-warn" />
          <AlertTitle>Look closely before deciding</AlertTitle>
          <AlertDescription className="text-ink">
            {v.flags.map((f) => FLAG_LABEL[f] ?? f).join(" ")}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Scans v={v} />
          <History events={v.events} />
        </div>
        <div className="space-y-4">
          {open ? <DecisionPanel v={v} onChanged={onChanged} /> : <Outcome v={v} />}
          <Details v={v} />
          <Account v={v} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scans                                                               */
/* ------------------------------------------------------------------ */

function Scans({ v }: { v: ReviewDetail }) {
  const kinds = docsFor(v.id_type);
  const [big, setBig] = useState<{ kind: DocumentKind; url: string } | null>(null);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[16px] font-black">Documents</CardTitle>
        <CardDescription>Each opening is recorded in the check&apos;s history.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {kinds.map((kind) => (
          <Scan
            key={kind}
            id={v.id}
            kind={kind}
            purged={v.documents.find((d) => d.kind === kind)?.purged ?? false}
            present={v.documents.some((d) => d.kind === kind)}
            onEnlarge={(url) => setBig({ kind, url })}
          />
        ))}
      </CardContent>
      <Dialog open={big !== null} onOpenChange={(o) => !o && setBig(null)}>
        <DialogContent className="max-w-[min(96vw,1100px)] sm:max-w-[min(96vw,1100px)]">
          <DialogHeader>
            <DialogTitle>{big ? DOC_TITLE[big.kind] : ""}</DialogTitle>
            <DialogDescription>{v.full_name}</DialogDescription>
          </DialogHeader>
          {big ? (
            // eslint-disable-next-line @next/next/no-img-element -- a blob: URL of bytes relayed by the API
            <img src={big.url} alt={`${DOC_TITLE[big.kind]} for ${v.full_name}`} className="max-h-[75vh] w-full rounded-lg bg-black object-contain" />
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Scan({
  id,
  kind,
  purged,
  present,
  onEnlarge,
}: {
  id: string;
  kind: DocumentKind;
  purged: boolean;
  present: boolean;
  onEnlarge: (url: string) => void;
}) {
  const [file, setFile] = useState<{ url: string; type: string } | null | "error">(null);
  const [attempt, setAttempt] = useState(0);
  const fetchable = present && !purged;

  useEffect(() => {
    if (!fetchable) return;
    let url = "";
    let live = true;
    kycAdminApi
      .document(id, kind)
      .then((blob) => {
        url = URL.createObjectURL(blob);
        if (live) setFile({ url, type: blob.type });
      })
      .catch(() => live && setFile("error"));
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, kind, fetchable, attempt]);

  const frame = "relative grid aspect-[4/3] place-items-center overflow-hidden rounded-lg bg-surface-sunk";
  let body: React.ReactNode;
  if (!present) {
    body = <p className="px-3 text-center text-[13px] text-ink-mute">Not uploaded</p>;
  } else if (purged) {
    body = (
      <p className="flex flex-col items-center gap-1 px-3 text-center text-[13px] text-ink-mute">
        <ImageOff aria-hidden="true" className="size-5" />
        Deleted after the retention period
      </p>
    );
  } else if (file === "error") {
    body = (
      <Button variant="outline" size="sm" onClick={() => { setFile(null); setAttempt((n) => n + 1); }}>
        <RotateCw aria-hidden="true" /> Try again
      </Button>
    );
  } else if (file === null) {
    body = <Loader2 aria-label="Loading" className="size-5 animate-spin text-ink-mute" />;
  } else if (file.type === "application/pdf") {
    body = (
      <Button asChild variant="outline" size="sm">
        <a href={file.url} target="_blank" rel="noopener noreferrer">
          <FileText aria-hidden="true" /> Open PDF
        </a>
      </Button>
    );
  } else {
    body = (
      <button
        type="button"
        onClick={() => onEnlarge(file.url)}
        className="group size-full"
        aria-label={`Enlarge ${DOC_TITLE[kind]}`}
      >
        {/* contain, not cover: a reviewer must see the document's edges. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- a blob: URL of bytes relayed by the API */}
        <img src={file.url} alt="" className="size-full object-contain transition-transform group-hover:scale-[1.02]" />
        <span className="absolute right-2 bottom-2 grid size-7 place-items-center rounded-md bg-black/60 text-white">
          <Eye aria-hidden="true" className="size-4" />
        </span>
      </button>
    );
  }

  return (
    <figure>
      <div className={frame}>{body}</div>
      <figcaption className="mt-1.5 text-[13px] font-bold text-ink">{DOC_TITLE[kind]}</figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* What the person typed, and who they are on ONA                      */
/* ------------------------------------------------------------------ */

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-[13.5px] text-ink-dim">{label}</dt>
      <dd className="text-right text-[14.5px] font-bold text-ink">{children}</dd>
    </div>
  );
}

function Details({ v }: { v: ReviewDetail }) {
  const years = age(v.date_of_birth);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[16px] font-black">What they entered</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-border-soft">
          <Row label="Name on ID">{v.full_name || "—"}</Row>
          <Row label="Date of birth">
            {fmtDay(v.date_of_birth)}
            {years !== null ? <span className="block text-[12.5px] font-normal text-ink-dim">{years} years old</span> : null}
          </Row>
          <Row label="ID">{v.id_type === "passport" ? "Passport" : v.id_type ? "Ghana Card" : "—"}</Row>
          <Row label="ID number">
            <span className="font-mono tracking-wide">{v.id_number || "—"}</span>
          </Row>
          <Row label="Sent">{v.submitted_at ? fmtWhen(v.submitted_at) : "—"}</Row>
        </dl>
      </CardContent>
    </Card>
  );
}

function Account({ v }: { v: ReviewDetail }) {
  const p = v.person;
  const mismatch = p && v.full_name && !p.name.includes("@") && !namesOverlap(p.name, v.full_name);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[16px] font-black">
          <UserRound aria-hidden="true" className="size-4 text-ink-mute" /> ONA account
        </CardTitle>
      </CardHeader>
      <CardContent>
        {p ? (
          <>
            <dl className="divide-y divide-border-soft">
              <Row label="Name">{p.name}</Row>
              <Row label="Email">{p.email}</Row>
              {p.phone ? <Row label="Phone">{p.phone}</Row> : null}
              <Row label="Account">{p.role === "professional" ? "Professional" : "Customer"}</Row>
              <Row label="Joined">{fmtDay(p.date_joined)}</Row>
            </dl>
            {mismatch ? (
              <p className="mt-3 flex gap-2 rounded-lg bg-warn-bg p-3 text-[13px] text-ink">
                <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 flex-none text-warn" />
                The account name and the name on the ID share no word. That can be fine (a nickname, a
                married name); check the ID.
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-[14px] text-ink-dim">No ONA account matches this check.</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Deciding                                                            */
/* ------------------------------------------------------------------ */

const DECISION_COPY: Record<Decision, { title: string; body: string; confirm: string; needsReason: boolean }> = {
  approved: {
    title: "Approve this check?",
    body: "The person is marked verified on ONA. This cannot be undone from here.",
    confirm: "Approve",
    needsReason: false,
  },
  changes_requested: {
    title: "Ask for a change",
    body: "The person sees your note, fixes what you ask and sends it again. Say exactly what to redo.",
    confirm: "Send request",
    needsReason: true,
  },
  rejected: {
    title: "Turn this check down?",
    body: "The person sees your reason and can start a new check. Use this when the ID or the person does not match.",
    confirm: "Turn down",
    needsReason: true,
  },
};

function DecisionPanel({ v, onChanged }: { v: ReviewDetail; onChanged: () => void }) {
  const [choice, setChoice] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function claim() {
    setBusy(true);
    try {
      await kycAdminApi.startReview(v.id);
      toast.success("Marked as being reviewed by you.");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not claim it.");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function decide() {
    if (!choice) return;
    setBusy(true);
    try {
      await kycAdminApi.decide(v.id, choice, reason.trim());
      toast.success(`Done: ${STATUS_LABEL[choice].toLowerCase()}.`);
      setChoice(null);
      onChanged();
    } catch (e) {
      // 409: a colleague decided first. Show what happened rather than retrying.
      toast.error(e instanceof Error ? e.message : "Could not save the decision.");
      setChoice(null);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  const copy = choice ? DECISION_COPY[choice] : null;
  const canConfirm = choice !== null && (!copy?.needsReason || reason.trim().length >= 10);

  return (
    <Card className="border-ona-blue/30">
      <CardHeader>
        <CardTitle className="text-[16px] font-black">Decision</CardTitle>
        <CardDescription>
          {v.status === "submitted"
            ? "Claim it so colleagues can see someone is on it, or decide straight away."
            : "Compare the photo on the ID with the selfie, and the ID with what was typed."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {v.status === "submitted" ? (
          <Button variant="outline" className="h-11" disabled={busy} onClick={() => void claim()}>
            I&apos;m reviewing this
          </Button>
        ) : null}
        <Button className="h-11 bg-ok font-bold text-white hover:bg-ok/90" disabled={busy} onClick={() => setChoice("approved")}>
          <BadgeCheck aria-hidden="true" /> Approve
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-11" disabled={busy} onClick={() => setChoice("changes_requested")}>
            <MessageSquareWarning aria-hidden="true" /> Ask for change
          </Button>
          <Button
            variant="outline"
            className="h-11 border-err/40 text-err hover:bg-err-bg hover:text-err"
            disabled={busy}
            onClick={() => setChoice("rejected")}
          >
            <ShieldX aria-hidden="true" /> Turn down
          </Button>
        </div>
      </CardContent>

      <Dialog
        open={choice !== null}
        onOpenChange={(o) => {
          if (!o) {
            setChoice(null);
            setReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy?.title}</DialogTitle>
            <DialogDescription>{copy?.body}</DialogDescription>
          </DialogHeader>
          {copy?.needsReason ? (
            <div className="space-y-1.5">
              <Label htmlFor="kyc-reason">Note to {v.full_name.split(" ")[0] || "the person"}</Label>
              <Textarea
                id="kyc-reason"
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  choice === "changes_requested"
                    ? "The back of the card is blurred. Please take it again in good light."
                    : "The selfie does not match the photo on the ID."
                }
              />
              <p className="text-[12.5px] text-ink-mute">They will read this. At least 10 characters.</p>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setChoice(null)} className="h-11 md:h-9">
              Cancel
            </Button>
            <Button
              onClick={() => void decide()}
              disabled={!canConfirm || busy}
              className={cn("h-11 md:h-9", choice === "rejected" && "bg-err text-white hover:bg-err/90")}
            >
              {busy ? "Saving…" : copy?.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Outcome({ v }: { v: ReviewDetail }) {
  const who = v.decided_by.split("/").pop() || v.decided_by;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[16px] font-black">{STATUS_LABEL[v.status]}</CardTitle>
        <CardDescription>
          {v.status === "changes_requested"
            ? "Waiting for the person to make the change and send it again."
            : v.decided_at
              ? `Decided ${fmtWhen(v.decided_at)}${who ? ` by ${who}` : ""}.`
              : "Not sent for review yet."}
        </CardDescription>
      </CardHeader>
      {v.decision_reason ? (
        <CardContent>
          <p className="rounded-lg bg-surface-alt p-3 text-[14px] text-ink">&ldquo;{v.decision_reason}&rdquo;</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */

const ACTION_LABEL: Record<string, string> = {
  created: "Started",
  updated: "Changed details",
  document_uploaded: "Uploaded a photo",
  submitted: "Sent for review",
  in_review: "Claimed for review",
  approved: "Approved",
  rejected: "Turned down",
  changes_requested: "Asked for a change",
  documents_purged: "Photos deleted (retention)",
};

function actorName(actor: string): string {
  if (actor.startsWith("platform:")) {
    const [, who] = actor.split("/");
    return who || "The person (via ONA)";
  }
  return actor.replace(/^staff:/, "KYC staff: ");
}

function History({ events }: { events: ReviewEvent[] }) {
  const [showViews, setShowViews] = useState(false);
  const views = events.filter((e) => e.action === "viewed");
  const shown = showViews ? events : events.filter((e) => e.action !== "viewed");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[16px] font-black">History</CardTitle>
        {views.length ? (
          <CardAction>
            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setShowViews((s) => !s)}>
              {showViews ? "Hide views" : `Show ${views.length} ${views.length === 1 ? "view" : "views"}`}
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-4 border-l border-border-default pl-5">
          {[...shown].reverse().map((e, i) => (
            <li key={`${e.at}-${i}`} className="relative">
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-1.5 -left-[25px] size-2.5 rounded-full ring-4 ring-surface",
                  e.action === "approved" ? "bg-ok" : e.action === "rejected" ? "bg-err" : e.action === "viewed" ? "bg-border-default" : "bg-ona-blue",
                )}
              />
              <p className="text-[14px] font-bold text-ink">
                {e.action === "viewed"
                  ? `Viewed ${e.note ? DOC_TITLE[e.note as DocumentKind] ?? e.note : "the record"}`
                  : ACTION_LABEL[e.action] ?? e.action}
                {e.action === "updated" && e.note ? <span className="font-normal text-ink-dim"> · {e.note.replaceAll("_", " ")}</span> : null}
                {e.action === "document_uploaded" && e.note ? (
                  <span className="font-normal text-ink-dim">
                    {" · "}
                    {DOC_TITLE[e.note.split(" ")[0] as DocumentKind] ?? e.note}
                    {e.note.includes("replaced") ? " (replaced)" : ""}
                  </span>
                ) : null}
              </p>
              <p className="text-[12.5px] text-ink-dim">
                {fmtWhen(e.at)} · {actorName(e.actor)}
              </p>
              {e.note && ["approved", "rejected", "changes_requested"].includes(e.action) ? (
                <p className="mt-1 text-[13px] text-ink">&ldquo;{e.note}&rdquo;</p>
              ) : null}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

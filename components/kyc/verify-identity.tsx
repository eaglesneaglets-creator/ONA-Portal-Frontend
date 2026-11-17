"use client";

import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  Clock3,
  IdCard,
  Lock,
  ScanFace,
  ShieldCheck,
  ShieldX,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState } from "@/components/dashboard/states";
import { PhotoUpload } from "@/components/kyc/photo-upload";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoaded } from "@/hooks/use-paged-list";
import { ApiError, type FieldErrors } from "@/lib/api/errors";
import { docsFor, kycApi, type IdType, type MyIdentity, type Verification } from "@/lib/api/kyc";
import { cn } from "@/lib/utils";

/**
 * The person's identity check, from first visit to decision.
 *
 *   nothing yet ─▶ intro ─▶ details ─▶ ID photos ─▶ selfie ─▶ check & send
 *                                                                  │
 *   waiting ◀──────────────────────────────────────────────────────┘
 *     ├─▶ verified
 *     ├─▶ changes requested ─▶ (back into the steps, with the reviewer's note)
 *     └─▶ not verified ─▶ start a new check
 *
 * Every answer from the server is the whole check, so the page always shows
 * what the KYC service says is still missing — never its own guess.
 */
export function VerifyIdentity() {
  const { data, refresh } = useLoaded(() => kycApi.mine(), []);
  const [mine, setMine] = useState<MyIdentity | null>(null);
  const state = mine ?? data;

  if (state === null) return <ErrorState message="Your identity check could not be loaded." onRetry={refresh} />;
  if (state === undefined) return <LoadingCard />;
  if (!state.available) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Identity checks are not open yet"
        body="You do not need to do anything for now. This page will let you verify when ONA turns checks on."
      />
    );
  }

  const v = state.verification;
  if (v === null || v.status === "rejected") return <Intro previous={v} onStarted={setMine} />;
  if (v.status === "approved") return <Verified v={v} />;
  if (v.status === "submitted" || v.status === "in_review") return <Waiting v={v} />;
  return <Steps v={v} onChange={setMine} />;
}

function LoadingCard() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-3">
      <Skeleton className="h-10 w-2/3 rounded-lg" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

const fmtDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso)) : "";

/* ------------------------------------------------------------------ */
/* Before starting                                                     */
/* ------------------------------------------------------------------ */

function Intro({ previous, onStarted }: { previous: Verification | null; onStarted: (m: MyIdentity) => void }) {
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      onStarted(await kycApi.start());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {previous?.status === "rejected" ? (
        <Alert variant="destructive">
          <ShieldX aria-hidden="true" />
          <AlertTitle>Your last check was not approved</AlertTitle>
          <AlertDescription>
            {previous.decision_reason || "The reviewer could not confirm your identity from what was sent."} You
            can start a new check below.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="overflow-hidden">
        <div aria-hidden="true" className="h-1.5 bg-ona-gradient" />
        <CardHeader>
          <CardTitle className="text-[20px] font-black tracking-tight">Confirm it&apos;s really you</CardTitle>
          <CardDescription className="text-[14.5px]">
            A one-time check with a government ID. It takes about three minutes on your phone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ul className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: IdCard, title: "Your ID", body: "A Ghana Card, or a passport." },
              { icon: ScanFace, title: "A selfie", body: "So we can match you to the photo on it." },
              { icon: Clock3, title: "A person reviews it", body: "Someone at ONA checks it and the result shows here." },
            ].map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3 rounded-xl bg-surface-alt p-3.5 sm:block sm:p-4">
                <Icon aria-hidden="true" className="mt-0.5 size-5 flex-none text-ona-blue sm:mt-0 sm:mb-2" />
                <div>
                  <p className="text-[14.5px] font-bold text-ink">{title}</p>
                  <p className="text-[13.5px] leading-snug text-ink-dim">{body}</p>
                </div>
              </li>
            ))}
          </ul>
          <PrivacyNote />
        </CardContent>
        <CardFooter>
          <Button onClick={() => void start()} disabled={busy} className="h-11 w-full px-6 font-bold sm:w-auto">
            {previous ? "Start a new check" : "Start"} <ArrowRight aria-hidden="true" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function PrivacyNote() {
  return (
    <p className="flex gap-2.5 rounded-lg border border-border-soft p-3 text-[13px] leading-relaxed text-ink-dim">
      <Lock aria-hidden="true" className="mt-0.5 size-4 flex-none text-ink-mute" />
      <span>
        Your ID number is stored encrypted, and only the ONA staff who review checks can see your photos. They
        are deleted 90 days after the decision; the result is kept.
      </span>
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* The steps                                                           */
/* ------------------------------------------------------------------ */

const STEPS = ["Your details", "Your ID", "Your selfie", "Check and send"] as const;
const DETAIL_FIELDS = ["full_name", "date_of_birth", "id_type", "id_number"];

function firstOpenStep(v: Verification): number {
  if (v.missing.some((m) => DETAIL_FIELDS.includes(m))) return 0;
  if (v.missing.some((m) => m === "document:id_front" || m === "document:id_back")) return 1;
  if (v.missing.includes("document:selfie")) return 2;
  return 3;
}

function Steps({ v, onChange }: { v: Verification; onChange: (m: MyIdentity) => void }) {
  const [step, setStep] = useState(() => firstOpenStep(v));
  const go = (n: number) => {
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-4">
      {v.status === "changes_requested" ? (
        <Alert className="border-warn/40 bg-warn-bg">
          <TriangleAlert aria-hidden="true" className="text-warn" />
          <AlertTitle>The reviewer asked for a change</AlertTitle>
          <AlertDescription className="text-ink">{v.decision_reason}</AlertDescription>
        </Alert>
      ) : null}

      <Stepper step={step} v={v} onPick={go} />

      {step === 0 ? <DetailsStep v={v} onChange={onChange} onNext={() => go(1)} /> : null}
      {step === 1 ? <IdStep v={v} onChange={onChange} onBack={() => go(0)} onNext={() => go(2)} /> : null}
      {step === 2 ? <SelfieStep v={v} onChange={onChange} onBack={() => go(1)} onNext={() => go(3)} /> : null}
      {step === 3 ? <ReviewStep v={v} onChange={onChange} onBack={() => go(2)} onPick={go} /> : null}
    </div>
  );
}

function stepDone(v: Verification, i: number): boolean {
  if (i === 0) return !v.missing.some((m) => DETAIL_FIELDS.includes(m));
  if (i === 1) return !v.missing.some((m) => m === "document:id_front" || m === "document:id_back");
  if (i === 2) return !v.missing.includes("document:selfie");
  return false;
}

function Stepper({ step, v, onPick }: { step: number; v: Verification; onPick: (n: number) => void }) {
  return (
    <nav aria-label="Steps">
      {/* Phone: one line and a bar. */}
      <div className="sm:hidden">
        <p className="mb-2 flex justify-between text-[13px] font-bold text-ink-dim">
          <span>
            Step {step + 1} of {STEPS.length}
          </span>
          <span className="text-ink">{STEPS[step]}</span>
        </p>
        <Progress value={((step + 1) / STEPS.length) * 100} aria-label="Progress" />
      </div>
      {/* Wider: every step, done ones ticked, each one a way back. */}
      <ol className="hidden grid-cols-4 gap-2 sm:grid">
        {STEPS.map((label, i) => {
          const done = stepDone(v, i) && i !== step;
          const current = i === step;
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => onPick(i)}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-[13.5px] font-bold transition-colors",
                  current
                    ? "border-ona-blue bg-surface text-ink shadow-sm"
                    : "border-transparent text-ink-dim hover:bg-surface-sunk",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-6 flex-none place-items-center rounded-full text-[12px] font-black",
                    done ? "bg-ok text-white" : current ? "bg-ona-blue text-white" : "bg-surface-sunk text-ink-dim",
                  )}
                >
                  {done ? <Check className="size-3.5" /> : i + 1}
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StepFooter({
  onBack,
  next,
}: {
  onBack?: () => void;
  next: React.ReactNode;
}) {
  return (
    <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
      {onBack ? (
        <Button type="button" variant="ghost" onClick={onBack} className="h-11 w-full sm:w-auto">
          <ArrowLeft aria-hidden="true" /> Back
        </Button>
      ) : (
        <span />
      )}
      {next}
    </CardFooter>
  );
}

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={id} className="text-[13px] font-bold text-err">
      {errors[0]}
    </p>
  );
}

function DetailsStep({ v, onChange, onNext }: { v: Verification; onChange: (m: MyIdentity) => void; onNext: () => void }) {
  const [fullName, setFullName] = useState(v.full_name);
  const [dob, setDob] = useState(v.date_of_birth ?? "");
  const [idType, setIdType] = useState<IdType | "">(v.id_type);
  const [idNumber, setIdNumber] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const saved = Boolean(v.id_number_last4);
  const today = new Date().toISOString().slice(0, 10);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body: Record<string, string> = {};
    if (fullName.trim() !== v.full_name) body.full_name = fullName.trim();
    if (dob && dob !== v.date_of_birth) body.date_of_birth = dob;
    if (idType && idType !== v.id_type) body.id_type = idType;
    if (idNumber.trim()) body.id_number = idNumber.trim();

    const local: FieldErrors = {};
    if (!fullName.trim()) local.full_name = ["Enter your full name as it appears on your ID."];
    if (!dob) local.date_of_birth = ["Enter your date of birth."];
    if (!idType) local.id_type = ["Choose the ID you will use."];
    if (!idNumber.trim() && !saved) local.id_number = ["Enter the number on your ID."];
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }
    setErrors({});
    if (!Object.keys(body).length) {
      onNext();
      return;
    }
    setBusy(true);
    try {
      onChange(await kycApi.details(body));
      setIdNumber("");
      onNext();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors);
      else toast.error(err instanceof Error ? err.message : "Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const describe = (field: string) => (errors[field] ? `${field}-error` : undefined);
  // An error belongs to what was typed; once that changes, it no longer applies.
  const edited = (field: string) => {
    if (!errors[field]) return;
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  return (
    <Card>
      <form onSubmit={(e) => void save(e)} noValidate>
        <CardHeader>
          <CardTitle className="text-[18px] font-black">Your details</CardTitle>
          <CardDescription>Exactly as they appear on your ID, so the reviewer can match them.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              autoComplete="name"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); edited("full_name"); }}
              aria-invalid={Boolean(errors.full_name)}
              aria-describedby={describe("full_name")}
              className="h-11"
            />
            <FieldError id="full_name-error" errors={errors.full_name} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="date_of_birth">Date of birth</Label>
            <Input
              id="date_of_birth"
              type="date"
              max={today}
              autoComplete="bday"
              value={dob}
              onChange={(e) => { setDob(e.target.value); edited("date_of_birth"); }}
              aria-invalid={Boolean(errors.date_of_birth)}
              aria-describedby={describe("date_of_birth")}
              className="h-11 sm:max-w-[220px]"
            />
            <FieldError id="date_of_birth-error" errors={errors.date_of_birth} />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Which ID will you use?</legend>
            <RadioGroup
              value={idType}
              onValueChange={(val) => { setIdType(val as IdType); edited("id_type"); }}
              className="grid gap-2 sm:grid-cols-2"
              aria-invalid={Boolean(errors.id_type)}
            >
              {(
                [
                  { value: "ghana_card", title: "Ghana Card", body: "Front and back" },
                  { value: "passport", title: "Passport", body: "The photo page" },
                ] as const
              ).map((o) => (
                <Label
                  key={o.value}
                  htmlFor={`id_type_${o.value}`}
                  className={cn(
                    "flex min-h-[var(--tap-min)] cursor-pointer items-center gap-3 rounded-xl border p-3.5 font-normal transition-colors",
                    idType === o.value ? "border-ona-blue bg-info-bg/40" : "border-border-default hover:bg-surface-sunk",
                  )}
                >
                  <RadioGroupItem id={`id_type_${o.value}`} value={o.value} />
                  <span>
                    <span className="block text-[14.5px] font-bold text-ink">{o.title}</span>
                    <span className="block text-[13px] text-ink-dim">{o.body}</span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
            <FieldError id="id_type-error" errors={errors.id_type} />
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="id_number">{idType === "passport" ? "Passport number" : "Ghana Card number"}</Label>
            <Input
              id="id_number"
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="characters"
              placeholder={saved ? `Saved, ending ${v.id_number_last4}` : idType === "passport" ? "G1234567" : "GHA-123456789-0"}
              value={idNumber}
              onChange={(e) => { setIdNumber(e.target.value); edited("id_number"); }}
              aria-invalid={Boolean(errors.id_number)}
              aria-describedby={describe("id_number") ?? "id_number-hint"}
              className="h-11 font-mono sm:max-w-[320px]"
            />
            <p id="id_number-hint" className="text-[13px] text-ink-mute">
              {saved
                ? "Already saved. Type it again only if you need to correct it."
                : "Type it any way, with or without dashes. We only ever show you the last four characters."}
            </p>
            <FieldError id="id_number-error" errors={errors.id_number} />
          </div>
        </CardContent>
        <StepFooter
          next={
            <Button type="submit" disabled={busy} className="h-11 w-full px-6 font-bold sm:w-auto">
              {busy ? "Saving…" : "Save and continue"} <ArrowRight aria-hidden="true" />
            </Button>
          }
        />
      </form>
    </Card>
  );
}

const has = (v: Verification, kind: string) => !v.missing.includes(`document:${kind}`) && v.documents.some((d) => d.kind === kind);

function IdStep({
  v,
  onChange,
  onBack,
  onNext,
}: {
  v: Verification;
  onChange: (m: MyIdentity) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const passport = v.id_type === "passport";
  const needed = docsFor(v.id_type).filter((k) => k !== "selfie");
  const ready = needed.every((k) => has(v, k));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[18px] font-black">{passport ? "Your passport" : "Your Ghana Card"}</CardTitle>
        <CardDescription>Lay it flat in good light. All four corners in the frame, no glare across the words.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <PhotoUpload
          kind="id_front"
          label={passport ? "Photo page" : "Front of the card"}
          hint={passport ? "The page with your photo and details." : "The side with your photo."}
          uploaded={has(v, "id_front")}
          onUploaded={onChange}
        />
        {passport ? null : (
          <PhotoUpload
            kind="id_back"
            label="Back of the card"
            hint="The side with the barcode."
            uploaded={has(v, "id_back")}
            onUploaded={onChange}
          />
        )}
      </CardContent>
      <StepFooter
        onBack={onBack}
        next={
          <Button onClick={onNext} disabled={!ready} className="h-11 w-full px-6 font-bold sm:w-auto">
            Continue <ArrowRight aria-hidden="true" />
          </Button>
        }
      />
    </Card>
  );
}

function SelfieStep({
  v,
  onChange,
  onBack,
  onNext,
}: {
  v: Verification;
  onChange: (m: MyIdentity) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[18px] font-black">A photo of you</CardTitle>
        <CardDescription>Face the camera in good light. No hat or sunglasses, nothing covering your face.</CardDescription>
      </CardHeader>
      <CardContent>
        <PhotoUpload
          kind="selfie"
          label="Your selfie"
          hint="Your phone opens its front camera."
          uploaded={has(v, "selfie")}
          onUploaded={onChange}
        />
      </CardContent>
      <StepFooter
        onBack={onBack}
        next={
          <Button onClick={onNext} disabled={!has(v, "selfie")} className="h-11 w-full px-6 font-bold sm:w-auto">
            Continue <ArrowRight aria-hidden="true" />
          </Button>
        }
      />
    </Card>
  );
}

function ReviewStep({
  v,
  onChange,
  onBack,
  onPick,
}: {
  v: Verification;
  onChange: (m: MyIdentity) => void;
  onBack: () => void;
  onPick: (n: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string[]>([]);
  const rows: { label: string; value: string; step: number }[] = [
    { label: "Full name", value: v.full_name, step: 0 },
    { label: "Date of birth", value: fmtDate(v.date_of_birth), step: 0 },
    { label: "ID", value: v.id_type === "passport" ? "Passport" : "Ghana Card", step: 0 },
    { label: "ID number", value: v.id_number_last4 ? `ending ${v.id_number_last4}` : "", step: 0 },
    { label: "ID photos", value: docsFor(v.id_type).filter((k) => k !== "selfie").every((k) => has(v, k)) ? "Uploaded" : "", step: 1 },
    { label: "Selfie", value: has(v, "selfie") ? "Uploaded" : "", step: 2 },
  ];

  async function send() {
    setBusy(true);
    setProblem([]);
    try {
      onChange(await kycApi.submit());
      toast.success("Sent for review.");
    } catch (e) {
      const missing = e instanceof ApiError ? (e.fieldErrors.missing ?? []) : [];
      const fields = e instanceof ApiError ? Object.entries(e.fieldErrors).filter(([k]) => k !== "missing") : [];
      if (missing.length) setProblem(["Something is still missing — the steps marked empty above."]);
      else if (fields.length) setProblem(fields.map(([, msgs]) => msgs[0]));
      else setProblem([e instanceof Error ? e.message : "Could not send. Please try again."]);
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[18px] font-black">Check and send</CardTitle>
        <CardDescription>Once sent, it is locked while a reviewer looks at it.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="divide-y divide-border-soft rounded-xl border border-border-default">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 px-4 py-3">
              <dt className="text-[13.5px] text-ink-dim">{r.label}</dt>
              <dd className="flex items-center gap-3 text-right text-[14.5px] font-bold text-ink">
                {r.value || <span className="font-normal text-err">Missing</span>}
                <Button type="button" variant="link" className="h-auto p-0 text-[13px]" onClick={() => onPick(r.step)}>
                  Change
                </Button>
              </dd>
            </div>
          ))}
        </dl>
        {problem.length ? (
          <Alert variant="destructive">
            <TriangleAlert aria-hidden="true" />
            <AlertTitle>Not sent</AlertTitle>
            <AlertDescription>{problem.join(" ")}</AlertDescription>
          </Alert>
        ) : null}
        <PrivacyNote />
      </CardContent>
      <StepFooter
        onBack={onBack}
        next={
          <Button onClick={() => void send()} disabled={busy} className="h-11 w-full px-6 font-bold sm:w-auto">
            {busy ? "Sending…" : "Send for review"} <ArrowRight aria-hidden="true" />
          </Button>
        }
      />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* After sending                                                       */
/* ------------------------------------------------------------------ */

function Waiting({ v }: { v: Verification }) {
  const stages = [
    { label: "Sent", done: true, when: fmtDate(v.submitted_at) },
    { label: "Being reviewed", done: v.status === "in_review", when: "" },
    { label: "Decision", done: false, when: "" },
  ];
  return (
    <Card>
      <CardHeader className="flex-row items-start gap-4">
        <span aria-hidden="true" className="grid size-12 flex-none place-items-center rounded-xl bg-info-bg text-info">
          <Clock3 className="size-6" />
        </span>
        <div>
          <CardTitle className="text-[18px] font-black">We&apos;re checking your ID</CardTitle>
          <CardDescription className="mt-1 text-[14.5px]">
            A person at ONA reviews every check. The result will appear on this page.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-3 sm:flex-row sm:gap-0">
          {stages.map((s, i) => (
            <li key={s.label} className="flex flex-1 items-center gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-7 flex-none place-items-center rounded-full text-[12px] font-black",
                  s.done ? "bg-ona-blue text-white" : "border border-border-default bg-surface text-ink-mute",
                )}
              >
                {s.done ? <Check className="size-4" /> : i + 1}
              </span>
              <span className="text-[14px]">
                <span className={cn("block font-bold", s.done ? "text-ink" : "text-ink-mute")}>{s.label}</span>
                {s.when ? <span className="block text-[12.5px] text-ink-dim">{s.when}</span> : null}
              </span>
              {i < stages.length - 1 ? (
                <span aria-hidden="true" className="mx-3 hidden h-px flex-1 bg-border-default sm:block" />
              ) : null}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function Verified({ v }: { v: Verification }) {
  return (
    <Card className="overflow-hidden">
      <div aria-hidden="true" className="h-1.5 bg-ok" />
      <CardHeader className="flex-row items-start gap-4">
        <span aria-hidden="true" className="grid size-12 flex-none place-items-center rounded-xl bg-ok-bg text-ok">
          <BadgeCheck className="size-6" />
        </span>
        <div>
          <CardTitle className="text-[18px] font-black">Your identity is verified</CardTitle>
          <CardDescription className="mt-1 text-[14.5px]">
            {v.full_name}
            {v.decided_at ? ` · verified on ${fmtDate(v.decided_at)}` : ""}. There is nothing more to do.
          </CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}

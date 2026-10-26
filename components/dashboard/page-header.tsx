/**
 * The top of every dashboard page: one <h1>, one line of context, and the
 * page's own actions on the right (they wrap under the title on phones).
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[clamp(24px,3.4vw,30px)] font-black leading-tight tracking-tight text-ink">
          {title}
        </h1>
        {description ? <p className="mt-1 text-[14.5px] text-ink-dim">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

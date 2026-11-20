import { Table, TableBody, TableCaption, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * A dashboard table: framed, tinted header row, and named for screen readers
 * by a caption only they hear (the page's <h1> already says it visually).
 *
 *   <DataTable caption="Payments" head={<><TableHead className="pl-4">Date</TableHead>…</>}>
 *     {rows.map((r) => <TableRow key={r.id}>…</TableRow>)}
 *   </DataTable>
 */
export function DataTable({ caption, head, children }: { caption: string; head: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-default bg-surface">
      <Table>
        <TableCaption className="sr-only">{caption}</TableCaption>
        <TableHeader className="bg-surface-alt">
          <TableRow>{head}</TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}

/** A header cell with no visible label, for a column of buttons (still named for screen readers). */
export function HiddenHead({ label, className = "w-12 pr-4" }: { label: string; className?: string }) {
  return (
    <TableHead className={className}>
      <span className="sr-only">{label}</span>
    </TableHead>
  );
}

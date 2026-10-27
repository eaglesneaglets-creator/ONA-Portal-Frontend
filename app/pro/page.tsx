import { Sparkles } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/states";

/**
 * The professional workspace — deferred to v0.2 (ADR-015). Professionals are
 * routed to /coming-soon, so this is only reached by someone typing the URL.
 */
export default function ProHome() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader title="Your dashboard" description="The professional workspace." />
      <EmptyState
        icon={Sparkles}
        title="Opens in the next release"
        body="Requests, projects and earnings for professionals arrive with the marketplace."
      />
    </div>
  );
}

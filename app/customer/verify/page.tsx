import { PageHeader } from "@/components/dashboard/page-header";
import { VerifyIdentity } from "@/components/kyc/verify-identity";

/** /customer/verify — the customer's identity check (through the shared KYC service). */
export default function VerifyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader title="Verify your identity" description="A one-time check that you are who you say you are." />
      <VerifyIdentity />
    </div>
  );
}

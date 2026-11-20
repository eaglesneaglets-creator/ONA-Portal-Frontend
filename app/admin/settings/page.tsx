import { AccountSettings } from "@/components/account/account-settings";
import { PageHeader } from "@/components/dashboard/page-header";

/** /admin/settings — a staff member's own details and password. */
export default function AdminSettingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader title="Your account" description="Your details and your password." />
      <AccountSettings />
    </div>
  );
}

import type { Metadata } from "next";

import { AccountSettings } from "@/components/account/account-settings";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata: Metadata = { title: "Your account" };

/** /admin/settings — a staff member's own details and password. */
export default function AdminSettingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader title="Your account" description="Your details and your password." />
      <AccountSettings />
    </div>
  );
}

import type { Metadata } from "next";

import { AccountSettings } from "@/components/account/account-settings";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata: Metadata = { title: "Settings" };

/** /customer/settings — your details and password (C12). */
export default function CustomerSettingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader title="Settings" description="Your details and your password." />
      <AccountSettings />
    </div>
  );
}

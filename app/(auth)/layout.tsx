import { AuthShell } from "@/components/auth/auth-shell";
import { RequireGuest } from "@/lib/auth/guard";

/**
 * Shared shell for /login and /register.
 *
 * Both pages used to mount AuthShell themselves, so switching between them
 * remounted the gradient panel — the whole screen blinked before the form
 * appeared. Hoisting it here means Next keeps the layout mounted across the
 * navigation and only the page below it changes, which is what makes a slide
 * possible at all.
 *
 * RequireGuest moves up here for the same reason: a signed-in user landing
 * on either page should be bounced to their portal, and the rule belongs in
 * one place rather than repeated per page.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireGuest>
      <AuthShell>{children}</AuthShell>
    </RequireGuest>
  );
}

import { LoadingScreen } from "@/components/ui/equaliser";

/**
 * Rendered automatically by Next while this route segment resolves.
 *
 * Sits inside the portal shell, so the sidebar and topbar stay put and only
 * the content area swaps. Replacing the whole screen on every navigation
 * makes a fast app feel like it is reloading.
 */
export default function Loading() {
  return <LoadingScreen label="Loading" />;
}

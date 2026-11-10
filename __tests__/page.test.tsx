/**
 * Homepage — UI v2.
 *
 * Token coverage lives in CI's "Brand tokens" job. What matters here is that
 * the page sends people somewhere that exists, shows real rooms and prices
 * (or says plainly that it can't), labels its illustrative booking card as
 * an example, and never promises the deferred marketplace (ADR-015).
 *
 * Home is an async server component: render what it resolves to, with the
 * catalogue loader mocked.
 */

import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Home from "@/app/page";
import type { Catalogue } from "@/lib/api/studio";

const catalogue = vi.hoisted(() => ({ current: null as unknown as Catalogue }));
const faqs = vi.hoisted(() => ({ current: null as null | { id: string; question: string; answer: string }[] }));

// The header reads the route: on the homepage its links are sections of the page.
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn() }) }));

vi.mock("@/lib/api/content", () => ({ fetchFaqs: async () => faqs.current }));

vi.mock("@/lib/api/studio", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/studio")>()),
  fetchCatalogue: async () => catalogue.current,
}));

const ROOM = {
  id: "r1",
  name: "Studio A — Live Room",
  description: "Tracking room.",
  hourly_rate_pesewas: 20000,
  hourly_rate_display: "GHS 200.00",
  capacity: 6,
};

async function renderHome() {
  return render(await Home());
}

beforeEach(() => {
  catalogue.current = { rooms: [ROOM], engineers: [], services: [], packages: [], unavailable: false };
  faqs.current = [{ id: "f1", question: "How do I pay?", answer: "Through ONA." }];
});

describe("Homepage", () => {
  it("has a single h1 that says what the studio offers", async () => {
    await renderHome();
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toMatch(/book the room/i);
  });

  it("links to the live catalogue and into booking", async () => {
    await renderHome();
    // The hero goes to the full catalogue; the header scrolls to this page's rooms.
    const hrefs = screen.getAllByRole("link", { name: /rooms & prices/i }).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/studio");
    expect(within(screen.getByRole("navigation", { name: "Primary" })).getByRole("link", { name: "Rooms & prices" }).getAttribute("href")).toBe("#rooms");
    for (const h of hrefs) expect(["/studio", "#rooms"]).toContain(h);
    expect(document.getElementById("rooms")).toBeTruthy();
    const book = screen.getAllByRole("link", { name: /book studio time|book a session/i });
    expect(book.length).toBeGreaterThan(1);
    for (const a of book) expect(a.getAttribute("href")).toContain("next=%2Fcustomer%2Fbook");
  });

  it("shows real rooms with their API price, each booking straight into that room", async () => {
    await renderHome();
    const rooms = screen.getByRole("region", { name: "Pick your room" });
    expect(within(rooms).getByText("GHS 200.00")).toBeTruthy();
    expect(within(rooms).getByRole("link", { name: "Book Studio A — Live Room" }).getAttribute("href")).toBe(
      `/register?next=${encodeURIComponent("/customer/book?room=r1")}`,
    );
  });

  it("says so plainly when the catalogue cannot be loaded", async () => {
    catalogue.current = { rooms: [], engineers: [], services: [], packages: [], unavailable: true };
    await renderHome();
    expect(screen.getByText(/taking a moment to load/i)).toBeTruthy();
  });

  it("states the four promises in the hero, and shows no made-up availability", async () => {
    await renderHome();
    const promises = screen.getByRole("list", { name: "What every booking includes" });
    expect(within(promises).getAllByRole("listitem")).toHaveLength(4);
    expect(within(promises).getByText("Payment held by ONA")).toBeTruthy();
    // The illustrative calendar is gone: no times a visitor could take for free slots.
    expect(screen.queryByText(/^\d{2}:00$/)).toBeNull();
  });

  it("shows the staff-edited FAQ, and leaves the section out until answers load", async () => {
    const { unmount } = await renderHome();
    expect(screen.getByRole("region", { name: "Good to know before you book" })).toBeTruthy();
    expect(screen.getByText("How do I pay?")).toBeTruthy();
    unmount();
    faqs.current = null;
    await renderHome();
    expect(screen.queryByRole("region", { name: "Good to know before you book" })).toBeNull();
  });

  it("does not link to the deferred marketplace", async () => {
    await renderHome();
    expect(screen.queryByRole("link", { name: /find a professional|explore talent|post a/i })).toBeNull();
  });
});

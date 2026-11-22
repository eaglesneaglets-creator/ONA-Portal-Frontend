/**
 * The public footer: "Follow ONA" lists exactly the profiles staff entered,
 * and nothing when there are none. The footer is an async server component,
 * so the test renders what it resolves to.
 */

import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ContactDetails } from "@/lib/api/content";
import { SiteFooter } from "@/components/public/site-footer";

const contact = vi.hoisted(() => ({ current: null as ContactDetails | null }));

vi.mock("@/lib/api/content", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/content")>()),
  fetchContact: async () => contact.current,
}));

const BLANK: ContactDetails = {
  phone: "", whatsapp: "", email: "", address: "", directions_url: "",
  instagram_url: "", facebook_url: "", linkedin_url: "", tiktok_url: "", youtube_url: "",
};

beforeEach(() => {
  contact.current = { ...BLANK };
});

describe("SiteFooter", () => {
  it("lists ONA's profiles under Follow ONA, opening in a new tab", async () => {
    contact.current = { ...BLANK, linkedin_url: "https://www.linkedin.com/company/ona-records/", instagram_url: "https://www.instagram.com/ona/" };
    render(await SiteFooter());
    const follow = screen.getByRole("navigation", { name: "Follow ONA" });
    const links = within(follow).getAllByRole("link");
    expect(links.map((a) => a.textContent?.replace("(opens in a new tab)", ""))).toEqual(["Instagram", "LinkedIn"]);
    expect(links[1].getAttribute("href")).toBe("https://www.linkedin.com/company/ona-records/");
    expect(links[1].getAttribute("target")).toBe("_blank");
    expect(links[1].getAttribute("rel")).toContain("noopener");
  });

  it("leaves the column out when no profile is entered, or the API is down", async () => {
    const { unmount } = render(await SiteFooter());
    expect(screen.queryByRole("navigation", { name: "Follow ONA" })).toBeNull();
    unmount();
    contact.current = null;
    render(await SiteFooter());
    expect(screen.queryByRole("navigation", { name: "Follow ONA" })).toBeNull();
    expect(screen.getByText(/A recording studio in Tema/)).toBeTruthy();
  });
});

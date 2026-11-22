import { afterEach, describe, expect, it, vi } from "vitest";

import { socialProfiles } from "@/lib/api/content";

describe("socialProfiles", () => {
  it("lists only the profiles staff filled in, in display order", () => {
    expect(
      socialProfiles({
        linkedin_url: "https://www.linkedin.com/company/ona-records/",
        instagram_url: "https://www.instagram.com/ona/",
        facebook_url: "",
        tiktok_url: "",
        youtube_url: "",
      }),
    ).toEqual([
      { name: "Instagram", url: "https://www.instagram.com/ona/" },
      { name: "LinkedIn", url: "https://www.linkedin.com/company/ona-records/" },
    ]);
  });

  it("is empty without contact details", () => {
    expect(socialProfiles(null)).toEqual([]);
  });
});

describe("media URLs", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("puts the API's media path on the public API origin, optimised in production", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.onaplay.com/api/v1");
    const { mediaSrc, MEDIA_UNOPTIMIZED } = await import("@/lib/media");
    expect(mediaSrc("/api/v1/content/media/abc/")).toBe("https://api.onaplay.com/api/v1/content/media/abc/");
    expect(MEDIA_UNOPTIMIZED).toBe(false);
  });

  it("serves images as stored against a local API, which the optimiser refuses", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000/api/v1");
    const { mediaSrc, MEDIA_UNOPTIMIZED } = await import("@/lib/media");
    expect(mediaSrc("/api/v1/content/media/abc/")).toBe("http://localhost:8000/api/v1/content/media/abc/");
    expect(MEDIA_UNOPTIMIZED).toBe(true);
  });
});

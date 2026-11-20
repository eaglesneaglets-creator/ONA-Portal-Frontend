import { beforeEach, describe, expect, it, vi } from "vitest";

const forward = vi.fn<(req: Request) => Promise<Response>>(async () => new Response(null, { status: 200 }));
vi.mock("@sentry/nextjs/tunnel", () => ({ POST: (req: Request) => forward(req) }));

import { POST } from "../route";

function post(body: string, headers: Record<string, string> = {}) {
  return new Request("https://www.onaplay.com/monitoring", {
    method: "POST",
    headers: { "content-length": String(new TextEncoder().encode(body).length), ...headers },
    body,
  });
}

describe("Sentry tunnel", () => {
  beforeEach(() => forward.mockClear());

  it("forwards an envelope without the visitor's IP", async () => {
    const res = await POST(post('{"dsn":"x"}\n{}', {
      "x-forwarded-for": "41.66.1.1", "cf-connecting-ip": "41.66.1.1", "user-agent": "UA",
    }));
    expect(res.status).toBe(200);
    const sent = forward.mock.calls[0][0];
    expect(sent.headers.get("x-forwarded-for")).toBeNull();
    expect(sent.headers.get("cf-connecting-ip")).toBeNull();
    expect(sent.headers.get("user-agent")).toBe("UA");
    expect(await sent.text()).toBe('{"dsn":"x"}\n{}');
  });

  it("refuses bodies that are too big or have no length", async () => {
    expect((await POST(post("x", { "content-length": String(300 * 1024) }))).status).toBe(413);
    const noLength = new Request("https://www.onaplay.com/monitoring", { method: "POST", body: "x" });
    expect((await POST(noLength)).status).toBe(413);
    expect(forward).not.toHaveBeenCalled();
  });

  it("refuses a body bigger than its declared length", async () => {
    const big = "x".repeat(300 * 1024);
    expect((await POST(post(big, { "content-length": "10" }))).status).toBe(413);
  });
});

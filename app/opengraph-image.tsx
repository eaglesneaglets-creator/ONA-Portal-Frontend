import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { OG_IMAGE_ALT } from "@/lib/site";

/**
 * The preview card shown when an ONA link is shared on WhatsApp, X,
 * Facebook, LinkedIn or iMessage (1200×630, the size they all accept).
 * Every page uses it unless it sets its own.
 */
export const alt = OG_IMAGE_ALT;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logo = await readFile(join(process.cwd(), "public", "ona-icon.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          color: "white",
          background: "linear-gradient(135deg, #00108F 0%, #3a0f6e 55%, #C90007 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> */}
          <img src={logoSrc} width={96} height={96} alt="" style={{ borderRadius: 48, background: "white" }} />
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: 2 }}>ONA RECORDS</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>Book studio time in Accra</div>
          <div style={{ fontSize: 34, opacity: 0.9 }}>Recording rooms and engineers. Clear prices. Mobile Money.</div>
        </div>
      </div>
    ),
    size,
  );
}

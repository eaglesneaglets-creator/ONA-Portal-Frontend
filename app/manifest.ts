import type { MetadataRoute } from "next";

/** /manifest.webmanifest: the name and icon a phone uses when the site is added to the home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ONA Records",
    short_name: "ONA Records",
    description: "Book a recording room and engineer at ONA Records in Tema.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#00108F",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/ona-icon.png", sizes: "960x960", type: "image/png" },
    ],
  };
}

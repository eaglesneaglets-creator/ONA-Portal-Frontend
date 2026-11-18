import type { MetadataRoute } from "next";

/**
 * /robots.txt. Only production may be indexed; staging and previews say
 * "nothing here" so test bookings never turn up in search results. Even in
 * production the signed-in areas and account pages stay out.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_ENVIRONMENT !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/customer", "/pro", "/login", "/register", "/reset-password", "/forgot-password",
        "/verify-email", "/welcome", "/coming-soon"],
    },
  };
}

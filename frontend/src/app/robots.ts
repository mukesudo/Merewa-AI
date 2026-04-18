import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://merewa.vercel.app";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/settings/"],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}

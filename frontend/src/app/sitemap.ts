import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://merewa.vercel.app";

  return [
    {
      url: APP_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${APP_URL}/feed`,
      lastModified: new Date(),
      changeFrequency: "always",
      priority: 0.8,
    },
    {
      url: `${APP_URL}/search`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];
}

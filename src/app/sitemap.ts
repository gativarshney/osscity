import type { MetadataRoute } from "next";
import { SITE_URL } from "./layout";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/list`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
  ];
}

import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api",
          "/view",
          "/dashboard",
          "/profile",
          "/settings",
          "/my-uploads",
          "/my-requests",
          "/referrals",
          "/payment-history",
          "/resources/search",
        ],
      },
    ],
    sitemap: siteUrl("/sitemap.xml"),
  };
}

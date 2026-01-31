/**
 * RSS Feed
 *
 * Provides an RSS 2.0 feed of trending links with velocity data.
 * Optimized for AI/LLM consumption with structured descriptions.
 */

import { NextResponse } from "next/server";
import { getTrendingLinks } from "@/lib/queries";

export const dynamic = "force-dynamic"; // Render at request time (not build time)

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const links = await getTrendingLinks({ limit: 30, minVelocity: 2 });

  const items = links
    .map((link) => {
      const title = link.title || link.fallbackTitle || "Untitled";
      const displayTitle = escapeXml(title);
      const url = link.canonicalUrl;
      const pubDate = new Date(link.firstSeenAt).toUTCString();

      // Build structured description for AI consumption
      const descriptionParts = [
        link.aiSummary ? escapeXml(link.aiSummary) : "",
        "",
        `📊 Velocity: ${link.velocity} sources (${link.sourceNames.slice(0, 3).join(", ")})`,
        link.categoryName ? `📁 Category: ${link.categoryName}` : "",
        `🌐 Domain: ${link.domain}`,
        link.isTrending ? "🔥 Currently trending" : "",
      ]
        .filter(Boolean)
        .join("\n");

      return `
    <item>
      <title>${displayTitle}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${descriptionParts}]]></description>
      ${link.categoryName ? `<category>${escapeXml(link.categoryName)}</category>` : ""}
      <source url="https://dailybunch.com">Daily Bunch</source>
    </item>`;
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Daily Bunch</title>
    <link>https://dailybunch.com</link>
    <description>Cultural signal intelligence - what are tastemakers collectively pointing at right now?</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://dailybunch.com/feed.xml" rel="self" type="application/rss+xml"/>
    <ttl>60</ttl>
    ${items}
  </channel>
</rss>`;

  return new NextResponse(rss, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

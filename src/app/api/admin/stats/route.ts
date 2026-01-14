import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Fetch all stats in parallel
    const [
      totalLinks,
      pendingLinks,
      approvedLinks,
      featuredLinks,
      enrichedLinks,
      totalUsers,
      proUsers,
      newUsers24h,
      totalSubscribers,
      activeSubscribers,
      totalFeeds,
      activeFeeds,
      lastFetchedFeed,
      totalNewsletters,
      activeNewsletters,
    ] = await Promise.all([
      prisma.link.count(),
      prisma.link.count({ where: { status: "PENDING" } }),
      prisma.link.count({ where: { status: "APPROVED" } }),
      prisma.link.count({ where: { status: "FEATURED" } }),
      prisma.link.count({ where: { aiSummary: { not: null } } }),
      prisma.user.count(),
      prisma.user.count({ where: { isPro: true } }),
      prisma.user.count({ where: { createdAt: { gte: oneDayAgo } } }),
      prisma.subscriber.count(),
      prisma.subscriber.count({ where: { isActive: true } }),
      prisma.rssFeed.count(),
      prisma.rssFeed.count({ where: { isActive: true } }),
      prisma.rssFeed.findFirst({
        where: { lastFetchedAt: { not: null } },
        orderBy: { lastFetchedAt: "desc" },
        select: { lastFetchedAt: true },
      }),
      prisma.newsletter.count(),
      prisma.newsletter.count({ where: { isActive: true } }),
    ]);

    const stats = {
      links: {
        total: totalLinks,
        pending: pendingLinks,
        approved: approvedLinks,
        featured: featuredLinks,
        enriched: enrichedLinks,
      },
      users: {
        total: totalUsers,
        pro: proUsers,
        new24h: newUsers24h,
      },
      subscribers: {
        total: totalSubscribers,
        active: activeSubscribers,
      },
      feeds: {
        total: totalFeeds,
        active: activeFeeds,
        lastFetch: lastFetchedFeed?.lastFetchedAt?.toISOString() || null,
      },
      newsletters: {
        total: totalNewsletters,
        active: activeNewsletters,
      },
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

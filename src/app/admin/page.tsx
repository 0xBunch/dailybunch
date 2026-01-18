import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Rss, Users, FileText, Database, Zap, Mail } from "lucide-react";

async function getStats() {
  const [sources, entities, links, digests, mentions, subscribers] =
    await Promise.all([
      prisma.source.count(),
      prisma.entity.count({ where: { isActive: true } }),
      prisma.link.count(),
      prisma.digest.count(),
      prisma.mention.count(),
      prisma.subscriber.count({ where: { isActive: true } }),
    ]);

  const recentLinks = await prisma.link.count({
    where: {
      firstSeenAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
  });

  return { sources, entities, links, digests, mentions, subscribers, recentLinks };
}

export default async function AdminPage() {
  const stats = await getStats();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-foreground/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold">
              Daily Bunch
            </Link>
            <span className="text-sm text-foreground/50">Admin</span>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 text-sm bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Admin Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Database className="w-5 h-5" />}
            label="Total Links"
            value={stats.links}
          />
          <StatCard
            icon={<Zap className="w-5 h-5" />}
            label="Last 24h"
            value={stats.recentLinks}
          />
          <StatCard
            icon={<Rss className="w-5 h-5" />}
            label="Sources"
            value={stats.sources}
          />
          <StatCard
            icon={<Mail className="w-5 h-5" />}
            label="Subscribers"
            value={stats.subscribers}
          />
        </div>

        {/* Quick Actions */}
        <h2 className="text-lg font-medium mb-4">Manage</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <AdminLink
            href="/admin/sources"
            icon={<Rss className="w-6 h-6" />}
            title="Sources"
            description="Manage RSS feeds and newsletters"
            count={stats.sources}
          />
          <AdminLink
            href="/admin/entities"
            icon={<Users className="w-6 h-6" />}
            title="Entities"
            description="People, companies, and products"
            count={stats.entities}
          />
          <AdminLink
            href="/admin/digests"
            icon={<FileText className="w-6 h-6" />}
            title="Digests"
            description="View and send daily digests"
            count={stats.digests}
          />
        </div>

        {/* Quick Tools */}
        <h2 className="text-lg font-medium mb-4">Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ToolCard
            title="Fetch RSS Feeds"
            description="Manually trigger RSS feed fetch"
            endpoint="/api/cron/fetch-rss"
          />
          <ToolCard
            title="Analyze Links"
            description="Run AI analysis on unprocessed links"
            endpoint="/api/cron/analyze-links"
          />
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="p-4 border border-foreground/10 rounded-lg">
      <div className="flex items-center gap-2 text-foreground/50 mb-2">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
    </div>
  );
}

function AdminLink({
  href,
  icon,
  title,
  description,
  count,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className="p-6 border border-foreground/10 rounded-lg hover:border-foreground/30 transition-colors group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-foreground/5 rounded-lg group-hover:bg-foreground/10 transition-colors">
          {icon}
        </div>
        <span className="text-2xl font-bold">{count}</span>
      </div>
      <h3 className="font-medium mb-1">{title}</h3>
      <p className="text-sm text-foreground/50">{description}</p>
    </Link>
  );
}

function ToolCard({
  title,
  description,
  endpoint,
}: {
  title: string;
  description: string;
  endpoint: string;
}) {
  return (
    <div className="p-4 border border-foreground/10 rounded-lg">
      <h3 className="font-medium mb-1">{title}</h3>
      <p className="text-sm text-foreground/50 mb-3">{description}</p>
      <form
        action={async () => {
          "use server";
          const secret = process.env.CRON_SECRET;
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}${endpoint}`, {
            headers: {
              Authorization: `Bearer ${secret}`,
            },
          });
        }}
      >
        <button
          type="submit"
          className="px-4 py-2 text-sm bg-foreground/5 rounded-lg hover:bg-foreground/10 transition-colors"
        >
          Run Now
        </button>
      </form>
    </div>
  );
}

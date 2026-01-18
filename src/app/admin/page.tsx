/**
 * Admin Landing Page
 *
 * Links to admin sections.
 */

import prisma from "@/lib/db";
import Link from "next/link";

export default async function AdminPage() {
  // Get counts for overview
  const [linkCount, sourceCount, entityCount, pendingSuggestions, unanalyzedCount] =
    await Promise.all([
      prisma.link.count(),
      prisma.source.count({ where: { active: true } }),
      prisma.entity.count({ where: { active: true } }),
      prisma.entitySuggestion.count({ where: { status: "pending" } }),
      prisma.link.count({ where: { aiAnalyzedAt: null, title: { not: null } } }),
    ]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl">Daily Bunch</h1>
          <nav className="flex gap-6 text-sm">
            <Link href="/dashboard" className="text-neutral-600 hover:text-neutral-900">
              Scoreboard
            </Link>
            <Link href="/links" className="text-neutral-600 hover:text-neutral-900">
              All Links
            </Link>
            <Link href="/links/new" className="text-neutral-600 hover:text-neutral-900">
              Add Link
            </Link>
            <Link href="/admin" className="font-medium underline underline-offset-4">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="font-serif text-3xl mb-8">Admin</h2>

        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-6 mb-12">
          <div className="border border-neutral-200 p-4">
            <p className="text-3xl font-serif">{linkCount.toLocaleString()}</p>
            <p className="text-sm text-neutral-500">Total Links</p>
          </div>
          <div className="border border-neutral-200 p-4">
            <p className="text-3xl font-serif">{sourceCount}</p>
            <p className="text-sm text-neutral-500">Active Sources</p>
          </div>
          <div className="border border-neutral-200 p-4">
            <p className="text-3xl font-serif">{entityCount}</p>
            <p className="text-sm text-neutral-500">Entities</p>
          </div>
          <div className="border border-neutral-200 p-4">
            <p className="text-3xl font-serif">{unanalyzedCount}</p>
            <p className="text-sm text-neutral-500">Pending AI Analysis</p>
          </div>
        </div>

        {/* Admin Sections */}
        <div className="space-y-4">
          <Link
            href="/admin/sources"
            className="block border border-neutral-200 p-4 hover:bg-neutral-50"
          >
            <h3 className="font-medium">Sources</h3>
            <p className="text-sm text-neutral-500">
              Manage newsletter and RSS feed sources
            </p>
          </Link>

          <Link
            href="/admin/entities"
            className="block border border-neutral-200 p-4 hover:bg-neutral-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Entities</h3>
                <p className="text-sm text-neutral-500">
                  Manage people, organizations, and products
                </p>
              </div>
              {pendingSuggestions > 0 && (
                <span className="bg-neutral-900 text-white text-xs px-2 py-0.5">
                  {pendingSuggestions} pending
                </span>
              )}
            </div>
          </Link>

          <Link
            href="/admin/blacklist"
            className="block border border-neutral-200 p-4 hover:bg-neutral-50"
          >
            <h3 className="font-medium">Blacklist</h3>
            <p className="text-sm text-neutral-500">
              Domains and URLs to ignore
            </p>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="mt-12 pt-8 border-t border-neutral-200">
          <h3 className="font-medium mb-4">Quick Actions</h3>
          <div className="flex gap-4">
            <form action="/api/ingest/poll" method="POST">
              <button
                type="submit"
                className="text-sm bg-neutral-100 px-4 py-2 hover:bg-neutral-200"
              >
                Trigger RSS Poll
              </button>
            </form>
            <form action="/api/cron/analyze" method="POST">
              <button
                type="submit"
                className="text-sm bg-neutral-100 px-4 py-2 hover:bg-neutral-200"
              >
                Run AI Analysis ({unanalyzedCount} pending)
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

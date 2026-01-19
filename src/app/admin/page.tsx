/**
 * Admin Landing Page
 *
 * Links to admin sections.
 */

import prisma from "@/lib/db";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // Get counts for overview
  const [linkCount, sourceCount, entityCount, pendingSuggestions, unanalyzedCount, untitledCount] =
    await Promise.all([
      prisma.link.count(),
      prisma.source.count({ where: { active: true } }),
      prisma.entity.count({ where: { active: true } }),
      prisma.entitySuggestion.count({ where: { status: "pending" } }),
      prisma.link.count({ where: { aiAnalyzedAt: null, title: { not: null } } }),
      prisma.link.count({ where: { title: null } }),
    ]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1><Link href="/" className="text-2xl hover:text-neutral-700 !text-neutral-900 !no-underline">Daily Bunch</Link></h1>
          <nav className="flex gap-6 text-sm">
            <Link href="/links" className="text-neutral-600 hover:text-neutral-900">
              Home
            </Link>
            <Link href="/dashboard" className="text-neutral-600 hover:text-neutral-900">
              Feed
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
        <div className="grid grid-cols-5 gap-6 mb-12">
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
          <div className="border border-neutral-200 p-4">
            <p className="text-3xl font-serif">{untitledCount}</p>
            <p className="text-sm text-neutral-500">Untitled Links</p>
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
          <div className="flex flex-wrap gap-4">
            <form action="/api/ingest/poll" method="POST">
              <button
                type="submit"
                className="text-sm bg-neutral-100 px-4 py-2 hover:bg-neutral-200"
              >
                Trigger RSS Poll
              </button>
            </form>
{unanalyzedCount > 0 && (
              <form action="/api/admin/analyze-all" method="POST">
                <button
                  type="submit"
                  className="text-sm bg-blue-100 text-blue-800 px-4 py-2 hover:bg-blue-200"
                >
                  Analyze All ({unanalyzedCount} pending)
                </button>
              </form>
            )}
            {untitledCount > 0 && (
              <form action="/api/admin/links/refetch-titles" method="POST">
                <button
                  type="submit"
                  className="text-sm bg-neutral-100 px-4 py-2 hover:bg-neutral-200"
                >
                  Refetch Titles ({untitledCount} untitled)
                </button>
              </form>
            )}
            <form action="/api/admin/links/cleanup" method="POST">
              <button
                type="submit"
                className="text-sm bg-red-100 text-red-800 px-4 py-2 hover:bg-red-200"
              >
                Purge Source-Domain Links
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

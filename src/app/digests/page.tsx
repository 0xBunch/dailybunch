/**
 * Digests List Page
 *
 * View all created digests.
 */

import prisma from "@/lib/db";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function DigestsPage() {
  const digests = await prisma.digest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
    },
    take: 50,
  });

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
            <Link href="/digests" className="font-medium underline underline-offset-4">
              Digests
            </Link>
            <Link href="/weekly-review" className="text-neutral-600 hover:text-neutral-900">
              Weekly Review
            </Link>
            <Link href="/admin" className="text-neutral-600 hover:text-neutral-900">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-serif text-3xl">Digests</h2>
          <Link
            href="/digests/new"
            className="bg-neutral-900 text-white text-sm px-4 py-2 hover:bg-neutral-800"
          >
            New Digest
          </Link>
        </div>

        {digests.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            <p>No digests yet.</p>
            <p className="text-sm mt-2">
              <Link href="/digests/new" className="underline">
                Create your first digest
              </Link>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {digests.map((digest) => (
              <Link
                key={digest.id}
                href={`/digests/${digest.id}`}
                className="block border border-neutral-200 p-4 hover:bg-neutral-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{digest.headline}</h3>
                    <p className="text-sm text-neutral-500">
                      {digest.items.length} links ·{" "}
                      {digest.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  {digest.sentAt ? (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5">
                      Sent{" "}
                      {digest.sentAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  ) : (
                    <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5">
                      Draft
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

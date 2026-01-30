/**
 * Weekly Review List Page
 *
 * View all generated weekly reviews.
 */

import prisma from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function WeeklyReviewListPage() {
  const reviews = await prisma.weeklyReview.findMany({
    orderBy: { weekOf: "desc" },
    include: {
      sources: true,
    },
    take: 50,
  });

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1>
            <Link
              href="/"
              className="text-2xl hover:text-neutral-700 !text-neutral-900 !no-underline"
            >
              Daily Bunch
            </Link>
          </h1>
          <nav className="flex gap-6 text-sm">
            <Link href="/links" className="text-neutral-600 hover:text-neutral-900">
              Home
            </Link>
            <Link href="/dashboard" className="text-neutral-600 hover:text-neutral-900">
              Feed
            </Link>
            <Link href="/digests" className="text-neutral-600 hover:text-neutral-900">
              Digests
            </Link>
            <Link
              href="/weekly-review"
              className="font-medium underline underline-offset-4"
            >
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
          <div>
            <h2 className="font-serif text-3xl">Weekly Review</h2>
            <p className="text-neutral-500 text-sm mt-1">
              Harper&apos;s-style news digests
            </p>
          </div>
          <Link
            href="/weekly-review/new"
            className="bg-neutral-900 text-white text-sm px-4 py-2 hover:bg-neutral-800"
          >
            Generate New
          </Link>
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            <p>No weekly reviews yet.</p>
            <p className="text-sm mt-2">
              <Link href="/weekly-review/new" className="underline">
                Generate your first review
              </Link>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Link
                key={review.id}
                href={`/weekly-review/${review.id}`}
                className="block border border-neutral-200 p-4 hover:bg-neutral-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        Week of{" "}
                        {review.weekOf.toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-600 line-clamp-2">
                      {review.content.replace(/<[^>]*>/g, "").substring(0, 200)}...
                    </p>
                    <p className="text-xs text-neutral-400 mt-2">
                      {review.sources.length} sources ·{" "}
                      {review.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {review.status === "published" ? (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5">
                        Published
                      </span>
                    ) : review.status === "edited" ? (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5">
                        Edited
                      </span>
                    ) : (
                      <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5">
                        Draft
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

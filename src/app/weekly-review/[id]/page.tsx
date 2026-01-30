"use client";

/**
 * Weekly Review Detail Page
 *
 * View, edit, and send a weekly review.
 */

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Source {
  footnoteNumber: number;
  linkId: string;
  url: string;
  title: string | null;
  domain: string;
  category: string | null;
  claimText: string | null;
}

interface WeeklyReview {
  id: string;
  weekOf: string;
  content: string;
  status: string;
  byline: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  sources: Source[];
}

export default function WeeklyReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [recipients, setRecipients] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/weekly-review/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setReview(data.review);
          setEditedContent(data.review.content);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load review");
        setLoading(false);
      });
  }, [id]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/weekly-review/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editedContent,
          status: "edited",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save");
      }

      setReview((prev) =>
        prev
          ? {
              ...prev,
              content: editedContent,
              status: "edited",
              updatedAt: new Date().toISOString(),
            }
          : null
      );
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = async () => {
    if (!recipients.trim()) {
      setError("Enter at least one email address");
      return;
    }

    const emails = recipients
      .split(/[,\n]/)
      .map((e) => e.trim())
      .filter((e) => e);

    if (emails.length === 0) {
      setError("Enter at least one email address");
      return;
    }

    setIsSending(true);
    setError(null);
    setSendSuccess(null);

    try {
      const response = await fetch(`/api/weekly-review/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: emails }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send");
      }

      setSendSuccess(`Sent to ${emails.length} recipient(s)`);
      setReview((prev) =>
        prev
          ? { ...prev, status: "published", publishedAt: new Date().toISOString() }
          : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this weekly review?")) return;

    setIsDeleting(true);

    try {
      await fetch(`/api/weekly-review/${id}`, { method: "DELETE" });
      router.push("/weekly-review");
    } catch {
      setError("Failed to delete review");
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-neutral-500">Loading...</p>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-500">{error || "Review not found"}</p>
          <Link href="/weekly-review" className="text-sm underline mt-2 block">
            Back to weekly reviews
          </Link>
        </div>
      </div>
    );
  }

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
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="font-serif text-3xl">Weekly Review</h2>
            <p className="text-neutral-500">
              Week of{" "}
              {new Date(review.weekOf).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              {review.publishedAt && (
                <span className="ml-2 text-green-600">
                  · Published{" "}
                  {new Date(review.publishedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {review.status === "published" ? (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1">
                Published
              </span>
            ) : review.status === "edited" ? (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1">
                Edited
              </span>
            ) : (
              <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1">
                Draft
              </span>
            )}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="border border-neutral-200 mb-8">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2 bg-neutral-50">
            <h3 className="font-medium text-sm">Content</h3>
            <button
              onClick={() => {
                if (isEditing) {
                  setEditedContent(review.content);
                }
                setIsEditing(!isEditing);
              }}
              className="text-sm text-neutral-600 hover:text-neutral-900"
            >
              {isEditing ? "Cancel" : "Edit"}
            </button>
          </div>

          {isEditing ? (
            <div className="p-4">
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={15}
                className="w-full font-serif text-base leading-relaxed focus:outline-none resize-none border border-neutral-200 p-4"
              />
              <div className="mt-4">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-neutral-900 text-white text-sm px-6 py-2 hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          ) : (
            <div
              className="p-6 font-serif text-base leading-relaxed text-justify"
              dangerouslySetInnerHTML={{ __html: review.content }}
            />
          )}
        </div>

        {/* Sources */}
        <div className="border border-neutral-200 mb-8">
          <div className="border-b border-neutral-200 px-4 py-2 bg-neutral-50">
            <h3 className="font-medium text-sm">
              Sources ({review.sources.length})
            </h3>
          </div>
          <div className="divide-y divide-neutral-100">
            {review.sources.map((source) => (
              <div key={source.footnoteNumber} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="font-medium text-neutral-400 text-sm">
                    [{source.footnoteNumber}]
                  </span>
                  <div className="flex-1 min-w-0">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-900 hover:underline font-medium"
                    >
                      {source.title || source.domain}
                    </a>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {source.domain}
                      {source.category && ` · ${source.category}`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Send */}
        <div className="border border-neutral-200 p-6">
          <h3 className="font-medium mb-4">Send via Email</h3>

          {sendSuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-sm text-green-800">
              {sendSuccess}
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="recipients"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Recipients (one per line or comma-separated)
            </label>
            <textarea
              id="recipients"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="email@example.com"
              rows={3}
              className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-neutral-900"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={isSending}
            className="bg-neutral-900 text-white text-sm px-6 py-2 hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
          >
            {isSending ? "Sending..." : "Send Email"}
          </button>
        </div>
      </main>
    </div>
  );
}

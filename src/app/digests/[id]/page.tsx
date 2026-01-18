"use client";

/**
 * Digest Detail Page
 *
 * View and send a digest.
 */

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface DigestItem {
  id: string;
  position: number;
  headline: string | null;
  link: {
    id: string;
    title: string | null;
    canonicalUrl: string;
    domain: string;
    aiSummary: string | null;
    category: string | null;
    velocity: number;
    sources: string[];
  };
}

interface Digest {
  id: string;
  title: string;
  createdAt: string;
  sentAt: string | null;
  items: DigestItem[];
}

export default function DigestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [recipients, setRecipients] = useState("");
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/digests/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setDigest(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load digest");
        setLoading(false);
      });
  }, [id]);

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
      const response = await fetch(`/api/digests/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: emails }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send");
      }

      setSendSuccess(`Sent to ${emails.length} recipient(s)`);
      setDigest((prev) => (prev ? { ...prev, sentAt: new Date().toISOString() } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this digest?")) return;

    setIsDeleting(true);

    try {
      await fetch(`/api/digests/${id}`, { method: "DELETE" });
      router.push("/digests");
    } catch {
      setError("Failed to delete digest");
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

  if (!digest) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-500">{error || "Digest not found"}</p>
          <Link href="/digests" className="text-sm underline mt-2 block">
            Back to digests
          </Link>
        </div>
      </div>
    );
  }

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
            <Link href="/digests" className="font-medium underline underline-offset-4">
              Digests
            </Link>
            <Link href="/admin" className="text-neutral-600 hover:text-neutral-900">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="font-serif text-3xl">{digest.title}</h2>
            <p className="text-neutral-500">
              {new Date(digest.createdAt).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {digest.sentAt && (
                <span className="ml-2 text-green-600">
                  · Sent{" "}
                  {new Date(digest.sentAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>

        {/* Send section */}
        <div className="mb-8 border border-neutral-200 p-6">
          <h3 className="font-medium mb-4">Send Digest</h3>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-sm text-red-800">
              {error}
            </div>
          )}

          {sendSuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-sm text-green-800">
              {sendSuccess}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="recipients" className="block text-sm font-medium text-neutral-700 mb-1">
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

        {/* Items */}
        <h3 className="font-medium mb-4">{digest.items.length} Links</h3>
        <div className="border border-neutral-200 divide-y divide-neutral-200">
          {digest.items.map((item, index) => (
            <div key={item.id} className="p-4">
              <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
                <span className="font-medium">{index + 1}.</span>
                {item.link.category && (
                  <span className="bg-neutral-100 px-1.5 py-0.5">
                    {item.link.category}
                  </span>
                )}
                <span>{item.link.domain}</span>
                {item.link.velocity > 1 && (
                  <span>{item.link.velocity} sources</span>
                )}
              </div>
              <h4 className="font-serif text-lg leading-tight">
                <a
                  href={item.link.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {item.headline || item.link.title || "Untitled"}
                </a>
              </h4>
              {item.link.aiSummary && (
                <p className="text-sm text-neutral-600 mt-1">
                  {item.link.aiSummary}
                </p>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

"use client";

/**
 * New Digest Page
 *
 * Select links and create a new digest.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface LinkData {
  id: string;
  title: string | null;
  canonicalUrl: string;
  domain: string;
  aiSummary: string | null;
  category: { name: string } | null;
  velocity: number;
  sources: string[];
}

export default function NewDigestPage() {
  const router = useRouter();
  const [links, setLinks] = useState<LinkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch recent high-velocity links
    fetch("/api/links?sort=velocity&limit=50")
      .then((res) => res.json())
      .then((data) => {
        setLinks(data.links || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load links");
        setLoading(false);
      });
  }, []);

  const toggleLink = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (selectedIds.size === 0) {
      setError("Select at least one link");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/digests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || undefined,
          linkIds: Array.from(selectedIds),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create digest");
      }

      router.push(`/digests/${data.digest.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsCreating(false);
    }
  };

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
            <Link href="/admin" className="text-neutral-600 hover:text-neutral-900">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="font-serif text-3xl mb-2">New Digest</h2>
        <p className="text-neutral-600 mb-8">
          Select links to include in your digest.
        </p>

        {/* Title input */}
        <div className="mb-8">
          <label htmlFor="title" className="block text-sm font-medium text-neutral-700 mb-1">
            Title (optional)
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`Digest - ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
            className="w-full border border-neutral-300 px-3 py-2 focus:outline-none focus:border-neutral-900"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Selection summary */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-neutral-600">
            {selectedIds.size} link{selectedIds.size !== 1 ? "s" : ""} selected
          </p>
          <button
            onClick={handleCreate}
            disabled={isCreating || selectedIds.size === 0}
            className="bg-neutral-900 text-white text-sm px-6 py-2 hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
          >
            {isCreating ? "Creating..." : "Create Digest"}
          </button>
        </div>

        {/* Links list */}
        {loading ? (
          <p className="text-neutral-500">Loading links...</p>
        ) : links.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            <p>No links available.</p>
            <p className="text-sm mt-2">
              <Link href="/links/new" className="underline">
                Add some links first
              </Link>
            </p>
          </div>
        ) : (
          <div className="border border-neutral-200 divide-y divide-neutral-200">
            {links.map((link) => (
              <label
                key={link.id}
                className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-neutral-50 ${
                  selectedIds.has(link.id) ? "bg-neutral-50" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(link.id)}
                  onChange={() => toggleLink(link.id)}
                  className="mt-1 h-4 w-4 border-neutral-300 text-neutral-900 focus:ring-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
                    {link.category && (
                      <span className="bg-neutral-100 px-1.5 py-0.5">
                        {link.category.name}
                      </span>
                    )}
                    <span>{link.domain}</span>
                    {link.velocity > 1 && (
                      <span className="font-medium">{link.velocity} sources</span>
                    )}
                  </div>
                  <h3 className="font-serif text-lg leading-tight">
                    {link.title || "Untitled"}
                  </h3>
                  {link.aiSummary && (
                    <p className="text-sm text-neutral-600 mt-1 line-clamp-2">
                      {link.aiSummary}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

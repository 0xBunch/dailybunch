"use client";

/**
 * Manual Link Entry Page
 *
 * Add any URL for immediate processing.
 * Shows real-time processing status.
 */

import { useState } from "react";
import Link from "next/link";

interface ProcessResult {
  status: "exists" | "created";
  link: {
    id: string;
    canonicalUrl: string;
    originalUrl: string;
    domain: string;
    title: string | null;
    description: string | null;
    imageUrl: string | null;
    aiSummary: string | null;
    category: { name: string } | null;
    subcategory: { name: string } | null;
    entities: Array<{ name: string; type: string }>;
    velocity: number;
    sources: string[];
    firstSeenAt: string;
    lastSeenAt: string;
  };
  redirectChain: string[];
  message?: string;
}

export default function NewLinkPage() {
  const [url, setUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setIsProcessing(true);

    try {
      const response = await fetch("/api/links/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process link");
      }

      setResult(data);
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsProcessing(false);
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
            <Link href="/links/new" className="font-medium underline underline-offset-4">
              Add Link
            </Link>
            <Link href="/admin" className="text-neutral-600 hover:text-neutral-900">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <h2 className="font-serif text-3xl mb-2">Add Link</h2>
        <p className="text-neutral-600 mb-8">
          Paste any URL to process it immediately. We&apos;ll follow redirects, clean tracking parameters, and fetch metadata.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-neutral-700 mb-1">
              URL
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              required
              className="w-full border border-neutral-300 rounded-none px-3 py-2 text-lg focus:outline-none focus:border-neutral-900"
            />
          </div>

          <button
            type="submit"
            disabled={isProcessing || !url}
            className="bg-neutral-900 text-white px-6 py-2 text-sm font-medium hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
          >
            {isProcessing ? "Processing..." : "Process Link"}
          </button>
        </form>

        {/* Error display */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Result display */}
        {result && (
          <div className="mt-8 border border-neutral-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              {result.status === "exists" ? (
                <span className="text-xs bg-neutral-100 px-2 py-0.5">EXISTING</span>
              ) : (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5">NEW</span>
              )}
              {result.message && (
                <span className="text-xs text-neutral-500">{result.message}</span>
              )}
            </div>

            <h3 className="font-serif text-xl mb-2">
              <a
                href={result.link.canonicalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {result.link.title || "Untitled"}
              </a>
            </h3>

            <p className="text-sm text-neutral-500 mb-4">{result.link.domain}</p>

            {result.link.description && (
              <p className="text-sm text-neutral-600 mb-4">{result.link.description}</p>
            )}

            {/* Redirect chain */}
            {result.redirectChain.length > 1 && (
              <div className="mb-4">
                <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
                  Redirect Chain
                </h4>
                <div className="space-y-1">
                  {result.redirectChain.map((hop, i) => (
                    <div key={i} className="text-xs font-mono text-neutral-600 truncate">
                      {i > 0 && <span className="text-neutral-400 mr-2">→</span>}
                      {hop}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Canonical URL */}
            <div className="mb-4">
              <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
                Canonical URL
              </h4>
              <p className="text-xs font-mono text-neutral-600 break-all">
                {result.link.canonicalUrl}
              </p>
            </div>

            {/* Category/Entities if analyzed */}
            {result.link.category && (
              <div className="mb-4">
                <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
                  Category
                </h4>
                <p className="text-sm">
                  {result.link.category.name}
                  {result.link.subcategory && ` / ${result.link.subcategory.name}`}
                </p>
              </div>
            )}

            {result.link.entities.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
                  Entities
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.link.entities.map((entity) => (
                    <span
                      key={entity.name}
                      className="text-xs bg-neutral-100 px-2 py-0.5"
                    >
                      {entity.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.link.velocity > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
                  Sources ({result.link.velocity})
                </h4>
                <p className="text-sm text-neutral-600">
                  {result.link.sources.join(", ")}
                </p>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-neutral-100">
              <Link
                href="/links"
                className="text-sm text-neutral-600 hover:text-neutral-900 underline underline-offset-2"
              >
                View all links
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

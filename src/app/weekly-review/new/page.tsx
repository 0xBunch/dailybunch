"use client";

/**
 * Generate Weekly Review Page
 *
 * Configure and generate a new Harper's-style weekly review.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Source {
  footnoteNumber: number;
  linkId: string;
  url: string;
  title: string;
  claimText?: string;
}

interface GenerateResult {
  content: string;
  sources: Source[];
  weekOf: string;
  linksUsed: number;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export default function NewWeeklyReviewPage() {
  const router = useRouter();
  const [days, setDays] = useState(7);
  const [minVelocity, setMinVelocity] = useState(2);
  const [maxLinks, setMaxLinks] = useState(15);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<GenerateResult | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setResult(null);

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    try {
      const response = await fetch("/api/weekly-review/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          minVelocity,
          maxLinks,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.suggestion || "Failed to generate");
      }

      setResult(data);
      setEditedContent(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/weekly-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekOf: result.weekOf,
          content: isEditing ? editedContent : result.content,
          sources: result.sources.map((s) => ({
            linkId: s.linkId,
            footnoteNumber: s.footnoteNumber,
            claimText: s.claimText,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save");
      }

      router.push(`/weekly-review/${data.review.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsSaving(false);
    }
  };

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
        <h2 className="font-serif text-3xl mb-2">Generate Weekly Review</h2>
        <p className="text-neutral-600 mb-8">
          Create a Harper&apos;s-style news digest from high-velocity links.
        </p>

        {/* Configuration */}
        <div className="border border-neutral-200 p-6 mb-8">
          <h3 className="font-medium mb-4">Configuration</h3>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <label
                htmlFor="days"
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                Days to look back
              </label>
              <input
                type="number"
                id="days"
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value) || 7)}
                min={1}
                max={30}
                className="w-full border border-neutral-300 px-3 py-2 focus:outline-none focus:border-neutral-900"
              />
            </div>

            <div>
              <label
                htmlFor="minVelocity"
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                Min velocity
              </label>
              <input
                type="number"
                id="minVelocity"
                value={minVelocity}
                onChange={(e) => setMinVelocity(parseInt(e.target.value) || 1)}
                min={1}
                max={10}
                className="w-full border border-neutral-300 px-3 py-2 focus:outline-none focus:border-neutral-900"
              />
            </div>

            <div>
              <label
                htmlFor="maxLinks"
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                Max links
              </label>
              <input
                type="number"
                id="maxLinks"
                value={maxLinks}
                onChange={(e) => setMaxLinks(parseInt(e.target.value) || 15)}
                min={5}
                max={30}
                className="w-full border border-neutral-300 px-3 py-2 focus:outline-none focus:border-neutral-900"
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="mt-6 bg-neutral-900 text-white text-sm px-6 py-2 hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
          >
            {isGenerating ? "Generating..." : "Generate Review"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <>
            {/* Stats */}
            <div className="mb-6 flex items-center gap-4 text-sm text-neutral-500">
              <span>{result.linksUsed} links used</span>
              <span>·</span>
              <span>{result.sources.length} footnotes</span>
              <span>·</span>
              <span>
                {result.usage.inputTokens + result.usage.outputTokens} tokens
              </span>
            </div>

            {/* Content */}
            <div className="border border-neutral-200 mb-6">
              <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2 bg-neutral-50">
                <h3 className="font-medium text-sm">Generated Content</h3>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-sm text-neutral-600 hover:text-neutral-900"
                >
                  {isEditing ? "Preview" : "Edit"}
                </button>
              </div>

              {isEditing ? (
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={15}
                  className="w-full p-4 font-serif text-base leading-relaxed focus:outline-none resize-none"
                />
              ) : (
                <div
                  className="p-6 font-serif text-base leading-relaxed text-justify"
                  dangerouslySetInnerHTML={{
                    __html: isEditing ? editedContent : result.content,
                  }}
                />
              )}
            </div>

            {/* Sources */}
            <div className="border border-neutral-200 mb-8">
              <div className="border-b border-neutral-200 px-4 py-2 bg-neutral-50">
                <h3 className="font-medium text-sm">Sources</h3>
              </div>
              <div className="divide-y divide-neutral-100">
                {result.sources.map((source) => (
                  <div key={source.footnoteNumber} className="px-4 py-2 text-sm">
                    <span className="font-medium text-neutral-500 mr-2">
                      [{source.footnoteNumber}]
                    </span>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-900 hover:underline"
                    >
                      {source.title || source.url}
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-neutral-900 text-white text-sm px-6 py-2 hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save Draft"}
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="text-sm text-neutral-600 hover:text-neutral-900"
              >
                Regenerate
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

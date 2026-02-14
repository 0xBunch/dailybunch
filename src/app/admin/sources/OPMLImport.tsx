"use client";

/**
 * Simple OPML Import Component
 *
 * Minimal component that adds OPML import to the existing sources page.
 */

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export function OPMLImport() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImport = async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/sources/import-opml", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Import failed");
      } else {
        setResult({ imported: data.imported, skipped: data.skipped });
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4">
      <input
        ref={inputRef}
        type="file"
        accept=".opml,.xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImport(file);
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="px-4 py-2 text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{
          background: "var(--surface-cream)",
          color: "var(--ink)",
          border: "1px solid var(--border)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {loading ? "Importing..." : "Import OPML"}
      </button>

      {result && (
        <span className="text-sm" style={{ color: "var(--status-success)" }}>
          Imported {result.imported} feeds ({result.skipped} skipped)
        </span>
      )}

      {error && (
        <span className="text-sm" style={{ color: "var(--status-error)" }}>
          {error}
        </span>
      )}
    </div>
  );
}

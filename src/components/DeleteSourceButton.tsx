"use client";

/**
 * DeleteSourceButton Component
 *
 * Client component for deleting a source with confirmation.
 * Deletes the source and all links that came exclusively from it.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DeleteSourceButtonProps {
  sourceId: string;
  sourceName: string;
  mentionCount: number;
}

export function DeleteSourceButton({
  sourceId,
  sourceName,
  mentionCount,
}: DeleteSourceButtonProps) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/sources/${sourceId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(`Failed to delete: ${data.error || "Unknown error"}`);
        return;
      }

      const result = await response.json();
      alert(
        `Deleted "${result.deletedSource}" and ${result.deletedLinks} orphaned links`
      );
      router.refresh();
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsDeleting(false);
      setIsConfirming(false);
    }
  };

  if (isConfirming) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="text-xs"
          style={{ color: "var(--status-error)", fontFamily: "var(--font-mono)" }}
        >
          Delete {mentionCount} links?
        </span>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-xs px-2 py-1 transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{
            fontFamily: "var(--font-mono)",
            background: "var(--status-error)",
            color: "#fff",
            border: "none",
          }}
        >
          {isDeleting ? "..." : "Yes"}
        </button>
        <button
          onClick={() => setIsConfirming(false)}
          disabled={isDeleting}
          className="text-xs px-2 py-1 transition-opacity hover:opacity-80"
          style={{
            fontFamily: "var(--font-mono)",
            background: "transparent",
            color: "var(--muted)",
            border: "1px solid var(--border)",
          }}
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsConfirming(true)}
      className="text-xs px-2 py-1 transition-opacity hover:opacity-80"
      style={{
        fontFamily: "var(--font-mono)",
        background: "transparent",
        color: "var(--status-error)",
        border: "1px solid var(--status-error)",
      }}
      title={`Delete ${sourceName} and all its exclusive links`}
    >
      Delete
    </button>
  );
}

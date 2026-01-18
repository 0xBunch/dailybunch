"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn, formatDate } from "@/lib/utils";
import { ArrowLeft, Eye, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DigestItem {
  id: string;
  note: string | null;
  position: number;
  link: {
    id: string;
    title: string | null;
    domain: string;
    url: string;
  };
}

interface Digest {
  id: string;
  headline: string;
  status: "DRAFT" | "SCHEDULED" | "SENT";
  sentAt: string | null;
  createdAt: string;
  items: DigestItem[];
}

export default function DigestsPage() {
  const [digests, setDigests] = useState<Digest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDigests();
  }, []);

  async function fetchDigests() {
    setLoading(true);
    try {
      const res = await fetch("/api/digests");
      const data = await res.json();
      setDigests(data.digests || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to fetch digests");
    } finally {
      setLoading(false);
    }
  }

  async function deleteDigest(id: string) {
    if (!confirm("Delete this digest?")) return;

    try {
      const res = await fetch(`/api/digests/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Digest deleted");
      fetchDigests();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to delete digest");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-foreground/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/admin"
            className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">Digests</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12 text-foreground/50">Loading...</div>
        ) : digests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-foreground/50 mb-4">No digests yet.</p>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium"
            >
              Create your first digest
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {digests.map((digest) => (
              <div
                key={digest.id}
                className="p-4 border border-foreground/10 rounded-lg"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-medium">{digest.headline}</h3>
                    <div className="text-sm text-foreground/50">
                      {formatDate(digest.createdAt)} &middot;{" "}
                      {digest.items.length} links
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "px-2 py-1 text-xs rounded",
                        digest.status === "DRAFT" && "bg-foreground/10",
                        digest.status === "SCHEDULED" && "bg-yellow-500/20 text-yellow-600",
                        digest.status === "SENT" && "bg-green-500/20 text-green-600"
                      )}
                    >
                      {digest.status}
                    </span>
                  </div>
                </div>

                {/* Items preview */}
                <div className="space-y-1 mb-4">
                  {digest.items.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="text-sm text-foreground/70 truncate"
                    >
                      &bull; {item.link.title || item.link.domain}
                    </div>
                  ))}
                  {digest.items.length > 3 && (
                    <div className="text-sm text-foreground/50">
                      +{digest.items.length - 3} more
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/digests/${digest.id}`}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-foreground/5 rounded-lg hover:bg-foreground/10 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </Link>
                  {digest.status === "DRAFT" && (
                    <Link
                      href={`/admin/digests/${digest.id}?send=true`}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
                    >
                      <Send className="w-4 h-4" />
                      Send
                    </Link>
                  )}
                  <button
                    onClick={() => deleteDigest(digest.id)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

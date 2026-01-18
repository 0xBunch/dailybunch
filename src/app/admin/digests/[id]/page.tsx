"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Send, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface DigestItem {
  id: string;
  note: string | null;
  position: number;
  link: {
    id: string;
    title: string | null;
    domain: string;
    url: string;
    aiSummary: string | null;
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

export default function DigestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchDigest();
  }, [id]);

  async function fetchDigest() {
    setLoading(true);
    try {
      const res = await fetch(`/api/digests/${id}`);
      const data = await res.json();
      setDigest(data.digest);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to fetch digest");
    } finally {
      setLoading(false);
    }
  }

  async function sendDigest() {
    if (!confirm("Send this digest to all subscribers?")) return;

    setSending(true);
    try {
      const res = await fetch(`/api/digests/${id}/send`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send");
      }

      const data = await res.json();
      toast.success(`Digest sent to ${data.recipientCount} subscribers!`);
      fetchDigest();
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send digest");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground/50">Loading...</div>
      </div>
    );
  }

  if (!digest) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground/50">Digest not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-foreground/10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/admin/digests"
            className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Digest Preview</h1>
            <div className="text-sm text-foreground/50">
              {formatDate(digest.createdAt)}
            </div>
          </div>
          {digest.status === "DRAFT" && (
            <button
              onClick={sendDigest}
              disabled={sending}
              className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {sending ? "Sending..." : "Send Now"}
            </button>
          )}
          {digest.status === "SENT" && (
            <div className="px-3 py-1.5 bg-green-500/20 text-green-600 rounded text-sm">
              Sent {digest.sentAt && formatDate(digest.sentAt)}
            </div>
          )}
        </div>
      </header>

      {/* Email Preview */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="border border-foreground/10 rounded-lg overflow-hidden">
          {/* Email Header */}
          <div className="p-6 border-b border-foreground/10 bg-foreground/[0.02]">
            <div className="text-sm text-foreground/50 mb-1">From: now@dailybunch.com</div>
            <div className="text-sm text-foreground/50 mb-4">
              Subject: Daily Bunch: {digest.headline}
            </div>
          </div>

          {/* Email Body */}
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">{digest.headline}</h1>

            <div className="space-y-6">
              {digest.items.map((item, index) => (
                <div key={item.id} className="pb-6 border-b border-foreground/10 last:border-0">
                  <div className="flex items-start gap-3">
                    <div className="text-lg font-bold text-foreground/30 w-6">
                      {index + 1}.
                    </div>
                    <div className="flex-1">
                      <a
                        href={item.link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-medium hover:underline inline-flex items-center gap-1"
                      >
                        {item.link.title || item.link.domain}
                        <ExternalLink className="w-4 h-4 text-foreground/30" />
                      </a>
                      <div className="text-sm text-foreground/50 mt-1">
                        {item.link.domain}
                      </div>
                      {item.link.aiSummary && (
                        <p className="text-foreground/70 mt-2">
                          {item.link.aiSummary}
                        </p>
                      )}
                      {item.note && (
                        <p className="mt-2 text-sm italic text-foreground/60 border-l-2 border-foreground/20 pl-3">
                          {item.note}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-foreground/10 text-center text-sm text-foreground/50">
              <p>You received this because you subscribed to Daily Bunch.</p>
              <p className="mt-1">
                <a href="#" className="underline">Unsubscribe</a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

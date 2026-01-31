"use client";

/**
 * FUTURA Interface
 *
 * A terminal-like synthesis feed from the future.
 * Dark, minimal, information-dense. Respects your time.
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Section {
  id: string;
  title: string;
  glyph: string;
  entries: Array<{
    insight: string;
    confidence: "high" | "medium" | "low";
    evidence: string[];
    prediction?: string;
    contrarian?: string;
    links: Array<{ title: string; url: string; velocity: number }>;
  }>;
}

interface Signal {
  stats: {
    linksToday: number;
    totalTrending: number;
    topVelocity: number;
  };
}

interface FuturaInterfaceProps {
  sections: Section[];
  signal: Signal;
}

export function FuturaInterface({ sections, signal }: FuturaInterfaceProps) {
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(true);
  const [visibleSections, setVisibleSections] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Typewriter effect for sections
  useEffect(() => {
    if (visibleSections < sections.length) {
      const timer = setTimeout(() => {
        setVisibleSections((v) => v + 1);
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setIsTyping(false);
    }
  }, [visibleSections, sections.length]);

  // Focus input on load
  useEffect(() => {
    if (!isTyping && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isTyping]);

  const handleQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const q = query.toLowerCase();
    if (q.includes("why") || q.includes("explain")) {
      setResponse("FUTURA draws from " + signal.stats.totalTrending + " trending signals across trusted sources. The patterns emerge from velocity—when multiple independent observers point at the same thing, it matters.");
    } else if (q.includes("predict") || q.includes("next")) {
      setResponse("Prediction confidence is highest for accelerating stories. Watch the TRAJECTORY section—these stories have momentum. Hidden gems are contrarian bets.");
    } else if (q.includes("who") || q.includes("source")) {
      setResponse("FUTURA synthesizes from curated sources weighted by trust score. Higher-tier sources carry more signal weight.");
    } else {
      setResponse("FUTURA processes " + signal.stats.linksToday + " signals in the last 24h. Ask about predictions, sources, or why something is trending.");
    }
    setQuery("");
  };

  const now = new Date();
  const timestamp = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  return (
    <div className="min-h-dvh bg-black text-white font-mono">
      {/* Header */}
      <header className="border-b border-neutral-800 px-4 py-3 md:px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-neutral-600 hover:text-neutral-400 transition-colors text-sm"
            >
              ← Daily Bunch
            </Link>
            <h1 className="text-lg tracking-widest text-white">
              FUTURA
            </h1>
          </div>
          <div className="flex items-center gap-4 text-xs text-neutral-600">
            <span className="tabular-nums">{timestamp}</span>
            <span className="size-2 bg-green-500 animate-pulse" />
          </div>
        </div>
      </header>

      {/* Subheader */}
      <div className="border-b border-neutral-900 px-4 py-2 md:px-6">
        <div className="max-w-3xl mx-auto flex items-center gap-6 text-xs text-neutral-600">
          <span>{signal.stats.linksToday} signals/24h</span>
          <span>{signal.stats.totalTrending} trending</span>
          <span>peak velocity: {signal.stats.topVelocity}</span>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-8 md:px-6 md:py-12">
        {/* Intro */}
        <div className="mb-12 text-neutral-500 text-sm leading-relaxed">
          <p className="mb-2">
            <span className="text-white">FUTURA</span> synthesizes the cultural signal into what matters.
          </p>
          <p>
            Not links. Insights. Not news. Trajectories.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {sections.slice(0, visibleSections).map((section, sectionIndex) => (
            <section
              key={section.id}
              className="animate-in fade-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${sectionIndex * 100}ms` }}
            >
              {/* Section header */}
              <div className="flex items-center gap-3 mb-4 pb-2 border-b border-neutral-800">
                <span className="text-orange-500 text-lg">{section.glyph}</span>
                <h2 className="text-xs tracking-widest text-neutral-400">
                  {section.title}
                </h2>
              </div>

              {/* Entries */}
              <div className="space-y-4">
                {section.entries.map((entry, entryIndex) => {
                  const entryKey = `${section.id}-${entryIndex}`;
                  const isExpanded = expandedEntry === entryKey;

                  return (
                    <div key={entryKey} className="group">
                      {/* Main insight */}
                      <button
                        onClick={() => setExpandedEntry(isExpanded ? null : entryKey)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start gap-3">
                          {/* Confidence indicator */}
                          <span
                            className="mt-1.5 size-2 shrink-0"
                            style={{
                              background:
                                entry.confidence === "high"
                                  ? "#22c55e"
                                  : entry.confidence === "medium"
                                    ? "#eab308"
                                    : "#6b7280",
                            }}
                            title={`${entry.confidence} confidence`}
                          />

                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-neutral-200 leading-relaxed group-hover:text-white transition-colors">
                              {entry.insight}
                            </p>

                            {/* Prediction badge */}
                            {entry.prediction && (
                              <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-neutral-900 text-neutral-400">
                                {entry.prediction === "growing" && "↑ growing"}
                                {entry.prediction === "peaking" && "◆ peaking"}
                                {entry.prediction === "fading" && "↓ fading"}
                              </span>
                            )}
                          </div>

                          {/* Expand indicator */}
                          {(entry.evidence.length > 0 || entry.contrarian || entry.links.length > 0) && (
                            <span className="text-neutral-700 group-hover:text-neutral-500 transition-colors">
                              {isExpanded ? "−" : "+"}
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="mt-3 ml-5 pl-3 border-l border-neutral-800 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                          {/* Evidence */}
                          {entry.evidence.length > 0 && (
                            <div>
                              <span className="text-xs text-neutral-600 uppercase tracking-wider">
                                Sources
                              </span>
                              <p className="text-xs text-neutral-500 mt-1">
                                {entry.evidence.join(" · ")}
                              </p>
                            </div>
                          )}

                          {/* Contrarian view */}
                          {entry.contrarian && (
                            <div>
                              <span className="text-xs text-neutral-600 uppercase tracking-wider">
                                Contrarian
                              </span>
                              <p className="text-xs text-neutral-400 mt-1 italic">
                                {entry.contrarian}
                              </p>
                            </div>
                          )}

                          {/* Links */}
                          {entry.links.length > 0 && (
                            <div>
                              <span className="text-xs text-neutral-600 uppercase tracking-wider">
                                Source
                              </span>
                              {entry.links.map((link, i) => (
                                <a
                                  key={i}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block mt-1 text-xs text-orange-500/80 hover:text-orange-400 transition-colors truncate"
                                >
                                  {link.title}
                                  <span className="text-neutral-600 ml-2">
                                    v:{link.velocity}
                                  </span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Typing indicator */}
        {isTyping && (
          <div className="mt-8 flex items-center gap-2 text-neutral-600">
            <span className="animate-pulse">▋</span>
            <span className="text-xs">synthesizing...</span>
          </div>
        )}

        {/* Query interface */}
        {!isTyping && (
          <div className="mt-16 pt-8 border-t border-neutral-800">
            <form onSubmit={handleQuery} className="flex items-center gap-3">
              <span className="text-orange-500">›</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ask futura..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-neutral-700"
              />
            </form>

            {/* Response */}
            {response && (
              <div className="mt-4 text-sm text-neutral-400 leading-relaxed pl-5 border-l border-neutral-800 animate-in fade-in duration-300">
                {response}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-neutral-900 text-center">
          <p className="text-xs text-neutral-700">
            FUTURA is an experimental synthesis interface.
            <br />
            Not all predictions are accurate. All assertions have confidence levels.
          </p>
          <p className="text-xs text-neutral-800 mt-4">
            ◉ 2036
          </p>
        </footer>
      </main>
    </div>
  );
}

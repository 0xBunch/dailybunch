/**
 * FilterSidebar Component
 *
 * Collapsible sidebar for filters.
 * - Desktop: static sidebar visible by default
 * - Mobile: slide-over drawer activated by button
 *
 * Uses CSS media queries for responsive behavior (no hydration issues).
 */

"use client";

import { useState } from "react";

interface FilterSidebarProps {
  children: React.ReactNode;
}

export function FilterSidebar({ children }: FilterSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile filter button - fixed position, hidden on md+ */}
      <button
        onClick={toggleSidebar}
        className="fixed bottom-4 right-4 z-40 px-4 py-2 text-sm md:hidden"
        style={{
          background: "var(--ink)",
          color: "#fff",
          fontFamily: "var(--font-mono)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
        aria-label={isOpen ? "Close filters" : "Open filters"}
      >
        {isOpen ? "✕ Close" : "☰ Filters"}
      </button>

      {/* Backdrop - mobile only when open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto p-4
          transition-transform duration-200 ease-out
          md:static md:z-auto md:w-56 md:shrink-0 md:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        style={{
          borderRight: "1px solid var(--border)",
          background: "var(--surface-cream)",
        }}
      >
        {/* Mobile header */}
        <div
          className="flex justify-between items-center mb-4 pb-4 md:hidden"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <span
            className="text-xs uppercase tracking-wide"
            style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
          >
            Filters
          </span>
          <button
            onClick={closeSidebar}
            className="text-sm px-2 py-1"
            style={{ color: "var(--muted)", background: "transparent", border: "none" }}
            aria-label="Close filters"
          >
            ✕
          </button>
        </div>

        {children}
      </aside>
    </>
  );
}

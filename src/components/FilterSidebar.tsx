/**
 * FilterSidebar Component
 *
 * Collapsible sidebar for filters.
 * - Desktop: collapsible aside with toggle
 * - Mobile: slide-over drawer with backdrop
 */

"use client";

import { useState, useEffect } from "react";

interface FilterSidebarProps {
  children: React.ReactNode;
}

export function FilterSidebar({ children }: FilterSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // On desktop, default to open
  useEffect(() => {
    if (!isMobile) {
      setIsOpen(true);
    }
  }, [isMobile]);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile filter button */}
      <button
        onClick={toggleSidebar}
        className="md:hidden fixed bottom-4 right-4 z-40 px-4 py-2 text-sm"
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

      {/* Backdrop (mobile only) */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${isMobile ? "fixed top-0 left-0 h-full z-50 w-72 overflow-y-auto" : "w-56 shrink-0"}
          ${isMobile && !isOpen ? "-translate-x-full" : "translate-x-0"}
          transition-transform duration-200 ease-out
        `}
        style={{
          borderRight: "1px solid var(--border)",
          background: isMobile ? "#fff" : "transparent",
          padding: "1rem",
        }}
      >
        {/* Mobile close button */}
        {isMobile && (
          <div className="flex justify-between items-center mb-4 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <span
              className="text-xs uppercase tracking-wide"
              style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
            >
              Filters
            </span>
            <button
              onClick={closeSidebar}
              className="text-sm px-2 py-1"
              style={{ color: "var(--muted)" }}
              aria-label="Close filters"
            >
              ✕
            </button>
          </div>
        )}

        {children}
      </aside>
    </>
  );
}

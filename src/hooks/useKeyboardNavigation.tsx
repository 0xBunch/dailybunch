"use client";

/**
 * Keyboard Navigation Hook
 *
 * Provides vim-style navigation for feed items:
 * - j/k: Move down/up
 * - Enter/o: Open selected link
 * - x: Expand/collapse card
 * - g h: Go home
 * - g t: Go trending
 * - g l: Go latest
 * - ?: Show shortcuts help
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface UseKeyboardNavigationOptions {
  itemCount: number;
  onSelect?: (index: number) => void;
  onOpen?: (index: number) => void;
  onExpand?: (index: number) => void;
  getItemUrl?: (index: number) => string | null;
  enabled?: boolean;
}

interface UseKeyboardNavigationResult {
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  showHelp: boolean;
  setShowHelp: (show: boolean) => void;
}

export function useKeyboardNavigation({
  itemCount,
  onSelect,
  onOpen,
  onExpand,
  getItemUrl,
  enabled = true,
}: UseKeyboardNavigationOptions): UseKeyboardNavigationResult {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showHelp, setShowHelp] = useState(false);
  const pendingKeyRef = useRef<string | null>(null);

  // Handle selection change
  const handleSelect = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      onSelect?.(index);

      // Scroll item into view
      const item = document.querySelector(`[data-feed-index="${index}"]`);
      if (item) {
        item.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    },
    [onSelect]
  );

  // Handle opening a link
  const handleOpen = useCallback(
    (index: number) => {
      if (onOpen) {
        onOpen(index);
        return;
      }

      if (getItemUrl) {
        const url = getItemUrl(index);
        if (url) {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      }
    },
    [onOpen, getItemUrl]
  );

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Handle 'g' prefix commands (g h, g t, g l, g a)
      if (pendingKeyRef.current === "g") {
        pendingKeyRef.current = null;
        switch (e.key) {
          case "h":
            e.preventDefault();
            router.push("/");
            return;
          case "t":
            e.preventDefault();
            router.push("/dashboard");
            return;
          case "l":
            e.preventDefault();
            router.push("/links");
            return;
          case "a":
            e.preventDefault();
            router.push("/admin");
            return;
        }
        return;
      }

      switch (e.key) {
        // Start 'g' prefix sequence
        case "g":
          if (!e.metaKey && !e.ctrlKey) {
            pendingKeyRef.current = "g";
            // Clear pending key after 1 second
            setTimeout(() => {
              pendingKeyRef.current = null;
            }, 1000);
          }
          break;

        // Navigation
        case "j":
        case "ArrowDown":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            handleSelect(Math.min(selectedIndex + 1, itemCount - 1));
          }
          break;

        case "k":
        case "ArrowUp":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            handleSelect(Math.max(selectedIndex - 1, 0));
          }
          break;

        // Open selected link
        case "Enter":
        case "o":
          if (!e.metaKey && !e.ctrlKey && selectedIndex >= 0) {
            e.preventDefault();
            handleOpen(selectedIndex);
          }
          break;

        // Expand/collapse
        case "x":
          if (!e.metaKey && !e.ctrlKey && selectedIndex >= 0) {
            e.preventDefault();
            onExpand?.(selectedIndex);
          }
          break;

        // Help
        case "?":
          e.preventDefault();
          setShowHelp((prev) => !prev);
          break;

        // Escape to deselect
        case "Escape":
          setSelectedIndex(-1);
          setShowHelp(false);
          break;

        // View mode shortcuts (1, 2, 3) - handled by parent
        // Cmd+K handled by CommandPalette
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    enabled,
    selectedIndex,
    itemCount,
    handleSelect,
    handleOpen,
    onExpand,
    router,
  ]);

  return {
    selectedIndex,
    setSelectedIndex,
    showHelp,
    setShowHelp,
  };
}

/**
 * Keyboard shortcuts help content
 */
export const KEYBOARD_SHORTCUTS = [
  { key: "j / ↓", description: "Move down" },
  { key: "k / ↑", description: "Move up" },
  { key: "Enter / o", description: "Open link" },
  { key: "x", description: "Expand card" },
  { key: "g h", description: "Go home" },
  { key: "g t", description: "Go trending" },
  { key: "g l", description: "Go latest" },
  { key: "⌘K", description: "Command palette" },
  { key: "?", description: "Toggle help" },
  { key: "Esc", description: "Deselect / close" },
];

/**
 * Keyboard shortcuts help modal component
 */
export function KeyboardShortcutsHelp({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm p-6"
        style={{
          background: "var(--background)",
          border: "1px solid var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            className="text-sm uppercase tracking-wider"
            style={{ color: "var(--text-primary)" }}
          >
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            ×
          </button>
        </div>

        <div className="space-y-2">
          {KEYBOARD_SHORTCUTS.map(({ key, description }) => (
            <div
              key={key}
              className="flex items-center justify-between text-sm"
            >
              <kbd
                className="px-2 py-1"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                }}
              >
                {key}
              </kbd>
              <span style={{ color: "var(--text-secondary)" }}>
                {description}
              </span>
            </div>
          ))}
        </div>

        <p
          className="mt-4 text-center text-xs"
          style={{ color: "var(--text-faint)" }}
        >
          Press ? to toggle this help
        </p>
      </div>
    </div>
  );
}

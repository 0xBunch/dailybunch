"use client";

/**
 * Command Palette Component
 *
 * Cmd+K interface for quick navigation and actions.
 * Uses native dialog element for proper accessibility.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface CommandItem {
  id: string;
  label: string;
  shortcut?: string;
  section?: string;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Define available commands
  const commands: CommandItem[] = [
    // Navigation
    {
      id: "go-home",
      label: "Go to Home",
      shortcut: "g h",
      section: "Navigation",
      action: () => router.push("/"),
    },
    {
      id: "go-trending",
      label: "Go to Trending",
      shortcut: "g t",
      section: "Navigation",
      action: () => router.push("/dashboard"),
    },
    {
      id: "go-latest",
      label: "Go to Latest",
      shortcut: "g l",
      section: "Navigation",
      action: () => router.push("/links"),
    },
    {
      id: "go-admin",
      label: "Go to Admin",
      shortcut: "g a",
      section: "Navigation",
      action: () => router.push("/admin"),
    },
    {
      id: "go-sources",
      label: "Go to Sources",
      section: "Navigation",
      action: () => router.push("/admin/sources"),
    },
    // Views
    {
      id: "view-videos",
      label: "View Videos",
      section: "Filter",
      action: () => router.push("/links?mediaType=video"),
    },
    {
      id: "view-podcasts",
      label: "View Podcasts",
      section: "Filter",
      action: () => router.push("/links?mediaType=podcast"),
    },
    {
      id: "view-newsletters",
      label: "View Newsletters",
      section: "Filter",
      action: () => router.push("/links?mediaType=newsletter"),
    },
    // Time filters
    {
      id: "filter-6h",
      label: "Last 6 hours",
      section: "Time",
      action: () => router.push("/links?time=6h"),
    },
    {
      id: "filter-24h",
      label: "Last 24 hours",
      section: "Time",
      action: () => router.push("/links?time=24h"),
    },
    {
      id: "filter-7d",
      label: "Last 7 days",
      section: "Time",
      action: () => router.push("/links?time=7d"),
    },
    // Actions
    {
      id: "refresh",
      label: "Refresh Page",
      shortcut: "r",
      section: "Actions",
      action: () => window.location.reload(),
    },
  ];

  // Filter commands based on query
  const filteredCommands = query
    ? commands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(query.toLowerCase()) ||
          cmd.section?.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  // Group by section
  const sections = filteredCommands.reduce(
    (acc, cmd) => {
      const section = cmd.section || "Other";
      if (!acc[section]) acc[section] = [];
      acc[section].push(cmd);
      return acc;
    },
    {} as Record<string, CommandItem[]>
  );

  // Handle dialog open/close
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
      inputRef.current?.focus();
      setQuery("");
      setSelectedIndex(0);
    } else {
      dialog.close();
    }
  }, [open]);

  // Handle escape key and click outside
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onOpenChange(false);
    dialog.addEventListener("close", handleClose);

    return () => dialog.removeEventListener("close", handleClose);
  }, [onOpenChange]);

  // Execute selected command
  const executeCommand = useCallback(
    (cmd: CommandItem) => {
      onOpenChange(false);
      cmd.action();
    },
    [onOpenChange]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        onOpenChange(false);
        break;
    }
  };

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto w-full max-w-lg p-0 backdrop:bg-black/50"
      style={{
        background: "var(--background)",
        border: "1px solid var(--border)",
        top: "15vh",
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onOpenChange(false);
        }
      }}
    >
      <div onKeyDown={handleKeyDown}>
        {/* Search input */}
        <div
          className="flex items-center gap-3 border-b px-4 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <span style={{ color: "var(--text-muted)" }}>⌘K</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-base outline-none"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-body)",
              border: "none",
              padding: 0,
            }}
          />
          <kbd
            className="px-2 py-1 text-xs"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              fontFamily: "var(--font-mono)",
              color: "var(--text-muted)",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div
          className="max-h-80 overflow-y-auto p-2"
          role="listbox"
          aria-label="Commands"
        >
          {filteredCommands.length === 0 ? (
            <div
              className="px-4 py-8 text-center text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              No commands found
            </div>
          ) : (
            Object.entries(sections).map(([section, items]) => (
              <div key={section} className="mb-2">
                <div
                  className="px-3 py-1 text-[10px] uppercase tracking-wider"
                  style={{ color: "var(--text-faint)" }}
                >
                  {section}
                </div>
                {items.map((cmd) => {
                  const globalIndex = filteredCommands.indexOf(cmd);
                  const isSelected = globalIndex === selectedIndex;

                  return (
                    <button
                      key={cmd.id}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors"
                      style={{
                        background: isSelected
                          ? "var(--surface)"
                          : "transparent",
                        color: "var(--text-primary)",
                        border: "none",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      <span>{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd
                          className="ml-2 px-1.5 py-0.5 text-[10px]"
                          style={{
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            fontFamily: "var(--font-mono)",
                            color: "var(--text-muted)",
                          }}
                        >
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center gap-4 border-t px-4 py-2 text-[10px]"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-faint)",
            fontFamily: "var(--font-mono)",
          }}
        >
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </dialog>
  );
}

/**
 * Hook to manage command palette state with Cmd+K
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { open, setOpen };
}

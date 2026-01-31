/**
 * Right Rail Container
 *
 * Container for contextual modules on the dashboard right side.
 * Hidden on mobile, visible on desktop (md:block).
 */

interface RightRailProps {
  children: React.ReactNode;
}

export function RightRail({ children }: RightRailProps) {
  return (
    <aside
      className="hidden w-70 shrink-0 border-l md:block"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="sticky top-0 h-dvh overflow-y-auto p-4">
        <div className="space-y-6">{children}</div>
      </div>
    </aside>
  );
}

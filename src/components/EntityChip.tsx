/**
 * Entity Chip Component
 *
 * Displays an entity tag (person, org, product).
 * Minimal styling with type indicator.
 */

interface EntityChipProps {
  name: string;
  type: string;
}

export function EntityChip({ name, type }: EntityChipProps) {
  const typeIcon = type === "person" ? "@" : type === "organization" ? "+" : "#";

  return (
    <span
      className="inline-flex items-center text-xs transition-opacity hover:opacity-70"
      style={{ color: "var(--text-muted)" }}
    >
      <span style={{ color: "var(--text-faint)", marginRight: "2px" }}>
        {typeIcon}
      </span>
      <span
        style={{
          textDecoration: "underline",
          textUnderlineOffset: "2px",
          textDecorationColor: "var(--border)",
        }}
      >
        {name}
      </span>
    </span>
  );
}

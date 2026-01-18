/**
 * Entity Chip Component
 *
 * Displays an entity tag (person, org, product).
 * Lo-fi aesthetic: plain underlined text.
 */

interface EntityChipProps {
  name: string;
  type: string;
}

export function EntityChip({ name, type }: EntityChipProps) {
  const typeIcon = type === "person" ? "@" : type === "organization" ? "+" : "#";

  return (
    <span className="inline-flex items-center text-xs text-neutral-600 hover:text-neutral-900 cursor-default">
      <span className="opacity-50 mr-0.5">{typeIcon}</span>
      <span className="underline underline-offset-2 decoration-neutral-300">{name}</span>
    </span>
  );
}

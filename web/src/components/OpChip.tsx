/** Inline operator marker, placed where "+" or "/" would go: OR red, AND amber. */
export function OpChip({ op }: { op: "AND" | "OR" }) {
  return <span className={`op-chip ${op.toLowerCase()}`}>{op}</span>;
}

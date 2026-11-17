// Filled disclosure triangle used by the Cull panel's section headers
// (Cull Filters / Key Faces / Duplicates). Points right when collapsed,
// down when open.
export function Caret({ open, className = "" }: { open: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden
      className={`h-3 w-3 shrink-0 text-neutral-400 transition-transform ${open ? "" : "-rotate-90"} ${className}`}
    >
      <path d="M2 4h8L6 9z" fill="currentColor" />
    </svg>
  );
}

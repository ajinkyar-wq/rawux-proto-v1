import { createContext, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";

// Browse panels (AI Profiles / Presets / Retouching Presets) that slide out to
// the LEFT of the loupe side panel. LoupeRailPanel provides an empty slot
// beside itself; a link row renders its panel into that slot via a portal, so
// the panel still sees the row's React context (current image, history).

type FlyoutState = {
  slot: HTMLElement | null;
  active: string | null;
  setActive: (id: string | null) => void;
};

const FlyoutContext = createContext<FlyoutState | null>(null);

export function FlyoutHost({
  resetKey,
  children,
}: {
  // Changing this (e.g. switching rail tool) closes any open flyout.
  resetKey: string;
  children: (slotRef: (el: HTMLDivElement | null) => void) => React.ReactNode;
}) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => setActive(null), [resetKey]);
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  return (
    <FlyoutContext.Provider value={{ slot, active, setActive }}>
      {children(setSlot)}
    </FlyoutContext.Provider>
  );
}

export function useFlyout(id: string) {
  const ctx = useContext(FlyoutContext);
  const open = ctx?.active === id;
  return {
    available: !!ctx,
    open,
    toggle: () => ctx?.setActive(open ? null : id),
    close: () => ctx?.setActive(null),
    slot: ctx?.slot ?? null,
  };
}

export function FlyoutPanel({
  slot,
  title,
  onClose,
  onAdd,
  addLabel,
  children,
}: {
  slot: HTMLElement | null;
  title: string;
  onClose: () => void;
  /** Shows a "+" next to the close button (e.g. create a preset). */
  onAdd?: () => void;
  addLabel?: string;
  children: React.ReactNode;
}) {
  if (!slot) return null;
  return createPortal(
    <div className="flex h-full w-[264px] animate-[fadeIn_160ms_ease-out] flex-col border-l border-white/5 bg-[#1a1a1a]">
      <div className="flex shrink-0 items-center justify-between pb-3 pl-4 pr-3 pt-3.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-300">
          {title}
        </span>
        {/* Panels that can create (Presets) show only "+"; others show ✕. */}
        {onAdd ? (
          <button
            type="button"
            aria-label={addLabel}
            title={addLabel}
            onClick={onAdd}
            className="rounded p-1 text-neutral-400 hover:bg-white/5 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        ) : (
          <button
            type="button"
            aria-label={`Close ${title}`}
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:bg-white/5 hover:text-white"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>,
    slot,
  );
}

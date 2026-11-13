import { useEffect } from "react";
import { Redo2, Undo2 } from "lucide-react";

export type UndoFeedbackItem = {
  key: number;
  direction: "undo" | "redo";
  title: string; // "Highlights : -36"
  context?: string; // "DSC03000 · Editing"
};

// UX-2 toast: bottom-centre, above the bottom bar. Auto-dismisses.
export function UndoToast({ item, onDone }: { item: UndoFeedbackItem | null; onDone: () => void }) {
  useEffect(() => {
    if (!item) return;
    const t = window.setTimeout(onDone, 2400);
    return () => window.clearTimeout(t);
  }, [item, onDone]);

  if (!item) return null;
  const Icon = item.direction === "undo" ? Undo2 : Redo2;
  return (
    <div
      key={item.key}
      className="pointer-events-none fixed bottom-16 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-lg border border-black/10 bg-white px-3.5 py-2.5 shadow-2xl"
    >
      <Icon className="h-4 w-4 shrink-0 text-neutral-600" strokeWidth={1.75} />
      <div className="flex flex-col">
        <span className="text-[12.5px] font-medium text-neutral-900">
          {item.direction === "undo" ? "Undone" : "Redone"} · {item.title}
        </span>
        {item.context && <span className="text-[11px] text-neutral-500">{item.context}</span>}
      </div>
    </div>
  );
}

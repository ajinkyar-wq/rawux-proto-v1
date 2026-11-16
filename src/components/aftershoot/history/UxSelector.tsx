import { Image as ImageIcon } from "lucide-react";
import type { Layout } from "../rail-config";

// Landing screen: pick which layout to try. Undo/Redo behaviour is fixed
// (see UNDO_MODE in routes/index.tsx) and isn't a choice here.
const OPTIONS: { mode: Layout; label: string; heading: string; description: string }[] = [
  {
    mode: "oneTab",
    label: "UI - 1",
    heading: "One tab",
    description: "Editing and Retouching in one tab. AI tools stay inside Editing.",
  },
  {
    mode: "ui1",
    label: "UI - 2",
    heading: "Separate tabs",
    description: "Editing and Retouching in separate tabs.",
  },
  {
    mode: "ui2",
    label: "UI - 3",
    heading: "Combined panel",
    description: "Editing and Retouching in one panel. AI tools get their own tab.",
  },
];

export function UxSelector({ onSelect }: { onSelect: (mode: Layout) => void }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-[#151515] px-4 font-sans text-neutral-300 select-none">
      <h1 className="text-[28px] tracking-tight text-white">
        <span className="font-bold">after</span>
        <span className="font-normal">shoot</span>
      </h1>
      <p className="mt-3 text-[14px] text-neutral-500">Choose a layout</p>

      <div className="mt-12 grid w-full max-w-[960px] grid-cols-1 gap-4 sm:grid-cols-3">
        {OPTIONS.map((o) => (
          <button
            key={o.mode}
            type="button"
            onClick={() => onSelect(o.mode)}
            className="flex flex-col items-start gap-3 rounded-xl border border-white/[0.06] bg-[#1e1e1e] p-6 text-left transition-colors hover:border-white/15 hover:bg-[#232323]"
          >
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-neutral-400" strokeWidth={1.5} />
              <span className="text-[12px] font-medium uppercase tracking-wider text-neutral-500">
                {o.label}
              </span>
            </div>
            <span className="text-[17px] font-medium text-neutral-100">{o.heading}</span>
            <span className="text-[13px] leading-relaxed text-neutral-400">{o.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

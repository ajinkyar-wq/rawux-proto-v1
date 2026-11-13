import { useState } from "react";
import {
  ChevronDown,
  Eye,
  Info,
  Loader2,
  RotateCcw,
  Shapes,
  SlidersHorizontal,
  WandSparkles,
} from "lucide-react";
import type { ActionStatus } from "../action-status";

// Grid-view editing panels.
//
// UI-1 "AI Editing" rail tab (AIEditingPanel):
//   Before AI Edit: AI Profiles (preview + profile name + customize) → AI tool
//   toggles (Crop & Straighten / Masking / Denoise) → pinned "Edit N Photos".
//   After AI Edit: all of that is replaced by a collapsible "Editing" section
//   (Restart re-runs AI Edit) holding the Quick Edits steppers.
//
// UI-2 splits this up: the toggles get their own "AI Tools" tab
// (AIToolsPanel) and the profile / Quick Edits move into the combined
// Edit & Retouch panel (EditRetouchPanel.tsx) via EditingSection.

const AI_TOOLS = [
  { id: "crop", label: "AI Crop & Straighten" },
  { id: "mask", label: "AI Masking" },
  { id: "denoise", label: "AI Denoise" },
] as const;
type ToolId = (typeof AI_TOOLS)[number]["id"];

export const PHOTO_COUNT = 300;

export function AIEditingPanel({
  status,
  onRunEdit,
}: {
  status: ActionStatus;
  // Opens the Edit Settings modal (profile picker + start).
  onRunEdit: () => void;
}) {
  if (status === "complete")
    return (
      <div className="-mr-2 flex min-h-0 flex-1 animate-[fadeIn_220ms_ease-out] flex-col gap-2 overflow-y-auto pr-2">
        <EditingSection status={status} onRunEdit={onRunEdit} />
      </div>
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="-mr-2 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-2">
        <ProfileBlock onChangeProfile={onRunEdit} />
        <AIToolToggles />
      </div>
      <EditRunButton status={status} onClick={onRunEdit} className="mt-3" />
    </div>
  );
}

// UI-2 "AI Tools" rail tab: Crop & Straighten / Masking / Denoise on their own.
export function AIToolsPanel() {
  return (
    <div className="-mr-2 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-2">
      <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-300">
        <Shapes className="h-3.5 w-3.5" strokeWidth={1.5} />
        AI Tools
      </span>
      <AIToolToggles />
    </div>
  );
}

// Collapsible "Editing" section. Before AI Edit: profile + Edit button
// (`withProfile`); after: Restart + Quick Edits.
export function EditingSection({
  status,
  onRunEdit,
  withProfile = false,
}: {
  status: ActionStatus;
  onRunEdit: () => void;
  withProfile?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const done = status === "complete";
  return (
    <section className="flex shrink-0 flex-col gap-3">
      <div className="flex shrink-0 items-center justify-between">
        <SectionToggle
          title="Editing"
          open={open}
          onToggle={() => setOpen((v) => !v)}
          info={done}
        />
        {done && (
          <button
            type="button"
            onClick={onRunEdit}
            className="rounded-md bg-white/10 px-2 py-1 text-[11px] text-neutral-200 hover:bg-white/15 hover:text-white"
          >
            Restart
          </button>
        )}
      </div>
      {open &&
        (done ? (
          <QuickEdits />
        ) : withProfile ? (
          <>
            <ProfileBlock onChangeProfile={onRunEdit} />
            <EditRunButton status={status} onClick={onRunEdit} />
          </>
        ) : null)}
    </section>
  );
}

// "▾ Title" collapsible section header.
export function SectionToggle({
  title,
  open,
  onToggle,
  info,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  info?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-1.5 text-[13px] font-medium text-white"
    >
      <ChevronDown
        className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${open ? "" : "-rotate-90"}`}
        strokeWidth={2}
      />
      {title}
      {info && <Info className="h-3 w-3 text-neutral-500" strokeWidth={1.75} />}
    </button>
  );
}

function ProfileBlock({ onChangeProfile }: { onChangeProfile: () => void }) {
  return (
    <>
      <div className="flex shrink-0 items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-300">
          <WandSparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
          AI Profiles
        </span>
        <button
          type="button"
          onClick={onChangeProfile}
          className="text-[11px] text-neutral-300 hover:text-white"
        >
          Change Profile
        </button>
      </div>

      {/* Profile preview (placeholder image) */}
      <div className="aspect-[16/7] w-full shrink-0 rounded-md bg-gradient-to-br from-[#5b5f66] via-[#3a3c40] to-[#24262a] ring-1 ring-inset ring-white/5" />

      <div className="flex shrink-0 items-center gap-2">
        <span className="text-[13px] text-white">True to Life</span>
        <span className="rounded border border-white/25 px-1 py-px text-[9px] font-semibold tracking-wider text-white">
          RAW
        </span>
        <button
          type="button"
          aria-label="Customize profile"
          className="ml-auto rounded bg-white/10 p-1 text-neutral-300 hover:bg-white/15 hover:text-white"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </>
  );
}

function AIToolToggles() {
  const [tools, setTools] = useState<Set<ToolId>>(new Set());
  const toggleTool = (id: ToolId) =>
    setTools((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <div className="flex shrink-0 flex-col border-t border-white/5">
      {AI_TOOLS.map((tool) => {
        const on = tools.has(tool.id);
        return (
          <button
            key={tool.id}
            type="button"
            role="switch"
            aria-checked={on}
            onClick={() => toggleTool(tool.id)}
            className="flex h-9 items-center justify-between border-b border-white/5 text-left"
          >
            <span className="text-[10.5px] font-medium uppercase tracking-wider text-neutral-400">
              {tool.label}
            </span>
            <span
              className={`relative h-4 w-7 rounded-full transition-colors ${
                on ? "bg-[#2f55d4]" : "bg-white/10"
              }`}
            >
              <span
                className={`absolute top-0.5 h-3 w-3 rounded-full transition-all ${
                  on ? "left-3.5 bg-white" : "left-0.5 bg-neutral-400"
                }`}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function EditRunButton({
  status,
  onClick,
  className = "",
}: {
  status: ActionStatus;
  onClick: () => void;
  className?: string;
}) {
  const running = status === "running";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={running}
      className={`flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-[#2f55d4] text-[12.5px] font-medium text-white hover:bg-[#3a60e0] disabled:cursor-wait disabled:opacity-70 ${className}`}
    >
      {running && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />}
      {running ? "Editing…" : `Edit ${PHOTO_COUNT} Photos`}
    </button>
  );
}

/* ------------------------------ Quick Edits ----------------------------- */

const QUICK_EDIT_GROUPS = [
  { title: "White Balance", sliders: ["Temperature", "Tint"] },
  {
    title: "Presence",
    sliders: ["Exposure", "Contrast", "Highlights", "Shadows", "Blacks", "Whites"],
  },
];
const BIG_STEP = 5;

function QuickEdits() {
  const [values, setValues] = useState<Record<string, number>>({});
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const nudge = (label: string, delta: number) =>
    setValues((v) => ({ ...v, [label]: Math.max(-100, Math.min(100, (v[label] ?? 0) + delta)) }));
  const resetGroup = (sliders: string[]) =>
    setValues((v) => {
      const next = { ...v };
      sliders.forEach((l) => delete next[l]);
      return next;
    });
  const toggleHidden = (title: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });

  return (
    <div className="flex shrink-0 flex-col gap-2 pt-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-300">
        Quick Edits
      </span>
      {QUICK_EDIT_GROUPS.map((group, gi) => (
        <section
          key={group.title}
          className={`flex flex-col gap-1.5 ${gi > 0 ? "border-t border-white/5 pt-2" : ""}`}
        >
          <div className="flex h-7 items-center justify-between">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-300">
              {group.title}
            </span>
            <div className="flex items-center gap-2 text-neutral-500">
              <button
                type="button"
                aria-label={`Toggle ${group.title}`}
                onClick={() => toggleHidden(group.title)}
                className={`hover:text-neutral-300 ${hidden.has(group.title) ? "opacity-40" : ""}`}
              >
                <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                aria-label={`Reset ${group.title}`}
                onClick={() => resetGroup(group.sliders)}
                className="hover:text-neutral-300"
              >
                <RotateCcw className="h-3 w-3" strokeWidth={1.75} />
              </button>
            </div>
          </div>
          {group.sliders.map((label) => (
            <div key={label} className="flex h-7 items-center justify-between">
              <span className="text-[12px] text-neutral-400">{label}</span>
              <div className="flex h-6 items-center rounded bg-[#242424]">
                <StepBtn label={`${label} -${BIG_STEP}`} onClick={() => nudge(label, -BIG_STEP)}>
                  <Tri dir="left" double />
                </StepBtn>
                <StepBtn label={`${label} -1`} onClick={() => nudge(label, -1)}>
                  <Tri dir="left" />
                </StepBtn>
                <StepBtn label={`${label} +1`} onClick={() => nudge(label, 1)}>
                  <Tri dir="right" />
                </StepBtn>
                <StepBtn
                  label={`${label} +${BIG_STEP}`}
                  onClick={() => nudge(label, BIG_STEP)}
                  last
                >
                  <Tri dir="right" double />
                </StepBtn>
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function StepBtn({
  children,
  label,
  onClick,
  last,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex h-full w-7 items-center justify-center text-neutral-300 hover:text-white ${
        last ? "" : "border-r border-white/[0.06]"
      }`}
    >
      {children}
    </button>
  );
}

// Filled triangle(s) used by the Quick Edits steppers.
function Tri({ dir, double }: { dir: "left" | "right"; double?: boolean }) {
  const one = dir === "left" ? "M5 0 L0 4 L5 8 Z" : "M0 0 L5 4 L0 8 Z";
  const two = dir === "left" ? "M10 0 L5 4 L10 8 Z" : "M5 0 L10 4 L5 8 Z";
  return (
    <svg
      width={double ? 10 : 5}
      height={8}
      viewBox={`0 0 ${double ? 10 : 5} 8`}
      fill="currentColor"
      aria-hidden
    >
      <path d={one} />
      {double && <path d={two} />}
    </svg>
  );
}

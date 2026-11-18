import { useState } from "react";
import { Warning } from "@phosphor-icons/react";
import { Brush, Lasso, SquareDashed } from "lucide-react";
import { Checkbox } from "../primitives";
import { IconTooltip } from "../IconTooltip";

// Static mock of scan results — real detection is wired up later.
const MOCK_RESULTS = [
  { label: "Exit Signs", count: 2 },
  { label: "Fire Alarms", count: 1 },
  { label: "Fire Extinguishers", count: 0 },
  { label: "Thermostats", count: 1 },
];

type PatchTool = "brush" | "rect" | "lasso";
const PATCH_TOOLS: { id: PatchTool; label: string; icon: typeof Brush }[] = [
  { id: "brush", label: "Brush", icon: Brush },
  { id: "rect", label: "Rectangle select", icon: SquareDashed },
  { id: "lasso", label: "Lasso", icon: Lasso },
];

export function PatchPanel() {
  const [scanned, setScanned] = useState(false);
  const [tool, setTool] = useState<PatchTool>("brush");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (label: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  const selectedCount = MOCK_RESULTS.filter((r) => selected.has(r.label)).reduce(
    (sum, r) => sum + r.count,
    0,
  );
  const canRemove = selectedCount > 0;
  const removeLabel = selectedCount > 1 ? `Remove ${selectedCount} Objects` : "Remove Object";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {/* Title row — same header style as the other loupe panels. */}
        <div className="flex h-6 items-center gap-2">
          <SectionTitle>Smart Object Removal</SectionTitle>
          <span className="rounded border border-white/15 px-1.5 py-px text-[10px] font-medium text-neutral-200">
            Beta
          </span>
        </div>

        {!scanned ? (
          <>
            <img
              src="/patch/graphic.png"
              alt=""
              draggable={false}
              className="w-full rounded object-cover"
            />
            <p className="text-[12px] leading-4 text-[#ababab]">
              Aftershoot currently removes a fixed set of 4 distraction types.
            </p>
            <div className="mt-1 flex flex-col gap-2">
              <PrimaryButton onClick={() => setScanned(true)}>Remove from this Image</PrimaryButton>
              <SecondaryButton>Remove from All Images</SecondaryButton>
            </div>
          </>
        ) : MOCK_RESULTS.every((r) => r.count === 0) ? (
          <div className="mt-1 flex w-full flex-col items-center gap-4 rounded bg-[#242424] p-5">
            <Warning size={32} className="text-[#e2e2e2]" />
            <div className="flex flex-col gap-1 text-center">
              <p className="text-[16px] font-semibold leading-5 text-[#e2e2e2]">
                No distractions detected
              </p>
              <p className="text-[13px] leading-4 text-[#ababab]">Think we missed something?</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-2 grid grid-cols-2 gap-4">
              {[...MOCK_RESULTS]
                .sort((a, b) => Number(b.count > 0) - Number(a.count > 0))
                .map((r) => (
                  <label
                    key={r.label}
                    className="flex h-4 min-w-0 cursor-pointer items-center gap-2"
                  >
                    <Checkbox checked={selected.has(r.label)} onChange={() => toggle(r.label)} />
                    <span className="flex min-w-0 items-center gap-1">
                      <span className="truncate text-[11px] leading-4 text-[#e2e2e2]">
                        {r.label}
                      </span>
                      <span className="shrink-0 text-[10px] font-medium leading-3 text-[#777]">
                        {r.count}
                      </span>
                    </span>
                  </label>
                ))}
            </div>
            <div className="mt-2 flex flex-col gap-2">
              <PrimaryButton disabled={!canRemove}>{removeLabel}</PrimaryButton>
              <SecondaryButton>Remove from All Images</SecondaryButton>
              <button
                type="button"
                onClick={() => {
                  setScanned(false);
                  setSelected(new Set());
                }}
                className="text-[11px] text-[#777] hover:text-[#ababab]"
              >
                Reset preview
              </button>
            </div>
          </>
        )}
      </div>

      <div className="h-px bg-white/5" />

      {/* Manual Patch: pick how to mark what to remove on the photo. */}
      <section className="flex flex-col gap-3">
        <SectionTitle>Manual Patch</SectionTitle>
        <div className="flex items-center gap-2">
          {PATCH_TOOLS.map((t) => {
            const Icon = t.icon;
            const active = tool === t.id;
            return (
              <IconTooltip key={t.id} label={t.label}>
                <button
                  type="button"
                  aria-label={t.label}
                  aria-pressed={active}
                  onClick={() => setTool(t.id)}
                  className={`flex h-8 w-8 items-center justify-center rounded-md ${
                    active
                      ? "border border-white/15 bg-white/[0.08] text-white"
                      : "text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-200"
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </IconTooltip>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// Same as the section headers in the other loupe panels (WHITE BALANCE,
// LIGHT, FACE BLEMISH…): 12px semibold uppercase.
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[12px] font-semibold uppercase tracking-wider text-neutral-200">
      {children}
    </span>
  );
}

function PrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-9 w-full items-center justify-center rounded px-3 text-[12px] font-medium transition-colors ${
        disabled
          ? "cursor-not-allowed bg-[#1e2a45] text-[#474747]"
          : "cursor-pointer bg-[#2563eb] text-white hover:bg-[#1d56d1]"
      }`}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="flex h-9 w-full items-center justify-center rounded bg-[#2c2c2c] px-3 text-[12px] font-medium text-[#e2e2e2] transition-colors hover:bg-[#343434]"
    >
      {children}
    </button>
  );
}

import { useState } from "react";
import { Brush, CircleMinus, CirclePlus, MousePointer2, SquareDashed } from "lucide-react";

type PatchMode = "object" | "rectangle" | "brush";

export function PatchPanel() {
  const [mode, setMode] = useState<PatchMode>("object");

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-1.5">
        <ModeCard
          active={mode === "object"}
          onClick={() => setMode("object")}
          icon={<MousePointer2 className="h-3.5 w-3.5" strokeWidth={1.5} />}
          label="Object Select"
        />
        <ModeCard
          active={mode === "rectangle"}
          onClick={() => setMode("rectangle")}
          icon={<SquareDashed className="h-3.5 w-3.5" strokeWidth={1.5} />}
          label="Rectangle"
        />
        <ModeCard
          active={mode === "brush"}
          onClick={() => setMode("brush")}
          icon={<Brush className="h-3.5 w-3.5" strokeWidth={1.5} />}
          label="Brush"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <PillButton variant="filled">
          <CirclePlus className="h-3 w-3" strokeWidth={1.75} />
          Add Mask
        </PillButton>
        <PillButton variant="ghost">
          <CircleMinus className="h-3 w-3" strokeWidth={1.75} />
          Subtract Mask
        </PillButton>
      </div>
    </div>
  );
}

function ModeCard({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 rounded border bg-[#222] py-1.5 transition-colors ${
        active
          ? "border-white text-white"
          : "border-white/10 text-neutral-300 hover:bg-[#262626]"
      }`}
    >
      <span>{icon}</span>
      <span className="text-[10px] text-neutral-300">{label}</span>
    </button>
  );
}

function PillButton({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "filled" | "ghost";
}) {
  const base =
    "flex h-6 flex-1 items-center justify-center gap-1 rounded-full text-[11px] font-medium";
  return (
    <button
      type="button"
      className={
        variant === "filled"
          ? `${base} bg-white text-black hover:bg-neutral-200`
          : `${base} border border-white/15 text-white hover:bg-white/[0.04]`
      }
    >
      {children}
    </button>
  );
}

import { useState } from "react";
import { Dropdown, Stepper } from "../primitives";

const PRESETS = ["Cinematic C1", "True to life", "Natural Retouch", "Bold Punch", "Soft Pastel"];

export function AdjustPanel() {
  const [preset, setPreset] = useState<string>("Cinematic C1");
  const [exposure, setExposure] = useState(0);
  const [wb, setWb] = useState(0);
  const [clarity, setClarity] = useState(0);
  const [vibrance, setVibrance] = useState(0);

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] text-neutral-300">Presets</span>
        <div className="w-[160px]">
          <Dropdown value={preset} options={PRESETS} onChange={setPreset} size="sm" />
        </div>
      </div>

      <div className="-mx-4 my-1 h-px bg-white/5" />

      <div className="text-[12px] text-neutral-400">Quick Edit</div>

      <Stepper label="Exposure" value={exposure} onChange={setExposure} />
      <Stepper label="White Balance" value={wb} onChange={setWb} />
      <Stepper label="Clarity" value={clarity} onChange={setClarity} />
      <Stepper label="Vibrance" value={vibrance} onChange={setVibrance} />
    </>
  );
}

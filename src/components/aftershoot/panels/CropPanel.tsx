import { useState } from "react";
import { Checkbox, Dropdown } from "../primitives";

const CROP_RATIOS = ["2x3", "3x4", "5x7", "8.5x11", "4x5"];
const CROP_STYLES = ["Loose", "Aggressive"];
const MASK_TYPES = ["Subject mask with edits", "Subject only", "Sky only", "Background"];

export function CropPanel() {
  const [straighten, setStraighten] = useState(true);
  const [crop, setCrop] = useState(true);
  const [mask, setMask] = useState(true);
  const [ratio, setRatio] = useState<string>("2x3");
  const [style, setStyle] = useState<string>("Loose");
  const [maskType, setMaskType] = useState<string>("Subject mask with edits");

  return (
    <>
      <div className="text-[12px] text-neutral-300">AI Crop, Straighten, Mask</div>

      <label className="flex cursor-pointer items-center gap-2.5">
        <Checkbox checked={straighten} onChange={setStraighten} />
        <span className="text-[12px] text-neutral-200">AI Straighten</span>
      </label>

      <div className={`flex items-center gap-2 ${crop ? "" : "opacity-50"}`}>
        <label className="flex cursor-pointer items-center gap-2.5">
          <Checkbox checked={crop} onChange={setCrop} />
          <span className="text-[12px] text-neutral-200">AI Crop</span>
        </label>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-[88px]">
            <Dropdown
              value={`Ratio: ${ratio}`}
              options={CROP_RATIOS.map((r) => `Ratio: ${r}`)}
              onChange={(v) => setRatio(v.replace(/^Ratio:\s*/, ""))}
              size="sm"
            />
          </div>
          <div className="w-[88px]">
            <Dropdown value={style} options={CROP_STYLES} onChange={setStyle} size="sm" />
          </div>
        </div>
      </div>

      <div className={`flex items-center gap-2 ${mask ? "" : "opacity-50"}`}>
        <label className="flex cursor-pointer items-center gap-2.5">
          <Checkbox checked={mask} onChange={setMask} />
          <span className="text-[12px] text-neutral-200">AI Mask</span>
        </label>
        <div className="ml-auto w-[180px]">
          <Dropdown value={maskType} options={MASK_TYPES} onChange={setMaskType} size="sm" />
        </div>
      </div>

      <button className="mt-1 flex h-9 items-center justify-center rounded-md bg-[#3b5bff] text-[13px] font-medium text-white hover:bg-[#4866ff]">
        Apply Now
      </button>
    </>
  );
}

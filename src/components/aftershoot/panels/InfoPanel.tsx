import { ExternalLink } from "lucide-react";

export function InfoPanel() {
  return (
    <>
      <div className="text-[12px] text-neutral-300">Image Information</div>

      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] text-neutral-500">Erix Shots</div>
          <div className="mt-0.5 text-[13px] text-neutral-100">DSC_9918.NEF</div>
        </div>
        <button className="flex items-center gap-1 text-[11px] text-neutral-300 hover:text-white">
          View in Folder
          <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
        </button>
      </div>

      <div className="text-[12px] text-neutral-100">18-105 mm</div>
      <div className="-mt-2 text-[12px] text-neutral-100">D7200</div>

      <div className="-mx-4 h-px bg-white/5" />

      <div className="flex items-center justify-between text-[11px] text-neutral-300">
        <span>1/100</span>
        <span>f / 14</span>
        <span>ISO 250</span>
        <span>105 mm</span>
      </div>

      <div className="flex items-center justify-between text-[11px] text-neutral-500">
        <span>08:29:48 • Feb 27, 2026</span>
        <span>6016x4016 • 27.04 MB</span>
      </div>
    </>
  );
}

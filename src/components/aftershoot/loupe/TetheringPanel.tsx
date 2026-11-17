import { useState } from "react";
import { CaretDown, CaretRight, Check, Eject, FolderSimple } from "@phosphor-icons/react";

// Tethering side panel (Figma "Right Side Panel", node 81:33862). Local UI
// state only — this is a prototype, nothing is wired to a real camera.

function Divider() {
  return <div className="h-px w-full shrink-0 bg-white/[0.08]" role="separator" />;
}

function Label({ children, bright }: { children: React.ReactNode; bright?: boolean }) {
  return (
    <span className={`text-[13px] leading-4 ${bright ? "text-[#e2e2e2]" : "text-[#ababab]"}`}>
      {children}
    </span>
  );
}

function SelectButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="flex items-center gap-1 rounded text-[12px] font-medium leading-4 text-[#ababab] hover:text-[#e2e2e2]"
    >
      {children}
      <CaretDown className="size-4" />
    </button>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`flex w-8 shrink-0 items-center rounded-full p-0.5 transition-colors ${
        on ? "justify-end bg-[#2563eb]" : "justify-start bg-[#303030]"
      }`}
    >
      <span className="size-3 rounded-full bg-white" />
    </button>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
  bright,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  bright?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-1.5"
    >
      <span
        className={`flex size-3 items-center justify-center rounded-xs ${
          checked ? "bg-[#2563eb] text-white" : "border border-[#777]"
        }`}
      >
        {checked && <Check className="size-2" weight="bold" />}
      </span>
      <Label bright={bright}>{label}</Label>
    </button>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex w-full items-center justify-between">{children}</div>;
}

function SectionHeader({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" onClick={onToggle} className="flex h-6 w-full items-center gap-2">
      <CaretRight
        className={`size-3 text-[#ababab] transition-transform ${open ? "rotate-90" : ""}`}
        weight="fill"
      />
      <span className="text-[11px] font-semibold uppercase leading-3 tracking-[0.5px] text-[#ababab]">
        {title}
      </span>
    </button>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 self-start rounded-md bg-[#242424] p-2">
      <span className="max-w-full truncate text-[13px] font-medium leading-5 text-[#e2e2e2]">
        {value}
      </span>
      <span className="text-[13px] leading-4 text-[#ababab]">{label}</span>
    </div>
  );
}

export function TetheringPanel() {
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [fx, setFx] = useState(true);
  const [fxOpen, setFxOpen] = useState(true);
  const [camOpen, setCamOpen] = useState(true);
  const [format, setFormat] = useState<"RAW" | "JPEG">("RAW");
  const [aiCrop, setAiCrop] = useState(true);
  const [aiStraighten, setAiStraighten] = useState(true);
  const [aiMask, setAiMask] = useState(true);
  const [importRaw, setImportRaw] = useState(true);
  const [importJpeg, setImportJpeg] = useState(true);
  const [saveSd, setSaveSd] = useState(true);

  return (
    <div className="flex h-full w-[344px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-white/5 bg-[#1c1c1c] p-3">
      <div className="flex w-full flex-col items-center gap-3">
        {/* Camera header */}
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-[14px] font-medium leading-5 text-[#e2e2e2]">
              Canon EOS R6 Mark II
            </span>
            <span className="size-1.5 rounded-full bg-[#22c55e]" aria-label="Connected" />
          </div>
          <button
            type="button"
            className="flex min-w-11 items-center justify-center gap-1 rounded py-1.5 pl-1.5 pr-2 text-[11px] font-medium leading-3 text-[#ababab] hover:bg-white/5 hover:text-[#e2e2e2]"
          >
            <Eject className="size-3" weight="fill" />
            Eject
          </button>
        </div>
        <Divider />

        {/* Destination / naming */}
        <div className="flex w-full flex-col gap-4">
          <div className="flex w-full flex-col gap-1.5">
            <Label>Destination Folder</Label>
            <div className="flex h-7 w-full items-center gap-1 border-b-[0.5px] border-[#777] py-1">
              <span className="flex-1 truncate text-[12px] font-medium leading-4 text-[#777]">
                ~/Pictures/Client Preview
              </span>
              <FolderSimple className="size-4 text-[#ababab]" />
            </div>
          </div>
          <Row>
            <Label>File Naming</Label>
            <SelectButton>Default</SelectButton>
          </Row>
          <Row>
            <Label>Auto Advance to Next</Label>
            <Toggle on={autoAdvance} onChange={setAutoAdvance} />
          </Row>
        </div>
        <Divider />

        {/* Edit effects */}
        <div className="flex w-full flex-col">
          <SectionHeader title="Edit effects" open={fxOpen} onToggle={() => setFxOpen((v) => !v)} />
          {fxOpen && (
            <div className="flex w-full flex-col gap-3 py-2.5">
              <div className="flex w-full items-center rounded-md bg-[#111] p-0.5">
                {(["RAW", "JPEG"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    className={`flex-1 rounded px-3 py-1.5 text-[11px] font-semibold uppercase leading-3 tracking-[0.5px] ${
                      format === f ? "bg-[#303030] text-[#e2e2e2]" : "text-[#777]"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="flex w-full flex-col gap-4">
                <Row>
                  <Label bright>Edit Profile</Label>
                  <SelectButton>Select a Profile</SelectButton>
                </Row>
                <div className="flex w-full items-center justify-between pl-4">
                  <Checkbox checked={aiCrop} onChange={setAiCrop} label="AI Crop" bright />
                  <div className="flex items-center gap-2">
                    <SelectButton>Loose</SelectButton>
                    <SelectButton>Default</SelectButton>
                  </div>
                </div>
                <div className="flex w-full items-center pl-4">
                  <Checkbox
                    checked={aiStraighten}
                    onChange={setAiStraighten}
                    label="AI Straighten"
                    bright
                  />
                </div>
                <div className="flex w-full items-center justify-between pl-4">
                  <Checkbox checked={aiMask} onChange={setAiMask} label="AI Mask" bright />
                  <SelectButton>Subject Mask with Edits</SelectButton>
                </div>
                <Row>
                  <Label bright>Retouch Preset</Label>
                  <SelectButton>Select a Preset</SelectButton>
                </Row>
              </div>
            </div>
          )}
        </div>
        <Divider />

        {/* Camera */}
        <div className="flex w-full flex-col">
          <SectionHeader title="Camera" open={camOpen} onToggle={() => setCamOpen((v) => !v)} />
          {camOpen && (
            <div className="flex w-full flex-col gap-3 pt-2.5">
              <div className="grid grid-cols-2 gap-3">
                <Stat value="f 5.6" label="Aperture" />
                <Stat value="1/300" label="Shutter Speed" />
                <Stat value="300" label="ISO" />
                <Stat value="Fluorescent" label="WB" />
              </div>
              <Row>
                <Label>Format</Label>
                <SelectButton>RAW + JPEG Fine</SelectButton>
              </Row>
              <Row>
                <Label>Import</Label>
                <div className="flex items-center gap-2">
                  <Checkbox checked={importRaw} onChange={setImportRaw} label="RAW" />
                  <Checkbox checked={importJpeg} onChange={setImportJpeg} label="JPEG" />
                </div>
              </Row>
              <Row>
                <Label>Save to SD Card</Label>
                <Toggle on={saveSd} onChange={setSaveSd} />
              </Row>
              <Row>
                <Label>Aspect Ratio</Label>
                <SelectButton>3:2</SelectButton>
              </Row>
              <Row>
                <Label>Shoot Mode</Label>
                <SelectButton>Single Shot</SelectButton>
              </Row>
              <Row>
                <Label>Focus Mode</Label>
                <SelectButton>Auto</SelectButton>
              </Row>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { ArrowRight, Plus, X } from "lucide-react";
import { Dropdown } from "../primitives";
import { PrimaryButton, SettingsModal } from "./SettingsModal";

const SUBJECT_FILTERS = ["Subject Filter", "People", "Pets", "Landscape", "Product"];
const PRESETS = ["Natural Retouch", "Soft Glow", "Bold Contrast", "Matte Film"];

type SubjectRow = { id: number; subject: string | null; preset: string | null };

const SMART_OBJECTS = [
  { label: "Exit Signs", count: 30 },
  { label: "Fire Alarms", count: 80 },
  { label: "Fire Extinguishers", count: 3 },
  { label: "Electricity Sockets", count: 40 },
  { label: "Thermostats", count: 8 },
  { label: "Garbage Cans", count: 0 },
];

let nextId = 1;
const initialRows: SubjectRow[] = [{ id: nextId++, subject: null, preset: null }];

export function RetouchSettingsModal({
  onClose,
  onStart,
}: {
  onClose: () => void;
  onStart: () => void;
}) {
  const [rows, setRows] = useState<SubjectRow[]>(initialRows);
  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set());

  const updateRow = (id: number, patch: Partial<SubjectRow>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const removeRow = (id: number) => setRows((rs) => rs.filter((r) => r.id !== id));
  const addRow = () => setRows((rs) => [...rs, { id: nextId++, subject: null, preset: null }]);

  const toggleObject = (label: string) => {
    setSelectedObjects((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <SettingsModal
      title="Retouch Settings"
      onClose={onClose}
      footer={<PrimaryButton label="Start AI Retouch" onClick={onStart} />}
    >
      <div className="flex flex-col gap-4 pt-1">
        <SubjectSync rows={rows} onUpdate={updateRow} onRemove={removeRow} onAdd={addRow} />
        <SmartObjectRemoval selected={selectedObjects} onToggle={toggleObject} />
      </div>
    </SettingsModal>
  );
}

function SubjectSync({
  rows,
  onUpdate,
  onRemove,
  onAdd,
}: {
  rows: SubjectRow[];
  onUpdate: (id: number, patch: Partial<SubjectRow>) => void;
  onRemove: (id: number) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[12px] font-semibold text-white">Subject Sync</h3>

      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-2">
            <div className="flex-1">
              <Dropdown
                value={row.subject}
                placeholder="Subject Filter"
                options={SUBJECT_FILTERS}
                onChange={(v) => onUpdate(row.id, { subject: v })}
              />
            </div>
            <ArrowRight className="h-3 w-3 shrink-0 text-neutral-400" strokeWidth={1.75} />
            <div className="flex-1">
              <Dropdown
                value={row.preset}
                placeholder="Select Preset"
                options={PRESETS}
                onChange={(v) => onUpdate(row.id, { preset: v })}
              />
            </div>
            <button
              type="button"
              onClick={() => onRemove(row.id)}
              className="rounded p-0.5 text-neutral-400 hover:bg-white/5 hover:text-white"
              title="Remove subject"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="flex h-8 items-center justify-center gap-1 rounded border border-dashed border-white/15 text-[11px] text-neutral-500 hover:border-white/25 hover:text-neutral-300"
      >
        <Plus className="h-3 w-3" strokeWidth={1.5} />
        Add subject
      </button>
    </div>
  );
}

function SmartObjectRemoval({
  selected,
  onToggle,
}: {
  selected: Set<string>;
  onToggle: (label: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h3 className="text-[12px] font-semibold text-white">Smart Object Removal</h3>
        <span className="flex h-4 items-center rounded bg-[#a35a1c] px-1.5 text-[9px] font-semibold uppercase tracking-wider text-white">
          Beta
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {SMART_OBJECTS.map((obj) => (
          <SmartObjectCard
            key={obj.label}
            label={obj.label}
            count={obj.count}
            selected={selected.has(obj.label)}
            onClick={() => obj.count > 0 && onToggle(obj.label)}
          />
        ))}
      </div>
    </div>
  );
}

function SmartObjectCard({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}) {
  const disabled = count === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-start gap-0.5 rounded border bg-[#242424] px-2.5 py-2 text-left transition-colors ${
        disabled
          ? "cursor-not-allowed border-white/10 opacity-50"
          : selected
            ? "border-[#3b5bff] bg-[#2a2a2a]"
            : "border-white/10 hover:bg-[#2a2a2a]"
      }`}
    >
      <span className="text-[11px] font-medium text-white">{label}</span>
      <span className="text-[11px] text-neutral-400">{count}</span>
    </button>
  );
}

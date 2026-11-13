import { FlaskConical, Sparkles } from "lucide-react";

// Per-tile retouch summary (mock data). Same contextual pattern as the
// other result panels.
const RETOUCH_INFO_PER_TILE = [
  {
    subjectChips: [
      { label: "All Subjects", selected: true },
      { label: "Masculine", selected: false },
      { label: "Feminine", selected: false },
      { label: "Elderly", selected: false },
      { label: "Child", selected: false },
    ],
    facesCounts: [8, 6, 5, 5],
    extraFaces: 10,
    selectedPreset: "Student Portraits",
    distractionsDetected: 0,
  },
  {
    subjectChips: [
      { label: "All Subjects", selected: false },
      { label: "Masculine", selected: true },
      { label: "Feminine", selected: true },
    ],
    facesCounts: [4, 3, 2],
    extraFaces: 6,
    selectedPreset: "Natural Retouch",
    distractionsDetected: 3,
  },
  {
    subjectChips: [
      { label: "All Subjects", selected: true },
      { label: "Child", selected: false },
    ],
    facesCounts: [9, 7, 6, 4],
    extraFaces: 0,
    selectedPreset: "Soft Glow",
    distractionsDetected: 12,
  },
];

export function RetouchInfoPanel({ selectedGridTile }: { selectedGridTile: number }) {
  const info = RETOUCH_INFO_PER_TILE[selectedGridTile % RETOUCH_INFO_PER_TILE.length];

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-0.5">
      <SubjectSyncSummary info={info} />
      <div className="h-px bg-white/5" />
      <SmartObjectRemovalSummary distractions={info.distractionsDetected} />
    </div>
  );
}

function SubjectSyncSummary({ info }: { info: (typeof RETOUCH_INFO_PER_TILE)[number] }) {
  return (
    <div className="flex flex-col gap-2">
      <SectionHeader
        title="Subject Sync"
        accent={<Sparkles className="h-3 w-3 fill-[#f5a524] text-[#f5a524]" strokeWidth={0} />}
      />
      <p className="text-[10.5px] leading-snug text-neutral-500">
        Apply presets on subjects identified across the entire album
      </p>

      <p className="text-[11px] text-white">
        {info.subjectChips
          .filter((c) => c.selected)
          .map((c) => c.label)
          .join(", ") || "None"}
      </p>

      <div className="mt-1 flex items-end gap-2">
        {info.facesCounts.map((n, i) => (
          <FaceAvatar key={i} count={n} />
        ))}
        {info.extraFaces > 0 && <ExtraFacesAvatar count={info.extraFaces} />}
      </div>

      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-[10px] font-semibold tracking-wider text-neutral-500">PRESET</span>
        <span className="text-[11px] text-white">{info.selectedPreset}</span>
      </div>
    </div>
  );
}

function FaceAvatar({ count }: { count: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="h-7 w-7 rounded-full bg-[#2a2a2a] ring-1 ring-inset ring-white/5" />
      <span className="text-[10px] text-neutral-500">{count}</span>
    </div>
  );
}

function ExtraFacesAvatar({ count }: { count: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2a2a2a] text-[10px] font-semibold text-neutral-300">
        +{count}
      </div>
      <span className="text-[10px] text-transparent">.</span>
    </div>
  );
}

function SmartObjectRemovalSummary({ distractions }: { distractions: number }) {
  const found = distractions > 0;
  return (
    <div className="flex flex-col gap-2">
      <SectionHeader
        title="Smart Object Removal"
        accent={<FlaskConical className="h-3 w-3 fill-[#f5a524] text-[#f5a524]" strokeWidth={0} />}
      />
      <p className="text-[10.5px] leading-snug text-neutral-500">
        Smart object detection will automatically identify and remove distractions you select
      </p>
      <p className="text-[11px] text-white">
        {found
          ? `${distractions} distraction${distractions === 1 ? "" : "s"} detected`
          : "No distractions detected"}
      </p>
    </div>
  );
}

function SectionHeader({ title, accent }: { title: string; accent?: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-1 text-[12px] font-semibold text-white">
      {title}
      {accent}
    </h3>
  );
}

import { Zap } from "lucide-react";

// Per-tile edit info (mock data). Mirrors how DuplicatesStrip and KeyFacesGrid
// vary their content with the selected grid image.
const EDIT_INFO_PER_TILE = [
  {
    aiProfile: "My Style 9",
    colorProfile: "Adobe Standard",
    profileType: "RAW",
    croppingType: "Aggressive / 3 : 4",
    straighten: "Yes",
    aiMasking: "Subject Mask Only",
  },
  {
    aiProfile: "Lemon Zest",
    colorProfile: "Camera Standard",
    profileType: "RAW",
    croppingType: "Loose / Default",
    straighten: "Yes",
    aiMasking: "Off",
  },
  {
    aiProfile: "Bold Punch",
    colorProfile: "Adobe Vivid",
    profileType: "JPEG",
    croppingType: "Aggressive / 2 : 3",
    straighten: "No",
    aiMasking: "Subject + Sky",
  },
];

export function EditInfoPanel({ selectedGridTile }: { selectedGridTile: number }) {
  const info = EDIT_INFO_PER_TILE[selectedGridTile % EDIT_INFO_PER_TILE.length];

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-0.5">
      <h3 className="text-[12px] font-semibold text-white">Edit Info</h3>

      <div className="flex flex-col">
        <InfoRow label="AI PROFILE">
          <span className="flex items-center gap-1 text-[11px] text-white">
            <Zap className="h-3 w-3 fill-[#f5a524] text-[#f5a524]" strokeWidth={0} />
            {info.aiProfile}
          </span>
        </InfoRow>
        <InfoRow label="COLOR PROFILE">
          <span className="flex items-center gap-1.5 text-[11px] text-white">
            {info.colorProfile}
            <span className="rounded bg-[#3a3a3a] px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-white">
              {info.profileType}
            </span>
          </span>
        </InfoRow>
        <InfoRow label="CROP" value={`${info.croppingType} · Straighten: ${info.straighten}`} />
        <InfoRow label="AI MASKING" value={info.aiMasking} />
      </div>

      <CustomizeSection />
    </div>
  );
}

function InfoRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.04] py-2">
      <span className="text-[10px] font-semibold tracking-wider text-neutral-500">{label}</span>
      {children ?? <span className="text-[11px] text-white">{value}</span>}
    </div>
  );
}

function CustomizeSection() {
  return (
    <div className="flex flex-col gap-1.5">
      <h4 className="text-[11px] font-semibold text-white">Customize your AI Profile</h4>
      <p className="text-[10.5px] leading-snug text-neutral-500">
        Tweak this AI profile&apos;s settings and fine-tune how your edits are applied.
      </p>
      <button
        type="button"
        className="mt-1 flex h-7 items-center justify-center rounded border border-white/10 bg-[#222] text-[11px] text-white hover:bg-[#262626]"
      >
        Customize Profile
      </button>
    </div>
  );
}

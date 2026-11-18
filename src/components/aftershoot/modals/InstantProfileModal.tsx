import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, FileUp, Info, Trash2, X } from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Data                                                                       */
/* -------------------------------------------------------------------------- */

// Presets the user already has, offered in the "Select from my presets" dropdown.
const MY_PRESETS = [
  "Tradition - Aleksej Jaklitsch",
  "Adaptive - Blur Background-Adaptive Blur Background",
  "Adaptive - Blur Background-Adaptive Blur Background 2",
  "Adaptive - Blur Background-Adaptive Blur Background 3",
  "Adaptive - Blur Background-Adaptive Blur Background 4",
  "Adaptive - Blur Background-Adaptive Blur Background 5",
  "Adaptive - Blur Background-Adaptive Blur Background 6",
  "Adaptive - Blur Background-Adaptive Blur Background 7",
  "Adaptive - Blur Background-Adaptive Blur Background 8",
];

// The 3 guided adjustment screens shown after naming the profile.
const ADJUSTMENTS = [
  {
    title: "Exposure",
    blurb: "Adjust the slider below to achieve the desired Exposure level for this image.",
  },
  {
    title: "Contrast",
    blurb: "Adjust the slider below to achieve the desired Contrast level for this image.",
  },
  {
    title: "White Balance",
    blurb: "Adjust the slider below to achieve the desired White Balance for this image.",
  },
] as const;

type Step = "upload" | "complete" | "name" | "adjust";
type ProfileType = "RAW" | "JPEG";

/* -------------------------------------------------------------------------- */
/* Flow controller                                                            */
/* -------------------------------------------------------------------------- */

// Multi-step flow for creating an Instant AI Profile from a Lightroom preset.
// Reached from the "Instant AI Profile" card in StartEditingModal.
export function InstantProfileModal({
  onClose,
  onFinish,
}: {
  onClose: () => void;
  // Called once the guided adjustments are complete (last "Next"), with the
  // newly created profile's name so the Edit Settings panel can pre-select it.
  onFinish: (profileName: string) => void;
}) {
  const [step, setStep] = useState<Step>("upload");
  const [preset, setPreset] = useState<string>();
  const [name, setName] = useState("My Style 1");
  const [profileType, setProfileType] = useState<ProfileType>("JPEG");
  // Index into ADJUSTMENTS for the guided slider screens.
  const [adjustIndex, setAdjustIndex] = useState(0);

  if (step === "upload") {
    return (
      <UploadStep
        onClose={onClose}
        onUseAftershoot={() => {
          setPreset("Aftershoot Preset");
          setStep("complete");
        }}
        onSelect={(p) => {
          setPreset(p);
          setStep("complete");
        }}
      />
    );
  }

  if (step === "complete") {
    return (
      <CompleteStep
        preset={preset ?? ""}
        onClose={onClose}
        onRemove={() => {
          setPreset(undefined);
          setStep("upload");
        }}
        onNext={() => setStep("name")}
      />
    );
  }

  if (step === "name") {
    return (
      <NameStep
        name={name}
        onName={setName}
        basedOn={preset ?? ""}
        profileType={profileType}
        onProfileType={setProfileType}
        onClose={onClose}
        onBack={() => setStep("complete")}
        onNext={() => {
          setAdjustIndex(0);
          setStep("adjust");
        }}
      />
    );
  }

  return (
    <AdjustStep
      index={adjustIndex}
      onClose={onClose}
      onBack={() => {
        if (adjustIndex === 0) setStep("name");
        else setAdjustIndex((i) => i - 1);
      }}
      onNext={() => {
        if (adjustIndex >= ADJUSTMENTS.length - 1) onFinish(name.trim());
        else setAdjustIndex((i) => i + 1);
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Shared modal shell                                                         */
/* -------------------------------------------------------------------------- */

function Shell({
  onClose,
  widthClass = "w-[560px]",
  children,
}: {
  onClose: () => void;
  widthClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className={`relative flex max-h-[90vh] flex-col rounded-xl border border-white/10 bg-[#161616] p-6 shadow-2xl ${widthClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="absolute right-5 top-5 rounded p-1 text-neutral-400 hover:bg-white/5 hover:text-white"
    >
      <X className="h-5 w-5" strokeWidth={1.75} />
    </button>
  );
}

function PrimaryButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-10 items-center justify-center rounded-lg bg-[#3b5bff] px-6 text-[14px] font-medium text-white hover:bg-[#4866ff] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}

function SecondaryButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-10 items-center justify-center rounded-lg border border-white/15 px-6 text-[14px] font-medium text-white hover:bg-white/5"
    >
      {label}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 1 — Upload a Lightroom Preset                                         */
/* -------------------------------------------------------------------------- */

function UploadStep({
  onClose,
  onUseAftershoot,
  onSelect,
}: {
  onClose: () => void;
  onUseAftershoot: () => void;
  onSelect: (preset: string) => void;
}) {
  return (
    <Shell onClose={onClose}>
      <CloseButton onClose={onClose} />

      <h2 className="text-[22px] font-bold text-white">Upload a Lightroom Preset</h2>
      <p className="mt-1 text-[15px] text-neutral-400">
        Select one preset as the base of your Instant AI Profile.
      </p>

      <div className="mt-5 flex flex-col items-center rounded-lg border border-dashed border-white/15 px-6 py-7">
        <FileUp className="h-9 w-9 text-neutral-500" strokeWidth={1.5} />

        <div className="mt-5 w-full">
          <PresetDropdown onSelect={onSelect} />
        </div>

        <div className="mt-4 text-[12px] font-semibold tracking-wider text-neutral-500">OR</div>

        <p className="mt-3 text-[15px] text-neutral-300">
          Drag and Drop or{" "}
          <button className="underline underline-offset-2 hover:text-white">browse files</button>{" "}
          <span className="text-neutral-500">(.xmp)</span>
        </p>
      </div>

      <div className="mt-5">
        <SecondaryButton label="Use Aftershoot Preset" onClick={onUseAftershoot} />
      </div>
    </Shell>
  );
}

function PresetDropdown({ onSelect }: { onSelect: (preset: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-full items-center gap-2 rounded-lg border border-white/10 bg-[#1c1c1c] px-4 hover:bg-[#222] "
      >
        <span className="flex-1 text-left text-[15px] text-neutral-400">
          Select from my presets
        </span>
        <ChevronDown
          className={`h-5 w-5 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={1.75}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[320px] overflow-y-auto rounded-lg border border-white/10 bg-[#1f1f1f] py-1 shadow-2xl">
          <div className="px-4 py-2.5 text-[15px] font-semibold text-white">
            Select from my presets
          </div>
          {MY_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                onSelect(p);
                setOpen(false);
              }}
              className="flex w-full items-center px-4 py-2.5 text-left text-[15px] text-neutral-300 hover:bg-white/[0.06] hover:text-white"
            >
              <span className="truncate">{p}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 2 — Upload Complete                                                    */
/* -------------------------------------------------------------------------- */

function CompleteStep({
  preset,
  onClose,
  onRemove,
  onNext,
}: {
  preset: string;
  onClose: () => void;
  onRemove: () => void;
  onNext: () => void;
}) {
  return (
    <Shell onClose={onClose} widthClass="w-[520px]">
      <CloseButton onClose={onClose} />

      <h2 className="text-[22px] font-bold text-white">Upload Complete</h2>
      <p className="mt-1 text-[15px] text-neutral-400">
        Aftershoot finished analyzing your preset, click Next to continue.
      </p>

      <div className="mt-5 flex items-center gap-3 rounded-lg border border-white/10 bg-[#1c1c1c] px-4 py-4">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2bbf5b]">
          <Check className="h-4 w-4 text-white" strokeWidth={3} />
        </span>
        <span className="flex-1 truncate text-[17px] font-bold text-white">{preset}</span>
        <button
          onClick={onRemove}
          className="rounded p-1.5 text-neutral-400 hover:bg-white/5 hover:text-white"
        >
          <Trash2 className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>

      <div className="mt-6 flex justify-end">
        <PrimaryButton label="Next" onClick={onNext} />
      </div>
    </Shell>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 3 — Name your Instant AI Profile                                       */
/* -------------------------------------------------------------------------- */

function NameStep({
  name,
  onName,
  basedOn,
  profileType,
  onProfileType,
  onClose,
  onBack,
  onNext,
}: {
  name: string;
  onName: (v: string) => void;
  basedOn: string;
  profileType: ProfileType;
  onProfileType: (v: ProfileType) => void;
  onClose: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <Shell onClose={onClose} widthClass="w-[540px]">
      <CloseButton onClose={onClose} />

      <h2 className="text-[22px] font-bold text-white">Name your Instant AI Profile</h2>

      <input
        autoFocus
        value={name}
        onChange={(e) => onName(e.target.value)}
        className="mt-4 h-12 w-full rounded-lg border border-[#3b5bff] bg-transparent px-4 text-[16px] text-white outline-none ring-2 ring-[#3b5bff]/30"
      />

      <p className="mt-2 text-[14px] text-neutral-500">Based on {basedOn}</p>

      <div className="mt-5 flex items-center gap-10">
        <span className="text-[16px] text-white">Profile Type</span>
        <Radio label="RAW" checked={profileType === "RAW"} onChange={() => onProfileType("RAW")} />
        <Radio
          label="JPEG"
          checked={profileType === "JPEG"}
          onChange={() => onProfileType("JPEG")}
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <SecondaryButton label="Back" onClick={onBack} />
        <PrimaryButton label="Next" onClick={onNext} disabled={!name.trim()} />
      </div>
    </Shell>
  );
}

function Radio({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button onClick={onChange} className="flex items-center gap-2.5">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
          checked ? "border-[#3b5bff]" : "border-neutral-500"
        }`}
      >
        {checked && <span className="h-2.5 w-2.5 rounded-full bg-[#3b5bff]" />}
      </span>
      <span className="text-[16px] text-white">{label}</span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 4 — Guided exposure / contrast / white-balance adjustments            */
/* -------------------------------------------------------------------------- */

function AdjustStep({
  index,
  onClose,
  onBack,
  onNext,
}: {
  index: number;
  onClose: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const adjustment = ADJUSTMENTS[index];
  const isLast = index >= ADJUSTMENTS.length - 1;

  return (
    <Shell onClose={onClose} widthClass="w-[760px]">
      <CloseButton onClose={onClose} />

      <h2 className="text-[22px] font-bold text-white">
        {adjustment.title} Adjustments ({index + 1} of {ADJUSTMENTS.length})
      </h2>
      <p className="mt-1 text-[15px] text-neutral-400">{adjustment.blurb}</p>

      {/* Preview */}
      <div className="relative mt-4 aspect-[16/10] w-full overflow-hidden rounded-lg bg-gradient-to-br from-neutral-700 to-neutral-900">
        <span className="absolute bottom-3 left-3 rounded bg-black/40 px-2 py-1 text-[13px] text-white">
          Outdoor Portrait
        </span>
        <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1 text-[13px] text-white">
          <Info className="h-3.5 w-3.5" strokeWidth={1.75} />
          This is not the final edit
        </span>
      </div>

      {/* Discrete level slider */}
      <StepSlider />

      <div className="mt-6 flex items-center justify-between">
        <SecondaryButton label="Back" onClick={onBack} />
        <PrimaryButton label={isLast ? "Finish" : "Next"} onClick={onNext} />
      </div>
    </Shell>
  );
}

function StepSlider() {
  const STEPS = 9;
  const [value, setValue] = useState(2);

  return (
    <div className="relative mt-5 flex h-6 items-center">
      <div className="absolute left-0 right-0 h-1 rounded-full bg-white/15" />
      <div className="relative flex w-full items-center justify-between">
        {Array.from({ length: STEPS }).map((_, i) => {
          const active = i === value;
          return (
            <button
              key={i}
              onClick={() => setValue(i)}
              className="flex h-6 w-6 items-center justify-center"
            >
              {active ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full border-[3px] border-white bg-[#161616]" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

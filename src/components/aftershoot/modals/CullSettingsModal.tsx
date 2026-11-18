import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Info, Sparkles, Star, X } from "lucide-react";
import { Checkbox, Dropdown, RangeSlider } from "../primitives";
import { PrimaryButton, SettingsModal } from "./SettingsModal";

const CULL_PROFILES = [
  "Portrait & Headshots",
  "Wedding & Engagement",
  "Sports & Action",
  "Landscape",
  "Event",
];

type Step = "choose" | "assisted" | "automated";

export function CullSettingsModal({
  onClose,
  onStart,
}: {
  onClose: () => void;
  onStart: (mode: "assisted" | "automated") => void;
}) {
  const [step, setStep] = useState<Step>("choose");

  if (step === "choose") {
    return (
      <ChooseModeModal
        onClose={onClose}
        onAssisted={() => setStep("assisted")}
        onAutomated={() => setStep("automated")}
      />
    );
  }

  if (step === "assisted") {
    return (
      <AssistedPreferences
        onClose={onClose}
        onBack={() => setStep("choose")}
        onStart={() => onStart("assisted")}
      />
    );
  }

  return (
    <AutomatedSettings
      onClose={onClose}
      onBack={() => setStep("choose")}
      onStart={() => onStart("automated")}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Step 1 — choose cull mode                                                  */
/* -------------------------------------------------------------------------- */

function ChooseModeModal({
  onClose,
  onAssisted,
  onAutomated,
}: {
  onClose: () => void;
  onAssisted: () => void;
  onAutomated: () => void;
}) {
  const [savePrefs, setSavePrefs] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-[640px] max-w-full flex-col rounded-lg border border-white/10 bg-[#161616] p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex justify-end">
          <button
            onClick={onClose}
            className="rounded p-0.5 text-neutral-400 hover:bg-white/5 hover:text-white"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex items-stretch gap-3">
          <ModeCard
            label="AI Assisted Cull"
            heading="You Make Selections With AI Assistance"
            description="Aftershoot identifies Key Faces and groups duplicates, while you make the selections yourself."
            buttonLabel="Start AI Assisted Cull"
            onClick={onAssisted}
            variant="secondary"
            preview={<AssistedPreview />}
          />

          <div className="flex items-center">
            <span className="text-[12px] text-neutral-500">or</span>
          </div>

          <ModeCard
            label="AI Automated Cull"
            heading="AI Selects Your Best Shots"
            description="Aftershoot filters blurs, closed eyes, and duplicates, then rates images so you can review and select them faster."
            buttonLabel="Start AI Automated Cull"
            onClick={onAutomated}
            variant="primary"
            recommended
            preview={<AutomatedPreview />}
          />
        </div>

        <div className="mt-3 flex justify-end">
          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-neutral-200">
            <Checkbox checked={savePrefs} onChange={setSavePrefs} />
            Save Preferences
          </label>
        </div>
      </div>
    </div>
  );
}

function ModeCard({
  label,
  heading,
  description,
  buttonLabel,
  onClick,
  variant,
  recommended,
  preview,
}: {
  label: string;
  heading: string;
  description: string;
  buttonLabel: string;
  onClick: () => void;
  variant: "primary" | "secondary";
  recommended?: boolean;
  preview: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col rounded-lg border border-white/10 bg-[#1c1c1c] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          {label}
        </span>
        {recommended && (
          <span className="rounded border border-[#1f7a3a] px-1.5 py-0.5 text-[10px] font-medium text-[#3ec96a]">
            Recommended
          </span>
        )}
      </div>

      <div className="mb-3 overflow-hidden rounded-md bg-black/40">{preview}</div>

      <h3 className="mb-1.5 text-[14px] font-semibold leading-snug text-white">{heading}</h3>
      <p className="mb-3 flex-1 text-[11px] leading-relaxed text-neutral-400">{description}</p>

      <button
        onClick={onClick}
        className={
          variant === "primary"
            ? "flex h-9 items-center justify-center rounded-md bg-[#3b5bff] text-[12px] font-medium text-white hover:bg-[#4866ff]"
            : "flex h-9 items-center justify-center rounded-md bg-white/5 text-[12px] font-medium text-white hover:bg-white/10"
        }
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function AssistedPreview() {
  return (
    <div className="relative flex h-[110px] items-center justify-center">
      <div className="absolute left-4 top-1/2 h-[76px] w-[96px] -translate-y-1/2 rounded bg-gradient-to-br from-neutral-600 to-neutral-800">
        <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded border-2 border-white" />
      </div>
      <div className="absolute right-4 top-3 h-[48px] w-[80px] rounded bg-gradient-to-br from-neutral-700 to-neutral-900" />
      <div className="absolute bottom-3 right-4 h-[48px] w-[80px] rounded bg-gradient-to-br from-neutral-700 to-neutral-900" />
    </div>
  );
}

function AutomatedPreview() {
  return (
    <div className="relative flex h-[110px] items-center justify-center gap-3">
      <div className="relative h-[80px] w-[92px] rounded border-2 border-[#3ec96a] bg-gradient-to-br from-neutral-600 to-neutral-800">
        <Sparkles className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 text-white" />
        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded bg-[#1f7a3a]">
          <Check className="h-3 w-3 text-white" strokeWidth={3} />
        </span>
        <span className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 text-[10px] font-semibold text-white">
          5
          <Star className="h-2.5 w-2.5 fill-white text-white" strokeWidth={0} />
        </span>
      </div>
      <div className="relative h-[80px] w-[92px] rounded border-2 border-[#e0443e] bg-gradient-to-br from-neutral-700 to-neutral-900">
        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded bg-[#e0443e]">
          <X className="h-3 w-3 text-white" strokeWidth={3} />
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 2a — AI Assisted Cull preferences                                     */
/* -------------------------------------------------------------------------- */

function AssistedPreferences({
  onClose,
  onBack,
  onStart,
}: {
  onClose: () => void;
  onBack: () => void;
  onStart: () => void;
}) {
  const [profile, setProfile] = useState<string>("Portrait & Headshots");
  const [groupSize, setGroupSize] = useState(50);

  return (
    <StepModal
      title="AI Assisted Cull Preferences"
      onClose={onClose}
      onBack={onBack}
      footer={<PrimaryButton label="Start Cull" onClick={onStart} />}
    >
      <div className="flex flex-col gap-5 pt-1">
        <Dropdown value={profile} options={CULL_PROFILES} onChange={setProfile} />

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-medium text-white">Duplicate Photo Groups</span>
            <Info className="h-3.5 w-3.5 text-neutral-500" strokeWidth={1.5} />
          </div>

          <RangeSlider value={groupSize} onChange={setGroupSize} />

          <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider">
            <span className={groupSize < 33 ? "text-white" : "text-neutral-500"}>SMALL</span>
            <span
              className={groupSize >= 33 && groupSize <= 66 ? "text-white" : "text-neutral-500"}
            >
              STANDARD
            </span>
            <span className={groupSize > 66 ? "text-white" : "text-neutral-500"}>LARGE</span>
          </div>
        </div>
      </div>
    </StepModal>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 2b — AI Automated Cull settings                                       */
/* -------------------------------------------------------------------------- */

function AutomatedSettings({
  onClose,
  onBack,
  onStart,
}: {
  onClose: () => void;
  onBack: () => void;
  onStart: () => void;
}) {
  const [profile, setProfile] = useState<string>("Wedding & Engagement");
  const [amount, setAmount] = useState(50);
  const [overwriteXmp, setOverwriteXmp] = useState(false);
  const [customiseOpen, setCustomiseOpen] = useState(true);

  return (
    <StepModal
      title="AI Automated Cull Settings"
      onClose={onClose}
      onBack={onBack}
      footer={
        <>
          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-neutral-200">
            <Checkbox checked={overwriteXmp} onChange={setOverwriteXmp} />
            Overwrite image ratings XMP
          </label>
          <PrimaryButton label="Start Culling" onClick={onStart} />
        </>
      }
    >
      <div className="flex flex-col gap-4 pt-1">
        <Dropdown value={profile} options={CULL_PROFILES} onChange={setProfile} />

        <SelectionAmount value={amount} onChange={setAmount} />

        <div className="h-px bg-white/5" />

        <Customise open={customiseOpen} onToggle={() => setCustomiseOpen((v) => !v)} />
      </div>
    </StepModal>
  );
}

function SelectionAmount({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const active = value < 33 ? "few" : value > 66 ? "more" : "standard";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="flex h-[18px] items-center gap-0.5 rounded bg-[#1f7a3a] px-1.5 text-[11px] font-semibold text-white">
          5
          <Star className="h-2.5 w-2.5 fill-white text-white" strokeWidth={0} />
        </span>
        <span className="text-[12px] text-white">Amount of Selected Photos</span>
        <Info className="h-3 w-3 text-neutral-500" strokeWidth={1.5} />
      </div>

      <RangeSlider value={value} onChange={onChange} />

      <div className="flex items-center justify-between text-[10px] font-semibold tracking-wider">
        <span className={active === "few" ? "text-white" : "text-neutral-500"}>FEW</span>
        <span className={active === "standard" ? "text-white" : "text-neutral-500"}>STANDARD</span>
        <span className={active === "more" ? "text-white" : "text-neutral-500"}>MORE</span>
      </div>
    </div>
  );
}

function Customise({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1 text-left text-[13px] font-semibold text-white"
      >
        <ChevronRight
          className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${open ? "rotate-90" : ""}`}
          strokeWidth={2}
        />
        Customise
      </button>

      {open && (
        <div className="flex items-center justify-between pl-4">
          <span className="text-[12px] text-white">Stars &amp; Colors</span>
          <button
            type="button"
            className="flex h-6 items-center gap-0.5 rounded border border-white/10 bg-transparent px-2 text-[11px] text-white hover:bg-white/5"
          >
            Update
            <ChevronRight className="h-3 w-3" strokeWidth={1.75} />
          </button>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared modal shell with a back button in the header                        */
/* -------------------------------------------------------------------------- */

function StepModal({
  title,
  onClose,
  onBack,
  footer,
  children,
}: {
  title: string;
  onClose: () => void;
  onBack: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-[440px] flex-col rounded-lg border border-white/10 bg-[#1c1c1c] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 pb-2 pt-3">
          <button
            onClick={onBack}
            className="rounded p-0.5 text-neutral-400 hover:bg-white/5 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <h2 className="text-[13px] font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="ml-auto rounded p-0.5 text-neutral-400 hover:bg-white/5 hover:text-white"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-1">{children}</div>
        {footer && (
          <div className="flex items-center justify-between border-t border-white/5 px-4 py-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

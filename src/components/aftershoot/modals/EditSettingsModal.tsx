import { useState } from "react";
import { X } from "lucide-react";
import { ExploreStylesModal } from "./ExploreStylesModal";
import { EditSettingsForm } from "./EditSettingsForm";
import { InstantProfileModal } from "./InstantProfileModal";

type Step = "choose" | "explore" | "settings" | "instant";

export function EditSettingsModal({
  onClose,
  onStart,
}: {
  onClose: () => void;
  onStart: () => void;
}) {
  const [step, setStep] = useState<Step>("choose");
  // The style chosen in Explore, carried into the settings form's AI Profile.
  const [chosenProfile, setChosenProfile] = useState<string>();
  // Which step the settings form should return to (Explore vs. the Instant flow).
  const [settingsBack, setSettingsBack] = useState<Step>("explore");

  if (step === "explore") {
    return (
      <ExploreStylesModal
        onClose={onClose}
        onBack={() => setStep("choose")}
        // Picking a style (Download / Select & Customize) opens the settings
        // form pre-filled with that style, rather than editing immediately.
        onPick={(profile) => {
          setChosenProfile(profile);
          setSettingsBack("explore");
          setStep("settings");
        }}
      />
    );
  }

  if (step === "settings") {
    return (
      <EditSettingsForm
        onClose={onClose}
        onBack={() => setStep(settingsBack)}
        onStart={onStart}
        initialProfile={chosenProfile}
      />
    );
  }

  if (step === "instant") {
    return (
      <InstantProfileModal
        onClose={onClose}
        // Finishing the guided adjustments drops the user into the Edit Settings
        // panel with their newly created Instant AI Profile pre-selected.
        onFinish={(profileName) => {
          setChosenProfile(profileName);
          setSettingsBack("instant");
          setStep("settings");
        }}
      />
    );
  }

  return (
    <StartEditingModal
      onClose={onClose}
      onExplore={() => setStep("explore")}
      onInstant={() => setStep("instant")}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Step 1 — choose an editing path                                            */
/* -------------------------------------------------------------------------- */

function StartEditingModal({
  onClose,
  onExplore,
  onInstant,
}: {
  onClose: () => void;
  onExplore: () => void;
  onInstant: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={onClose}
    >
      <div
        className="relative flex w-[820px] max-w-full flex-col rounded-xl border border-white/10 bg-[#161616] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-white">Start Editing</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex items-stretch gap-3">
          <EditCard
            label="Browse Pre-built Profiles"
            recommended
            heading="Browse Pre-built Profiles"
            description="Look through pre-built AI Styles from Aftershoot and Creators, find an editing style that suits you, and jump straight into editing."
            buttonLabel="Explore"
            onClick={onExplore}
            preview={<BrowsePreview />}
          />

          <div className="flex items-center">
            <span className="text-[13px] text-neutral-500">or</span>
          </div>

          <EditCard
            label="Professional AI Profile"
            heading="Professional AI profile"
            description="Upload at least 2,500 of your own edited images from Lightroom or Capture One to train an AI Profile that mirrors your editing style."
            buttonLabel="Create"
            onClick={onClose}
            preview={<ProfessionalPreview />}
          />

          <EditCard
            label="Instant AI Profile"
            heading="Instant AI Profile"
            description="Upload your favorite Lightroom preset to create an AI Profile in just a couple of minutes and edit your images in the same style."
            buttonLabel="Create"
            onClick={onInstant}
            preview={<InstantPreview />}
          />
        </div>
      </div>
    </div>
  );
}

function EditCard({
  label,
  recommended,
  heading,
  description,
  buttonLabel,
  onClick,
  preview,
}: {
  label: string;
  recommended?: boolean;
  heading: string;
  description: string;
  buttonLabel: string;
  onClick: () => void;
  preview: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col rounded-lg border border-white/[0.07] bg-[#1c1c1c] p-3.5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          {label}
        </span>
        {recommended && (
          <span className="rounded-md border border-[#1f7a3a] px-1.5 py-0.5 text-[11px] font-medium text-[#3ec96a]">
            Recommended
          </span>
        )}
      </div>

      <div className="mb-4 overflow-hidden rounded-md bg-black/40">{preview}</div>

      <h3 className="mb-1.5 text-[16px] font-semibold leading-tight text-white">{heading}</h3>
      <p className="mb-4 flex-1 text-[12.5px] leading-relaxed text-neutral-400">{description}</p>

      <button
        onClick={onClick}
        className="flex h-10 items-center justify-center rounded-lg bg-white/[0.06] text-[13px] font-medium text-white hover:bg-white/10"
      >
        {buttonLabel}
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Faux previews                                                              */
/* -------------------------------------------------------------------------- */

function BrowsePreview() {
  return (
    <div className="relative flex aspect-[16/9] w-full items-center justify-center">
      <div className="absolute inset-3 grid grid-cols-3 gap-1.5 opacity-40">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded bg-gradient-to-br from-neutral-600 to-neutral-800" />
        ))}
      </div>
      <div className="relative z-10 w-[150px] rounded-lg border-2 border-[#3b5bff] bg-[#1c1c1c] p-2 shadow-xl">
        <div className="mb-1.5 h-16 rounded bg-gradient-to-br from-neutral-500 to-neutral-700" />
        <div className="text-[11px] font-semibold text-white">True to Life</div>
        <div className="text-[9px] text-neutral-500">by Aftershoot</div>
      </div>
    </div>
  );
}

function ProfessionalPreview() {
  return (
    <div className="relative flex aspect-[16/9] w-full items-center justify-center">
      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-8 rounded bg-gradient-to-br from-neutral-600 to-neutral-800"
          />
        ))}
      </div>
      <span className="absolute rounded-md border border-white/15 bg-black/80 px-3 py-1.5 text-[12px] font-medium text-white">
        One Consistent Style
      </span>
    </div>
  );
}

function InstantPreview() {
  return (
    <div className="flex aspect-[16/9] w-full items-center justify-center gap-3">
      <div className="flex h-[100px] w-[80px] flex-col items-center justify-end rounded-md bg-gradient-to-br from-neutral-700 to-neutral-900 p-2">
        <span className="rounded bg-[#3b5bff] px-1.5 py-0.5 text-[9px] font-semibold text-white">
          Lr
        </span>
      </div>
      <div className="relative h-[110px] w-[88px] rounded-md border-2 border-[#3b5bff] bg-gradient-to-br from-neutral-600 to-neutral-800">
        <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-medium text-white">
          Portra 400 AI Profile
        </span>
      </div>
    </div>
  );
}

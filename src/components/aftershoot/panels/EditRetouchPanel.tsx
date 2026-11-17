import { useState } from "react";
import type { ActionStatus } from "../action-status";
import { EditingSection, SectionToggle } from "./AIEditingPanel";
import { RetouchingContent } from "./AIRetouchingPanel";

// UI-2 grid-view "Edit & Retouch" rail tab: one panel with a collapsible
// Editing section (AI profile + Edit button; Quick Edits once AI Edit has
// run) above a collapsible Retouching section.
//
// The one-tab layout uses the same panel with `withTools`: the AI Crop &
// Straighten / Masking / Denoise toggles stay inside Editing (no AI Tools tab).
export function EditRetouchPanel({
  editStatus,
  onRunEdit,
  onBrowseProfiles,
  withTools = false,
}: {
  editStatus: ActionStatus;
  onRunEdit: () => void;
  onBrowseProfiles: () => void;
  withTools?: boolean;
}) {
  const [retouchOpen, setRetouchOpen] = useState(true);
  return (
    <div className="-mr-2 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-2">
      <EditingSection status={editStatus} onRunEdit={onRunEdit}
        onBrowseProfiles={onBrowseProfiles}
        withProfile withTools={withTools} />
      <div className="-mx-3 h-px shrink-0 bg-white/5" />
      <section className="flex shrink-0 flex-col gap-3">
        <SectionToggle
          title="Retouching"
          open={retouchOpen}
          onToggle={() => setRetouchOpen((v) => !v)}
        />
        {retouchOpen && <RetouchingContent />}
      </section>
    </div>
  );
}

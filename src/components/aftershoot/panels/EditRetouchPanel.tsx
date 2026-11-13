import { useState } from "react";
import type { ActionStatus } from "../action-status";
import { EditingSection, SectionToggle } from "./AIEditingPanel";
import { RetouchingContent } from "./AIRetouchingPanel";

// UI-2 grid-view "Edit & Retouch" rail tab: one panel with a collapsible
// Editing section (AI profile + Edit button; Quick Edits once AI Edit has
// run) above a collapsible Retouching section.
export function EditRetouchPanel({
  editStatus,
  onRunEdit,
}: {
  editStatus: ActionStatus;
  onRunEdit: () => void;
}) {
  const [retouchOpen, setRetouchOpen] = useState(true);
  return (
    <div className="-mr-2 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-2">
      <EditingSection status={editStatus} onRunEdit={onRunEdit} withProfile />
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

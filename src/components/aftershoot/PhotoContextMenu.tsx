import { createContext, useContext, type ReactNode } from "react";
import * as CM from "@radix-ui/react-context-menu";
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  CaretRight,
  ClipboardText,
  Clock,
  Copy,
  Crosshair,
  Flag,
  FolderSimple,
  ImageSquare,
  Monitor,
  SquareSplitHorizontal,
  Star,
  Trash,
  UploadSimple,
  WarningCircle,
} from "@phosphor-icons/react";
import { COLOR_HEX, COLOR_NAME_TO_RATING, type ColorName } from "./rating";

// One right-click menu for every tab (Culling / Editing / Retouching) and view
// (Loupe / Grid / Survey / Filmstrip). Items and order are the same everywhere;
// an item only appears where its feature exists, and an item that can't run
// right now stays visible but greyed out. Styled from the Figma "Drop Down
// Wrapper" (Playground Q4-26, node 189:43014).

export type MenuSurface = "loupe" | "grid" | "survey" | "film";
export type MenuTab = "Culling" | "Editing" | "Retouching";

export type PhotoMenuApi = {
  tab: MenuTab;
  /** The view the user is in (the filmstrip lives inside Loupe / Survey). */
  view: "grid" | "loupe" | "survey";
  /** Multi-selection in Grid; other surfaces act on the one photo clicked. */
  selection: Set<number>;
  flagged: Set<number>;
  busy: boolean;
  surveyAvailable: boolean;
  canPaste: boolean;
  /** Right-click landed on a photo outside the selection: make it the selection. */
  prepare: (id: number) => void;
  rate: (ids: number[], stars: number) => void;
  toggleFlag: (ids: number[]) => void;
  openLoupe: (id: number) => void;
  openSurvey: (id: number) => void;
  rotate: (ids: number[], dir: "left" | "right") => void;
  copyEdits: (id: number) => void;
  pasteEdits: (ids: number[]) => void;
  exportTo: (ids: number[], target: string) => void;
  reveal: (id: number) => void;
  setAlbumCover: (id: number) => void;
  editCaptureTime: (ids: number[]) => void;
  reportIssue: (id: number) => void;
  remove: (ids: number[]) => void;
};

export const PhotoMenuContext = createContext<PhotoMenuApi | null>(null);

const COLORS: { name: ColorName | "none"; hex: string; label: string }[] = [
  { name: "green", hex: COLOR_HEX.green, label: "Green" },
  { name: "blue", hex: COLOR_HEX.blue, label: "Blue" },
  { name: "yellow", hex: COLOR_HEX.yellow, label: "Yellow" },
  { name: "red", hex: COLOR_HEX.red, label: "Red" },
  { name: "purple", hex: COLOR_HEX.purple, label: "Purple" },
  { name: "none", hex: "#8a8a8a", label: "None" },
];

// Figma cell: 8px sides, 8px top/bottom, 4px radius, 6px gap, 12px medium text.
const CELL =
  "flex cursor-default select-none items-center gap-1.5 rounded px-2 py-2 text-[12px] font-medium leading-4 text-[#ababab] outline-none data-[highlighted]:bg-[rgba(226,226,226,0.1)] data-[highlighted]:text-[#e2e2e2] data-[state=open]:bg-[rgba(226,226,226,0.1)] data-[state=open]:text-[#e2e2e2] data-[disabled]:pointer-events-none data-[disabled]:text-[#5a5a5a]";
const PANEL =
  "z-[200] flex flex-col gap-0.5 rounded-lg border border-[#474747] bg-[#242424] p-1 font-[Geist,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] shadow-2xl";
const ICON = 16;

function Divider() {
  return <CM.Separator className="h-px shrink-0 bg-[#474747]" />;
}

function Item({
  icon,
  label,
  onSelect,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <CM.Item disabled={disabled} onSelect={onSelect} className={CELL}>
      {icon !== null && (
        <span className="flex size-4 shrink-0 items-center justify-center">{icon}</span>
      )}
      <span className="flex-1 truncate">{label}</span>
    </CM.Item>
  );
}

function SubItem({
  icon,
  label,
  strip,
  children,
}: {
  icon?: ReactNode;
  label: string;
  /** A horizontal row of options (stars, colours): sized to its content. */
  strip?: boolean;
  children: ReactNode;
}) {
  return (
    <CM.Sub>
      <CM.SubTrigger className={CELL}>
        {icon !== undefined && (
          <span className="flex size-4 shrink-0 items-center justify-center">{icon}</span>
        )}
        <span className="flex-1 truncate">{label}</span>
        <CaretRight size={12} weight="bold" className="shrink-0" />
      </CM.SubTrigger>
      <CM.Portal>
        <CM.SubContent
          sideOffset={6}
          alignOffset={-4}
          className={`${PANEL} ${strip ? "" : "w-[218px]"}`}
        >
          {children}
        </CM.SubContent>
      </CM.Portal>
    </CM.Sub>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="px-2 py-2 text-[12px] font-semibold uppercase leading-4 tracking-[0.5px] text-[#777]">
      {children}
    </div>
  );
}

export function PhotoContextMenu({
  id,
  surface,
  children,
}: {
  /** The photo this trigger belongs to. */
  id: number;
  surface: MenuSurface;
  children: ReactNode;
}) {
  const api = useContext(PhotoMenuContext);
  if (!api) return <>{children}</>;

  const multiSurface = surface === "grid" || (surface === "film" && api.view === "loupe");
  const ids =
    multiSurface && api.selection.has(id) ? [...api.selection].sort((a, b) => a - b) : [id];
  const multi = ids.length > 1;
  const noun = `${ids.length} photos`;
  const cull = api.tab === "Culling";
  const allFlagged = ids.every((i) => api.flagged.has(i));

  return (
    <CM.Root>
      <CM.Trigger asChild onContextMenu={() => multiSurface && api.prepare(id)}>
        {children}
      </CM.Trigger>
      <CM.Portal>
        <CM.Content className={`${PANEL} w-[218px]`} alignOffset={4} collisionPadding={8}>
          {/* Export (Editing and Retouching only) */}
          {!cull && (
            <>
              <SubItem
                icon={<UploadSimple size={ICON} />}
                label={multi ? `Export ${noun}` : "Export Photo"}
              >
                <Item
                  icon={<FolderSimple size={ICON} weight="fill" />}
                  label="Export to Folder…"
                  onSelect={() => api.exportTo(ids, "Folder")}
                />
                <Divider />
                <SectionTitle>Export to</SectionTitle>
                <Item
                  icon={null}
                  label="Lightroom Classic"
                  onSelect={() => api.exportTo(ids, "Lightroom Classic")}
                />
                <Item
                  icon={null}
                  label="Photoshop"
                  onSelect={() => api.exportTo(ids, "Photoshop")}
                />
                <SubItem label="Other Apps">
                  <Item
                    icon={null}
                    label="Lightroom"
                    onSelect={() => api.exportTo(ids, "Lightroom")}
                  />
                  <Item
                    icon={null}
                    label="Capture One"
                    onSelect={() => api.exportTo(ids, "Capture One")}
                  />
                  <Item
                    icon={null}
                    label="Adobe Bridge"
                    onSelect={() => api.exportTo(ids, "Adobe Bridge")}
                  />
                </SubItem>
              </SubItem>
              <Divider />
            </>
          )}

          {/* Rate & label */}
          <SubItem strip icon={<Star size={ICON} weight="fill" />} label="Change Stars">
            <div className="flex flex-row gap-0.5">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <CM.Item
                  key={n}
                  aria-label={`${n} stars`}
                  onSelect={() => api.rate(ids, n)}
                  className={`${CELL} relative !p-1.5`}
                >
                  <Star size={22} weight="fill" />
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center pt-px text-[9px] font-bold text-[#242424]">
                    {n}
                  </span>
                </CM.Item>
              ))}
            </div>
          </SubItem>
          <SubItem
            strip
            icon={
              <span className="size-3.5 rounded-full" style={{ background: COLOR_HEX.green }} />
            }
            label="Change Colors"
          >
            <div className="flex flex-row gap-0.5">
              {COLORS.map((c) => (
                <CM.Item
                  key={c.name}
                  aria-label={c.label}
                  onSelect={() =>
                    api.rate(ids, c.name === "none" ? 0 : COLOR_NAME_TO_RATING[c.name])
                  }
                  className={`${CELL} !p-2`}
                >
                  <span className="size-4 rounded-full" style={{ background: c.hex }} />
                </CM.Item>
              ))}
            </div>
          </SubItem>
          <Item
            icon={<Flag size={ICON} />}
            label={allFlagged ? "Unflag the image" : "Flag the image"}
            onSelect={() => api.toggleFlag(ids)}
          />

          {/* View */}
          {(surface !== "loupe" || (cull && api.view !== "survey")) && <Divider />}
          {surface !== "loupe" && (
            <Item
              icon={<Monitor size={ICON} />}
              label="Open in Loupe view"
              onSelect={() => api.openLoupe(id)}
            />
          )}
          {cull && api.view !== "survey" && (
            <Item
              icon={<SquareSplitHorizontal size={ICON} />}
              label="Open in Survey Mode"
              disabled={!api.surveyAvailable}
              onSelect={() => api.openSurvey(id)}
            />
          )}

          {/* Transform */}
          <Divider />
          <Item
            icon={<ArrowCounterClockwise size={ICON} />}
            label={multi ? `Rotate ${noun} left` : "Rotate Image Left"}
            onSelect={() => api.rotate(ids, "left")}
          />
          <Item
            icon={<ArrowClockwise size={ICON} />}
            label={multi ? `Rotate ${noun} right` : "Rotate Image Right"}
            onSelect={() => api.rotate(ids, "right")}
          />

          {/* Edit settings (Editing and Retouching only) */}
          {!cull && (
            <>
              <Divider />
              <Item
                icon={<Copy size={ICON} />}
                label="Copy Edit Settings"
                disabled={multi}
                onSelect={() => api.copyEdits(id)}
              />
              <Item
                icon={<ClipboardText size={ICON} />}
                label={multi ? `Paste Edit Settings to ${noun}` : "Paste Edit Settings"}
                disabled={!api.canPaste}
                onSelect={() => api.pasteEdits(ids)}
              />
            </>
          )}

          {/* File & export */}
          <Divider />
          <Item
            icon={<Crosshair size={ICON} />}
            label="Reveal in Finder"
            onSelect={() => api.reveal(id)}
          />
          <Item
            icon={<ImageSquare size={ICON} />}
            label="Set as Album Cover"
            disabled={multi}
            onSelect={() => api.setAlbumCover(id)}
          />
          <Item
            icon={<Clock size={ICON} />}
            label="Edit Capture Time"
            onSelect={() => api.editCaptureTime(ids)}
          />

          {/* Feedback */}
          <Divider />
          <Item
            icon={<WarningCircle size={ICON} />}
            label="Report AI issues"
            onSelect={() => api.reportIssue(id)}
          />

          {/* Delete */}
          <Divider />
          <Item
            icon={<Trash size={ICON} />}
            label={multi ? `Delete ${noun}` : "Delete Photo"}
            disabled={api.busy}
            onSelect={() => api.remove(ids)}
          />
        </CM.Content>
      </CM.Portal>
    </CM.Root>
  );
}

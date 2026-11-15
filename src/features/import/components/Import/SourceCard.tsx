import { useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowSquareOut,
  Check,
  Checkbox,
  Chevron,
  DotsThreeVertical,
  Eject,
  HardDrive,
  IconButton,
  Laptop,
  Menu,
  SimCard,
  Trash,
  colors,
  radius,
  spacing,
  stroke,
  surface,
  textStyle,
} from "../../ui-kit";
import type { Icon, MenuEntry } from "../../ui-kit";
import { buildFolderTree, splitPath } from "../../lib/importPhotos";
import type { FolderNode } from "../../lib/importPhotos";
import { useCullStore } from "../../store/useCullStore";
import { useImportStore } from "../../store/useImportStore";
import type { ImportSource, SourceKind } from "../../types";

const OPTIONS_ICON_SIZE = 12;
const SOURCE_ICON_SIZE = 16;

/** What a source is read from: a memory card, an external drive, or this computer's own drive. */
const SOURCE_KIND_ICONS: Record<SourceKind, Icon> = {
  card: SimCard,
  external: HardDrive,
  internal: Laptop,
};
const ROW_HEIGHT = 24;
/** Each level of folders steps in by a caret's width plus the row's gap, so a child's caret sits under its parent's checkbox. */
const CARET_SIZE = 12;
const ROW_GAP = spacing[8];
const LEVEL_INDENT = `calc(${CARET_SIZE}px + ${ROW_GAP})`;
/** Space between a folder's row and its children, and between sibling folders, as in the design. */
const TREE_GAP = spacing[8];
/** The folder block's own bottom padding; a closed tree tops it up to the same 8px as the top. */
const SHELL_BOTTOM_PADDING = spacing[2];
/** What a closed tree adds to reach TREE_GAP. */
const SHELL_TOP_UP = `calc(${TREE_GAP} - ${SHELL_BOTTOM_PADDING})`;

interface SourceCardShellProps {
  source: ImportSource;
  /** Rendered at the right of the name row: a count, an options button. */
  trailing?: ReactNode;
  /** The rows under the name: folders, or whatever else the screen shows for the source. */
  children?: ReactNode;
}

/** Picked files are shown under the folder they came from, like a folder is, instead of repeating "2 files from Exports" in the header and again in the row. */
const sourceTitle = (source: ImportSource) =>
  source.isFileSelection ? splitPath(source.path).leaf : source.name;

/** The block every Source panel is made of: a bordered row with the source's icon and name, and a raised block of rows beneath it. */
export function SourceCardShell({
  source,
  trailing,
  children,
}: SourceCardShellProps) {
  const SourceIcon = SOURCE_KIND_ICONS[source.kind];
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing[8],
          padding: `${spacing[8]} ${spacing[12]}`,
          border: `${stroke[2]} solid ${surface.elevated}`,
        }}
      >
        <span
          style={{
            minWidth: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: spacing[4],
            ...textStyle("label-13"),
            color: colors.type.secondary,
          }}
        >
          <SourceIcon
            size={SOURCE_ICON_SIZE}
            style={{ flexShrink: 0 }}
            aria-hidden
          />
          <span
            style={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {sourceTitle(source)}
          </span>
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: spacing[4],
            flexShrink: 0,
          }}
        >
          {trailing}
        </span>
      </div>
      {children && (
        <div
          style={{
            display: "flex",
            flexDirection: "column", // Inset by the name row's border as well as its padding, so a folder's checkbox starts under the first letter of the name above.
            padding: `${spacing[8]} calc(${spacing[12]} + ${stroke[2]}) ${spacing[2]}`,
            background: surface.elevated,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export interface SourceFolderRowProps {
  label: string;
  count: number;
  /** Without these, the row is plain text: a copied source's folder, say. */
  selection?: {
    checked: boolean;
    indeterminate: boolean;
    onChange: () => void;
  };
  /** A disclosure caret before the checkbox, or 'spacer' to leave its room empty so the checkbox lines up with sibling rows that have one. */
  caret?: { isOpen: boolean; onToggle: () => void } | "spacer";
}

/** One row in a source block: caret, a small checkbox with the folder's name, and its photo count at the right. */
export function SourceFolderRow({
  label,
  count,
  selection,
  caret,
}: SourceFolderRowProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: ROW_GAP,
        height: ROW_HEIGHT,
      }}
    >
      {caret === "spacer" && (
        <span style={{ width: CARET_SIZE, flexShrink: 0 }} />
      )}
      {caret && caret !== "spacer" && (
        <button
          type="button"
          aria-label={caret.isOpen ? "Collapse" : "Expand"}
          onClick={caret.onToggle}
          style={{
            display: "inline-flex",
            width: CARET_SIZE,
            justifyContent: "center",
            background: "none",
            border: "none",
            padding: 0,
          }}
        >
          <Chevron open={caret.isOpen} />
        </button>
      )}
      <span style={{ flex: 1, minWidth: 0, display: "inline-flex" }}>
        {selection ? (
          <Checkbox
            size="sm"
            checked={selection.checked}
            indeterminate={selection.indeterminate}
            label={label}
            onChange={selection.onChange}
          />
        ) : (
          <span
            style={{ ...textStyle("body-13"), color: colors.type.secondary }}
          >
            {label}
          </span>
        )}
      </span>
      <span
        style={{
          fontVariantNumeric: "tabular-nums",
          color: colors.type.disabled,
          ...textStyle("body-11"),
        }}
      >
        {count}
      </span>
    </div>
  );
}

/** The "..." button on a source block, with Show in Finder, Remove, and any extra entries (e.g. Include subfolders). */
export function SourceOptionsButton({
  source,
  canRemove = true,
  extraEntries = [],
}: {
  source: ImportSource;
  canRemove?: boolean;
  extraEntries?: MenuEntry[];
}) {
  const removeSource = useImportStore((s) => s.removeSource);
  const showToast = useCullStore((s) => s.showToast);
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);

  return (
    <>
      <span ref={anchorRef} style={{ display: "inline-flex" }}>
        <IconButton
          icon={DotsThreeVertical}
          iconSize={OPTIONS_ICON_SIZE}
          hasTooltip={false}
          label={`Options for ${sourceTitle(source)}`}
          onClick={() => setIsOpen((open) => !open)}
        />
      </span>
      <Menu
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        anchorRef={anchorRef}
        align="right"
        entries={[
          {
            key: "finder",
            label: "Show in Finder",
            icon: ArrowSquareOut,
            onSelect: () => showToast(`Opens Finder at ${source.path}`),
          },
          ...(canRemove
            ? [
                {
                  key: "remove",
                  label: "Remove",
                  icon: Trash,
                  isDanger: true,
                  onSelect: () => removeSource(source.id),
                },
              ]
            : []),
          ...(extraEntries.length
            ? [{ kind: "divider" as const, key: "divider" }, ...extraEntries]
            : []),
        ]}
      />
    </>
  );
}

interface FolderAccordionProps {
  node: FolderNode;
  depth: number;
  /** Renders a folder's own row; `caret` is set when the folder has folders under it. */
  renderRow: (
    node: FolderNode,
    caret: SourceFolderRowProps["caret"],
  ) => ReactNode;
  isOpen: (node: FolderNode) => boolean;
  onToggle: (node: FolderNode) => void;
}

/** One folder and, when it is open, the folders under it, stepped in a level. Gaps follow the design: 8px above the children and between siblings. */
function FolderAccordion({
  node,
  depth,
  renderRow,
  isOpen,
  onToggle,
}: FolderAccordionProps) {
  const hasChildren = node.children.length > 0;
  const open = hasChildren && isOpen(node);
  // A root with nothing under it needs no caret; deeper rows keep its room so checkboxes line up with their siblings'.
  const caret = hasChildren
    ? { isOpen: open, onToggle: () => onToggle(node) }
    : depth > 0
      ? ("spacer" as const)
      : undefined;

  return (
    // A root with no open folders beneath it still gets the bottom room an open one gets from its children, so the block is even top and bottom.
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        paddingBottom: depth === 0 && !open ? SHELL_TOP_UP : 0,
      }}
    >
      {renderRow(node, caret)}
      {open && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: TREE_GAP,
            paddingLeft: LEVEL_INDENT,
            paddingTop: TREE_GAP,
            paddingBottom: depth === 0 ? TREE_GAP : 0,
          }}
        >
          {node.children.map((child) => (
            <FolderAccordion
              key={child.path}
              node={child}
              depth={depth + 1}
              renderRow={renderRow}
              isOpen={isOpen}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const SEAL_SIZE = 16;

/** The small green seal on a source that has been ingested: the source's work is done. */
function IngestedMark() {
  return (
    <span
      role="img"
      aria-label="Ingested"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: SEAL_SIZE,
        height: SEAL_SIZE,
        boxSizing: "border-box",
        borderRadius: radius.full,
        background: surface.selected,
        border: `${stroke[0]} solid ${colors.edge.selected}`,
        backdropFilter: "blur(2px)",
      }}
    >
      <Check size={10} weight="bold" color={colors.type.white} />
    </span>
  );
}

/** The body shared by sources that are already settled: a plain line saying what happened and where, with the count at the right. */
function SourceStatusCard({
  source,
  status,
  location,
  trailing,
}: {
  source: ImportSource;
  status: string;
  location: string;
  trailing?: ReactNode;
}) {
  return (
    <SourceCardShell source={source} trailing={trailing}>
      {/* The block's own bottom padding is only 2px, so the line tops it up to the 8px the top has. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing[8],
          height: ROW_HEIGHT,
          marginBottom: SHELL_TOP_UP,
          minWidth: 0,
          ...textStyle("body-13"),
          color: colors.type.muted,
        }}
      >
        <span
          style={{
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {status} • {splitPath(location).leaf}
        </span>
        <span
          style={{
            flexShrink: 0,
            fontVariantNumeric: "tabular-nums",
            color: colors.type.disabled,
            ...textStyle("body-11"),
          }}
        >
          {source.photos.length}
        </span>
      </div>
    </SourceCardShell>
  );
}

/** An ingested source, the same in both options: a green seal, and where it was ingested to. */
export function CopiedSourceCard({ source }: { source: ImportSource }) {
  const showToast = useCullStore((s) => s.showToast);
  // Only a card or an external drive can be taken out; an ingested card is safe to eject.
  const isRemovable = source.kind === "card" || source.kind === "external";
  // Once ejected the button stays but is disabled, so the card still shows what happened.
  const [isEjected, setIsEjected] = useState(false);
  return (
    <SourceStatusCard
      source={source}
      status="Ingested"
      location={
        source.copySettings ? source.copySettings.destination : source.path
      }
      trailing={
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: spacing[8],
          }}
        >
          {isRemovable && (
            <IconButton
              icon={Eject}
              label={isEjected ? "Ejected" : `Eject ${source.name}`}
              variant="flat"
              iconWeight="fill"
              disabled={isEjected}
              onClick={() => {
                setIsEjected(true);
                showToast(`${source.name} ejected. Safe to remove.`);
              }}
            />
          )}
          <IngestedMark />
        </span>
      }
    />
  );
}

/** A source still to be copied: its folder tree, each folder with a checkbox that drives the grid's selection. */
export function PendingSourceCard({ source }: { source: ImportSource }) {
  const hiddenIds = useImportStore((s) => s.hiddenIds);
  const setPhotosHidden = useImportStore((s) => s.setPhotosHidden);
  const setIncludeSubfolders = useImportStore((s) => s.setIncludeSubfolders);
  // Only the root starts open; a folder the user has opened or closed is remembered by its path.
  const [openPaths, setOpenPaths] = useState<Record<string, boolean>>({
    "": true,
  });

  // The counts are what is on the source, whatever the toolbar's file-type filter or the selection: those only change the preview.
  const tree = buildFolderTree(
    source.photos.filter(
      (photo) => source.includeSubfolders || !photo.isInSubfolder,
    ),
    source.kind === "card"
      ? "DCIM"
      : source.isFileSelection
        ? "Files"
        : source.name,
  );

  return (
    <SourceCardShell
      source={source}
      trailing={
        <SourceOptionsButton
          source={source}
          extraEntries={
            source.isFileSelection
              ? []
              : [
                  {
                    key: "subfolders",
                    label: "Include subfolders",
                    hasCheckbox: true,
                    isChecked: source.includeSubfolders,
                    onSelect: () =>
                      setIncludeSubfolders(
                        source.id,
                        !source.includeSubfolders,
                      ),
                  },
                ]
          }
        />
      }
    >
      <FolderAccordion
        node={tree}
        depth={0}
        isOpen={(node) => !!openPaths[node.path]}
        onToggle={(node) =>
          setOpenPaths((prev) => ({ ...prev, [node.path]: !prev[node.path] }))
        }
        renderRow={(node, caret) => {
          // A folder is checked while its photos are shown in the grid; unchecking it takes them out of the grid.
          const count = node.photos.filter(
            (photo) => !hiddenIds.has(photo.id),
          ).length;
          const isAll = node.photos.length > 0 && count === node.photos.length;
          return (
            <SourceFolderRow
              label={node.name}
              count={node.photos.length}
              caret={caret}
              selection={{
                checked: isAll,
                indeterminate: count > 0 && !isAll,
                onChange: () =>
                  setPhotosHidden(
                    node.photos.map((p) => p.id),
                    isAll,
                  ),
              }}
            />
          );
        }}
      />
    </SourceCardShell>
  );
}

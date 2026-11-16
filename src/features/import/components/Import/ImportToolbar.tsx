import { useRef, useState } from "react";
import {
  ArrowsDownUp,
  Button,
  CaretDown,
  CheckboxMark,
  Funnel,
  GridFour,
  IconButton,
  Image,
  ListBullets,
  Menu,
  Pill,
  colors,
  hoverTransition,
  radius,
  spacing,
  stroke,
  surface,
  textStyle,
} from "../../ui-kit";
import { isRatedInCamera } from "../../lib/importPhotos";
import type { GroupBy, FileTypeFilter, SortBy } from "../../lib/importPhotos";
import { useCullStore } from "../../store/useCullStore";
import { useImportStore } from "../../store/useImportStore";
import type { ImportFileType, ImportPhoto } from "../../types";

interface ImportToolbarProps {
  fileTypes: FileTypeFilter;
  onToggleFileType: (type: ImportFileType) => void;
  sortBy: SortBy;
  isSortAscending: boolean;
  onSortByChange: (sortBy: SortBy) => void;
  onSortAscendingChange: (isAscending: boolean) => void;
  /** Option 1 can group the grid by source or capture date; leave out to hide the control. */
  groupBy?: GroupBy;
  onGroupByChange?: (groupBy: GroupBy) => void;
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  /** Option 3's selection menu works on the photos on screen. */
  photos?: ImportPhoto[];
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: string[], isSelected: boolean) => void;
}

const GROUP_BY_LABELS: Record<GroupBy, string> = {
  none: "None",
  source: "Source",
  date: "Capture Date",
};
const FILE_TYPE_LABELS: Record<ImportFileType, string> = {
  raw: "RAW",
  jpg: "JPEG / TIFF",
};

/** The same Group By trigger in both toolbars: muted label, brighter value. */
function GroupByControl({
  groupBy,
  onGroupByChange,
  options = ["none", "source", "date"],
}: {
  groupBy: GroupBy;
  onGroupByChange: (groupBy: GroupBy) => void;
  options?: GroupBy[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: spacing[4],
          height: 24,
          padding: `0 ${spacing[8]}`,
          border: "none",
          borderRadius: radius.sm,
          background: isOpen || isHovered ? surface.clearHover : surface.clear,
          color: colors.type.disabled,
          cursor: "pointer",
          transition: hoverTransition,
          ...textStyle("body-12"),
        }}
      >
        Group By:
        <span style={{ color: colors.type.muted }}>
          {GROUP_BY_LABELS[groupBy]}
        </span>
        <CaretDown size={16} />
      </button>
      <Menu
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        anchorRef={anchorRef}
        entries={options.map((key) => ({
          key,
          label: GROUP_BY_LABELS[key],
          isChecked: groupBy === key,
          onSelect: () => onGroupByChange(key),
        }))}
      />
    </>
  );
}

function ToolbarDivider() {
  return (
    <span
      aria-hidden
      style={{
        width: stroke[1],
        height: 20,
        background: colors.edge.default,
        flexShrink: 0,
      }}
    />
  );
}

/** Option 3: a selection checkbox with a menu, a list / grid switch, sort, group by, and the count. */
function ListToolbar({
  fileTypes,
  onToggleFileType,
  sortBy,
  isSortAscending,
  onSortByChange,
  onSortAscendingChange,
  groupBy,
  onGroupByChange,
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  photos = [],
  selectedIds = new Set(),
  onSelectionChange,
}: ImportToolbarProps) {
  const viewMode = useImportStore((s) => s.viewMode);
  const setViewMode = useImportStore((s) => s.setViewMode);
  const isInPlace = useImportStore((s) => s.isInPlace);
  const [isSelectMenuOpen, setIsSelectMenuOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const selectAnchorRef = useRef<HTMLDivElement>(null);
  const filterAnchorRef = useRef<HTMLButtonElement>(null);
  const sortAnchorRef = useRef<HTMLButtonElement>(null);

  const isAll = totalCount > 0 && selectedCount === totalCount;
  const isSome = selectedCount > 0 && !isAll;

  /** Selects exactly the photos that pass, clearing the rest. */
  function selectOnly(keep: (photo: ImportPhoto) => boolean) {
    onSelectionChange?.(
      photos.filter((p) => !keep(p)).map((p) => p.id),
      false,
    );
    onSelectionChange?.(
      photos.filter(keep).map((p) => p.id),
      true,
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing[8],
        padding: `${spacing[8]} ${spacing[12]}`,
        whiteSpace: "nowrap",
        flexShrink: 0,
        overflow: "hidden",
        borderBottom: `${stroke[1]} solid ${colors.edge.default}`,
      }}
    >
      <div
        ref={selectAnchorRef}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: spacing[4],
        }}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={isSome ? "mixed" : isAll}
          aria-label="Select all"
          disabled={totalCount === 0}
          onClick={() => (isAll ? onDeselectAll() : onSelectAll())}
          style={{
            display: "inline-flex",
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          <CheckboxMark checked={isAll} indeterminate={isSome} />
        </button>
        <IconButton
          icon={CaretDown}
          label="Selection options"
          hasTooltip={false}
          variant="flat"
          active={isSelectMenuOpen}
          onClick={() => setIsSelectMenuOpen((open) => !open)}
        />
      </div>
      <Menu
        isOpen={isSelectMenuOpen}
        onClose={() => setIsSelectMenuOpen(false)}
        anchorRef={selectAnchorRef}
        entries={[
          { key: "all", label: "All", onSelect: onSelectAll },
          { key: "none", label: "None", onSelect: onDeselectAll },
          {
            key: "invert",
            label: "Invert Selection",
            onSelect: () => {
              onSelectionChange?.(
                photos.filter((p) => selectedIds.has(p.id)).map((p) => p.id),
                false,
              );
              onSelectionChange?.(
                photos.filter((p) => !selectedIds.has(p.id)).map((p) => p.id),
                true,
              );
            },
          },
          { kind: "divider", key: "rated-divider" },
          {
            key: "rated",
            label: "Images Locked in Camera",
            onSelect: () => selectOnly(isRatedInCamera),
          },
        ]}
      />
      {/* Photos used in place are always shown as a grid, so there is nothing to switch. */}
      {!isInPlace && (
        <>
          <ToolbarDivider />
          <IconButton
            icon={ListBullets}
            label="List view"
            hasTooltip={false}
            active={viewMode === "list"}
            onClick={() => {
              setViewMode("list");
              // A list is always grouped, so leaving it ungrouped isn't possible.
              if (groupBy === "none") onGroupByChange?.("source");
            }}
          />
          <IconButton
            icon={GridFour}
            label="Grid view"
            hasTooltip={false}
            active={viewMode === "grid"}
            onClick={() => setViewMode("grid")}
          />
        </>
      )}
      <ToolbarDivider />
      <IconButton
        ref={filterAnchorRef}
        icon={Funnel}
        label="Filter"
        hasTooltip={false}
        active={isFilterMenuOpen}
        onClick={() => setIsFilterMenuOpen((open) => !open)}
      />
      <Menu
        isOpen={isFilterMenuOpen}
        onClose={() => setIsFilterMenuOpen(false)}
        anchorRef={filterAnchorRef}
        entries={[
          {
            key: "raw",
            label: "RAW",
            hasCheckbox: true,
            isChecked: fileTypes.raw,
            onSelect: () => onToggleFileType("raw"),
          },
          {
            key: "jpg",
            label: "JPEG/TIFF",
            hasCheckbox: true,
            isChecked: fileTypes.jpg,
            onSelect: () => onToggleFileType("jpg"),
          },
        ]}
      />
      <IconButton
        ref={sortAnchorRef}
        icon={ArrowsDownUp}
        label="Sort"
        hasTooltip={false}
        active={isSortMenuOpen}
        onClick={() => setIsSortMenuOpen((open) => !open)}
      />
      <Menu
        isOpen={isSortMenuOpen}
        onClose={() => setIsSortMenuOpen(false)}
        anchorRef={sortAnchorRef}
        entries={[
          { kind: "header", key: "sort-header", label: "SORT BY" },
          {
            key: "time",
            label: "Capture Time",
            isChecked: sortBy === "time",
            onSelect: () => onSortByChange("time"),
          },
          {
            key: "name",
            label: "File Name",
            isChecked: sortBy === "name",
            onSelect: () => onSortByChange("name"),
          },
          { kind: "divider", key: "sort-divider" },
          { kind: "header", key: "order-header", label: "ORDER" },
          {
            key: "ascending",
            label: sortBy === "time" ? "Oldest First" : "A to Z",
            isChecked: isSortAscending,
            onSelect: () => onSortAscendingChange(true),
          },
          {
            key: "descending",
            label: sortBy === "time" ? "Newest First" : "Z to A",
            isChecked: !isSortAscending,
            onSelect: () => onSortAscendingChange(false),
          },
        ]}
      />
      <ToolbarDivider />
      {groupBy !== undefined && onGroupByChange && (
        <GroupByControl
          groupBy={groupBy}
          onGroupByChange={onGroupByChange}
          options={
            viewMode === "list" && !isInPlace ? ["source", "date"] : undefined
          }
        />
      )}
      <span style={{ flex: 1 }} />
      <span
        aria-label={`${selectedCount} of ${totalCount} selected`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: spacing[6],
          color: colors.type.secondary,
          fontVariantNumeric: "tabular-nums",
          ...textStyle("body-12"),
        }}
      >
        <Image size={16} aria-hidden />
        {selectedCount} / {totalCount}
      </span>
    </div>
  );
}

/** Filter, sort and selection controls above an import photo grid. */
export function ImportToolbar(props: ImportToolbarProps) {
  const designOption = useCullStore((s) => s.designOption);
  return designOption === 3 ? (
    <ListToolbar {...props} />
  ) : (
    <GridToolbar {...props} />
  );
}

function GridToolbar({
  fileTypes,
  onToggleFileType,
  sortBy,
  isSortAscending,
  onSortByChange,
  onSortAscendingChange,
  groupBy,
  onGroupByChange,
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
}: ImportToolbarProps) {
  const [isGroupMenuOpen, setIsGroupMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortAnchorRef = useRef<HTMLButtonElement>(null);
  const [isGroupHovered, setIsGroupHovered] = useState(false);
  const groupAnchorRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing[8],
        padding: `${spacing[8]} ${spacing[12]}`,
        whiteSpace: "nowrap",
        flexShrink: 0,
        overflow: "hidden",
        borderBottom: `${stroke[1]} solid ${colors.edge.default}`,
      }}
    >
      {(["raw", "jpg"] as ImportFileType[]).map((type) => (
        <Pill
          key={type}
          label={FILE_TYPE_LABELS[type]}
          selected={fileTypes[type]}
          onToggle={() => onToggleFileType(type)}
        />
      ))}
      <IconButton
        ref={sortAnchorRef}
        icon={ArrowsDownUp}
        label="Sort"
        hasTooltip={false}
        active={isSortMenuOpen}
        onClick={() => setIsSortMenuOpen((open) => !open)}
      />
      <Menu
        isOpen={isSortMenuOpen}
        onClose={() => setIsSortMenuOpen(false)}
        anchorRef={sortAnchorRef}
        entries={[
          { kind: "header", key: "sort-header", label: "SORT BY" },
          {
            key: "time",
            label: "Capture Time",
            isChecked: sortBy === "time",
            onSelect: () => onSortByChange("time"),
          },
          {
            key: "name",
            label: "File Name",
            isChecked: sortBy === "name",
            onSelect: () => onSortByChange("name"),
          },
          { kind: "divider", key: "sort-divider" },
          { kind: "header", key: "order-header", label: "ORDER" },
          {
            key: "ascending",
            label: sortBy === "time" ? "Oldest First" : "A to Z",
            isChecked: isSortAscending,
            onSelect: () => onSortAscendingChange(true),
          },
          {
            key: "descending",
            label: sortBy === "time" ? "Newest First" : "Z to A",
            isChecked: !isSortAscending,
            onSelect: () => onSortAscendingChange(false),
          },
        ]}
      />
      {groupBy !== undefined && onGroupByChange && (
        <>
          {/* Same look as the app's DropdownSelector trigger (muted label, brighter value); it needs a ref for the Menu to hang from. */}
          <button
            ref={groupAnchorRef}
            type="button"
            aria-expanded={isGroupMenuOpen}
            onClick={() => setIsGroupMenuOpen((open) => !open)}
            onMouseEnter={() => setIsGroupHovered(true)}
            onMouseLeave={() => setIsGroupHovered(false)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: spacing[4],
              height: 24,
              padding: `0 ${spacing[8]}`,
              border: "none",
              borderRadius: radius.sm,
              background:
                isGroupMenuOpen || isGroupHovered
                  ? surface.clearHover
                  : surface.clear,
              color: colors.type.disabled,
              cursor: "pointer",
              transition: hoverTransition,
              ...textStyle("body-12"),
            }}
          >
            Group By:
            <span style={{ color: colors.type.muted }}>
              {GROUP_BY_LABELS[groupBy]}
            </span>
            <CaretDown size={16} />
          </button>
          <Menu
            isOpen={isGroupMenuOpen}
            onClose={() => setIsGroupMenuOpen(false)}
            anchorRef={groupAnchorRef}
            entries={[
              ...(["none", "source", "date"] as GroupBy[]).map((key) => ({
                key,
                label: GROUP_BY_LABELS[key],
                isChecked: groupBy === key,
                onSelect: () => onGroupByChange(key),
              })),
            ]}
          />
        </>
      )}
      <span style={{ flex: 1 }} />
      {/* Selected out of total. Tabular digits keep the buttons beside it from shifting as the number changes. */}
      <span
        aria-label={`${selectedCount} of ${totalCount} selected`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: spacing[6],
          color: colors.type.secondary,
          fontVariantNumeric: "tabular-nums",
          ...textStyle("body-12"),
        }}
      >
        <Image size={16} aria-hidden />
        {selectedCount} / {totalCount}
      </span>
      {/* Both are always shown, so the bar never changes shape; the one that has nothing to do is disabled. */}
      <Button
        variant="ghost"
        size="xs"
        disabled={totalCount === 0 || selectedCount === totalCount}
        onClick={onSelectAll}
      >
        Select All
      </Button>
      <Button
        variant="ghost"
        size="xs"
        disabled={selectedCount === 0}
        onClick={onDeselectAll}
      >
        Deselect All
      </Button>
    </div>
  );
}

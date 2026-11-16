import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Checkbox, Chevron, ScrollArea, colors, hoverTransition, radius, spacing, stroke, surface, textStyle } from '../../ui-kit'
import { formatCaptureTime, formatSize } from '../../lib/importPhotos'
import { useCullStore } from '../../store/useCullStore'
import { useImportStore } from '../../store/useImportStore'
import type { ImportPhoto } from '../../types'
import { PhotoTile } from './PhotoTile'

/** A run of photos under one header: a source or a capture date, or the whole grid with no header. */
export interface GridSection {
	id: string
	/** Null shows the photos with no header, i.e. ungrouped. */
	title: string | null
	/** Option 3's list view shows this after the title, muted: the folder a card's photos live in. */
	subtitle?: string
	/** All of a source's photos are copied. Only set when the section is a whole source. */
	isCopied?: boolean
	photos: ImportPhoto[]
}

interface ImportPhotoGridProps {
	sections: GridSection[]
	selectedIds: Set<string>
	collapsedKeys: Record<string, boolean>
	onToggleCollapsed: (key: string) => void
	/** Sets or clears the selection for a batch of photos (a range, a group, or a whole source). */
	onSelectionChange: (ids: string[], isSelected: boolean) => void
	/** How many tiles fit across. Fixed, not fitted to the width, so the grid reads the same whatever the window. */
	columns: number
	emptyState: ReactNode
}

interface HeaderProps {
	isCollapsed: boolean
	onToggle: () => void
	photos: ImportPhoto[]
	selectedIds: Set<string>
	title: string
	subtitle?: string
	isCopied?: boolean
	onSelectionChange: (ids: string[], isSelected: boolean) => void
}

/** A full-width header over a run of tiles: collapse caret, a checkbox that selects the whole run, and how many are selected. */
function SectionHeader({ isCollapsed, onToggle, photos, selectedIds, title, isCopied, onSelectionChange }: HeaderProps) {
	const selected = photos.filter((photo) => selectedIds.has(photo.id)).length

	return (
		<div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: spacing[8], padding: `${spacing[12]} ${spacing[12]} ${spacing[8]}` }}>
			<button type="button" aria-label={isCollapsed ? 'Expand' : 'Collapse'} onClick={onToggle} style={{ display: 'inline-flex', background: 'none', border: 'none', padding: 0 }}>
				<Chevron open={!isCollapsed} />
			</button>
			<Checkbox
				checked={photos.length > 0 && selected === photos.length}
				indeterminate={selected > 0 && selected < photos.length}
				label={title}
				onChange={() => onSelectionChange(photos.map((p) => p.id), selected !== photos.length)}
			/>
			<small style={{ color: colors.type.muted, fontVariantNumeric: 'tabular-nums', ...textStyle('body-12') }}>
				{/* A copied section is all in the library; the selection only says how much of it goes into the album. */}
				{isCopied ? `${selected} of ${photos.length} in album` : `${selected} / ${photos.length}`}
			</small>
		</div>
	)
}

/** Option 3's section header: a dark bar with the caret, a checkbox for the whole run, the name and how many photos. */
function ListSectionHeader({ isCollapsed, onToggle, photos, selectedIds, title, subtitle, onSelectionChange }: HeaderProps) {
	const selected = photos.filter((photo) => selectedIds.has(photo.id)).length
	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: spacing[8], height: 34, padding: `0 ${spacing[16]} 0 ${spacing[12]}`, background: surface.elevated }}>
			<button type="button" aria-label={isCollapsed ? 'Expand' : 'Collapse'} onClick={onToggle} style={{ display: 'inline-flex', background: 'none', border: 'none', padding: 0 }}>
				<Chevron open={!isCollapsed} filled />
			</button>
			<Checkbox size="sm" checked={photos.length > 0 && selected === photos.length} indeterminate={selected > 0 && selected < photos.length} label={title} onChange={() => onSelectionChange(photos.map((p) => p.id), selected !== photos.length)} />
			{subtitle && <span style={{ color: colors.type.disabled, ...textStyle('body-13') }}>/ {subtitle}</span>}
			<span style={{ flex: 1 }} />
			<small style={{ color: colors.type.disabled, fontVariantNumeric: 'tabular-nums', ...textStyle('body-12') }}>{selected} / {photos.length} photos</small>
		</div>
	)
}

/** One photo as a row: checkbox, file name, capture time and size. */
function ListRow({ photo, isSelected, isIndented, onToggle }: { photo: ImportPhoto; isSelected: boolean; isIndented: boolean; onToggle: (shiftKey: boolean) => void }) {
	const [hovered, setHovered] = useState(false)
	return (
		<div
			role="checkbox"
			aria-checked={isSelected}
			tabIndex={0}
			onClick={(e) => onToggle(e.shiftKey)}
			onKeyDown={(e) => {
				if (e.key === ' ' || e.key === 'Enter') {
					e.preventDefault()
					onToggle(e.shiftKey)
				}
			}}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{ display: 'flex', alignItems: 'center', gap: spacing[12], height: 32, padding: `0 ${spacing[16]} 0 ${isIndented ? '40px' : spacing[16]}`, background: hovered ? surface.elevated : 'transparent', cursor: 'pointer', transition: hoverTransition, ...textStyle('body-12') }}
		>
			<span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', flexShrink: 0 }}>
				<Checkbox size="sm" checked={isSelected} onChange={() => onToggle(false)} />
			</span>
			<span style={{ flex: 1, minWidth: 0, color: colors.type.secondary, overflow: 'hidden', textOverflow: 'ellipsis' }}>{photo.name}.{photo.ext}</span>
			<span style={{ color: colors.type.disabled, fontVariantNumeric: 'tabular-nums' }}>{formatCaptureTime(photo)}</span>
			<span style={{ width: 64, textAlign: 'right', color: colors.type.disabled, fontVariantNumeric: 'tabular-nums' }}>{formatSize(photo.sizeMb)}</span>
		</div>
	)
}

/** Selectable photo tiles in collapsible sections, with shift-click range selection. */
export function ImportPhotoGrid({ sections, selectedIds, collapsedKeys, onToggleCollapsed, onSelectionChange, columns, emptyState }: ImportPhotoGridProps) {
	const lastIdRef = useRef<string | null>(null)
	const isOption3 = useCullStore((s) => s.designOption === 3)
	const viewMode = useImportStore((s) => s.viewMode)
	const isInPlace = useImportStore((s) => s.isInPlace)
	const isListView = viewMode === 'list' && !isInPlace
	const visibleSections = sections.filter((section) => section.photos.length > 0)
	// Order shift-click ranges follow: every tile as it appears on screen, section after section.
	const ordered = visibleSections.flatMap((section) => section.photos)

	function handleToggle(photo: ImportPhoto, shiftKey: boolean) {
		const willSelect = !selectedIds.has(photo.id)
		const lastIndex = lastIdRef.current ? ordered.findIndex((p) => p.id === lastIdRef.current) : -1
		if (shiftKey && lastIndex >= 0) {
			const index = ordered.indexOf(photo)
			const [from, to] = [Math.min(lastIndex, index), Math.max(lastIndex, index)]
			onSelectionChange(ordered.slice(from, to + 1).map((p) => p.id), willSelect)
		} else {
			onSelectionChange([photo.id], willSelect)
		}
		lastIdRef.current = photo.id
	}

	function renderTiles(photos: ImportPhoto[]) {
		return photos.map((photo) => <PhotoTile key={photo.id} photo={photo} isSelected={selectedIds.has(photo.id)} onToggle={(shiftKey) => handleToggle(photo, shiftKey)} />)
	}

	// Option 3 shows every group, in list or grid view, as the same bordered card under a dark header.
	// Ungrouped photos in grid view have no groups to put in cards, so they run edge to edge like the other options.
	if (isOption3 && (isListView || visibleSections.some((section) => section.title !== null))) {
		return (
			<ScrollArea style={{ flex: 1 }}>
				{visibleSections.length === 0 && emptyState}
				<div style={{ display: 'flex', flexDirection: 'column', gap: spacing[8], padding: spacing[8] }}>
				{visibleSections.map((section) => {
					const sectionKey = `s${section.id}`
					const isSectionCollapsed = section.title !== null && !!collapsedKeys[sectionKey]
					return (
						<div key={section.id} style={{ overflow: 'hidden', border: `${stroke[1]} solid ${colors.edge.default}`, borderRadius: radius.lg, background: surface.panel }}>
							{section.title !== null && (
								<ListSectionHeader isCollapsed={isSectionCollapsed} onToggle={() => onToggleCollapsed(sectionKey)} photos={section.photos} selectedIds={selectedIds} title={section.title} subtitle={section.subtitle} onSelectionChange={onSelectionChange} />
							)}
							{!isSectionCollapsed && (isListView ? (
								section.photos.map((photo) => <ListRow key={photo.id} photo={photo} isSelected={selectedIds.has(photo.id)} isIndented={section.title !== null} onToggle={(shiftKey) => handleToggle(photo, shiftKey)} />)
							) : (
								<div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: stroke[0], alignContent: 'start' }}>{renderTiles(section.photos)}</div>
							))}
						</div>
					)
				})}
				</div>
			</ScrollArea>
		)
	}

	return (
		<ScrollArea style={{ flex: 1 }}>
			{/* Same hairline gap and edge-to-edge layout as the album's grid. */}
			<div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: stroke[0], alignContent: 'start' }}>
				{visibleSections.length === 0 && <div style={{ gridColumn: '1 / -1' }}>{emptyState}</div>}
				{visibleSections.map((section) => {
					if (section.title === null) return <div key={section.id} style={{ display: 'contents' }}>{renderTiles(section.photos)}</div>
					const sectionKey = `s${section.id}`
					const isSectionCollapsed = !!collapsedKeys[sectionKey]
					return (
						<div key={section.id} style={{ display: 'contents' }}>
							<SectionHeader
								isCollapsed={isSectionCollapsed}
								onToggle={() => onToggleCollapsed(sectionKey)}
								photos={section.photos}
								selectedIds={selectedIds}
								title={section.title}
								isCopied={section.isCopied}
								onSelectionChange={onSelectionChange}
							/>
							{!isSectionCollapsed && renderTiles(section.photos)}
						</div>
					)
				})}
			</div>
		</ScrollArea>
	)
}

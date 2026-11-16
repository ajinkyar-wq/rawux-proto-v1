import { Button, Checkbox, HoverTooltip, ScrollArea, colors, edge, hoverTransition, spacing, stroke, surface, textStyle, dimOpacity, layout } from '../../ui-kit'
import { formatGroupLabel, getSourcePhotos, getVisiblePhotos } from '../../lib/importPhotos'
import type { ImportPhoto } from '../../types'
import { useImportStore } from '../../store/useImportStore'
import { AddSourceButton } from './AddSourceButton'
import { CopyProgress } from './CopyProgress'
import { DestinationForm, DestinationSummary } from './DestinationPanel'
import { MultipleCardsBanner } from './MultipleCardsBanner'
import { ImportHeader } from './ImportHeader'
import { ImportPhotoGrid } from './ImportPhotoGrid'
import type { GridSection } from './ImportPhotoGrid'
import { ImportToolbar } from './ImportToolbar'
import { PanelHeader } from './PanelHeader'
import { CopiedSourceCard, PendingSourceCard } from './SourceCard'

/** The footer is as tall while copying as with its buttons (32px), so the grid above doesn't jump. */
/** The destination panel takes room from the grid, so it has a column fewer when the panel is showing. */
const COLUMNS_WITH_DESTINATION = 3
const COLUMNS_WITHOUT_DESTINATION = 4
function EmptyMessage({ title, children }: { title: string; children: string }) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4], padding: spacing[24], textAlign: 'center', ...textStyle('body-13'), color: colors.type.muted }}>
			<strong style={{ ...textStyle('label-13'), color: colors.type.secondary }}>{title}</strong>
			{children}
		</div>
	)
}

function CopyFooter() {
	const sources = useImportStore((s) => s.sources)
	const selectedIds = useImportStore((s) => s.selectedIds)
	const fileTypes = useImportStore((s) => s.fileTypes)
	const isInPlace = useImportStore((s) => s.isInPlace)
	const progress = useImportStore((s) => s.copyProgress)
	const addToAlbum = useImportStore((s) => s.addToAlbum)
	const copyAndAddMore = useImportStore((s) => s.copyAndAddMore)
	const cancelCopy = useImportStore((s) => s.cancelCopy)
	const copyAndCreateAlbum = useImportStore((s) => s.copyAndCreateAlbum)
	const isSharingImages = useImportStore((s) => s.isSharingImages)
	const setSharingImages = useImportStore((s) => s.setSharingImages)

	const pendingChosen = sources.filter((source) => source.status === 'pending').flatMap((source) => getSourcePhotos(source, fileTypes)).filter((photo) => selectedIds.has(photo.id))
	const copiedChosen = sources.filter((source) => source.status === 'copied').flatMap((source) => getSourcePhotos(source, fileTypes)).filter((photo) => selectedIds.has(photo.id))
	// Photos still to be copied, versus photos that are already in the album as soon as it is created.
	const willCopy = !isInPlace && pendingChosen.length > 0
	const albumCount = copiedChosen.length + (isInPlace ? pendingChosen.length : 0)
	const hasNothing = !willCopy && albumCount === 0

	// The label says what the button will do and stays put; the hint beside it says why it can't yet.
	const willIngest = willCopy || (hasNothing && !isInPlace)
	const primaryLabel = addToAlbum ? (willIngest ? 'Ingest & Add to Album' : 'Add to Album') : willIngest ? 'Ingest & Create Album' : 'Create Album'

	return (
		<div style={{ display: 'flex', alignItems: 'center', minHeight: layout.footerContentHeight, boxSizing: 'content-box', padding: `${spacing[8]} ${spacing[12]}`, background: surface.panel, borderTop: `${stroke[1]} solid ${edge.default}` }}>
			{/* While copying, the progress takes the footer's place entirely: nothing here can be changed until it is done. */}
			{progress ? (
				<CopyProgress progress={progress} onCancel={cancelCopy} />
			) : (
				<div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: spacing[12] }}>
					<Checkbox label="Share images to help improve Aftershoot" checked={isSharingImages} onChange={setSharingImages} />
					{/* Sits right beside the buttons it explains, not across the bar from them. */}
					<span style={{ flex: 1, textAlign: 'right', ...textStyle('body-12'), color: colors.type.muted }}>{hasNothing ? (isInPlace ? 'Select photos to add' : 'Select photos to ingest') : ''}</span>
					{/* In copy mode the buttons share the banner's width above them, so both line up under the Destination panel. */}
					<div style={{ display: 'flex', gap: spacing[8], width: isInPlace ? undefined : `calc(${layout.destinationPanelWidth}px - 2 * ${spacing[12]})` }}>
						{/* Stays put once everything is ingested, so the footer keeps its shape; the tooltip says what re-enables it. */}
						{!isInPlace && (
							<HoverTooltip message={willCopy ? undefined : 'Add another source to ingest again'} size="compact" placement="top" wrapperStyle={{ flex: 1 }}>
								<Button variant="secondary" disabled={!willCopy} onClick={copyAndAddMore} style={{ flex: 1 }}>
									Ingest & Add Source
								</Button>
							</HoverTooltip>
						)}
						<Button variant="primary" disabled={hasNothing} onClick={copyAndCreateAlbum} style={{ flex: 1 }}>
							{primaryLabel}
						</Button>
					</div>
				</div>
			)}
		</div>
	)
}

/** Option 1: pick photos from every source while looking at them, then copy and create the album from one screen. */
export function CopyScreen() {
	const sources = useImportStore((s) => s.sources)
	const selectedIds = useImportStore((s) => s.selectedIds)
	const hiddenIds = useImportStore((s) => s.hiddenIds)
	const fileTypes = useImportStore((s) => s.fileTypes)
	const sortBy = useImportStore((s) => s.sortBy)
	const isSortAscending = useImportStore((s) => s.isSortAscending)
	const groupBy = useImportStore((s) => s.groupBy)
	const isInPlace = useImportStore((s) => s.isInPlace)
	const isEditingDestination = useImportStore((s) => s.isEditingDestination)
	const collapsedKeys = useImportStore((s) => s.collapsedKeys)
	const progress = useImportStore((s) => s.copyProgress)
	const toggleFileType = useImportStore((s) => s.toggleFileType)
	const setSortBy = useImportStore((s) => s.setSortBy)
	const setSortAscending = useImportStore((s) => s.setSortAscending)
	const sort = { by: sortBy, isAscending: isSortAscending }
	const setGroupBy = useImportStore((s) => s.setGroupBy)
	const setPhotosSelected = useImportStore((s) => s.setPhotosSelected)
	const toggleCollapsed = useImportStore((s) => s.toggleCollapsed)
	const setEditingDestination = useImportStore((s) => s.setEditingDestination)

	const pending = sources.filter((source) => source.status === 'pending')
	const copied = sources.filter((source) => source.status === 'copied')
	const shown = (list: typeof sources) => getVisiblePhotos(list, fileTypes, sort, groupBy).filter((photo) => !hiddenIds.has(photo.id))
	const sections: GridSection[] = buildSections()

	/** Source: one section each, copied ones first (the only grouping that shows the Copied tag; the Source panel says it otherwise). Capture Date: one per day across every source. None: a single run with no header. */
	function buildSections(): GridSection[] {
		if (groupBy === 'none') return [{ id: 'all', title: null, photos: shown([...copied, ...pending]) }]
		if (groupBy === 'date') {
			const days = new Map<string, ImportPhoto[]>()
			shown([...copied, ...pending]).forEach((photo) => days.set(photo.captureDay, [...(days.get(photo.captureDay) ?? []), photo]))
			return [...days.entries()].map(([day, photos]) => ({ id: day, title: formatGroupLabel(day), photos }))
		}
		return [...copied, ...pending].map((source) => ({ id: source.id, title: source.name, subtitle: source.kind === 'card' ? 'DCIM' : undefined, isCopied: source.status === 'copied', photos: shown([source]) }))
	}
	const pendingPhotos = getVisiblePhotos(pending, fileTypes, sort, 'none').filter((photo) => !hiddenIds.has(photo.id))
	const allPhotos = sections.flatMap((section) => section.photos)
	const selectedCount = allPhotos.filter((photo) => selectedIds.has(photo.id)).length
	const showSummary = copied.length > 0 && !isEditingDestination
	const hasDestination = !isInPlace

	const emptyState = pending.length ? (
		!fileTypes.raw && !fileTypes.jpg ? (
			<EmptyMessage title="No File Types Selected">Turn on RAW or JPEG / TIFF in the toolbar to see photos.</EmptyMessage>
		) : (
			<EmptyMessage title="No Photos to Show">Check a folder in the Source panel, or turn on more file types, to see photos.</EmptyMessage>
		)
	) : copied.length ? (
		<EmptyMessage title="Everything Is Ingested">Add another card or folder in the Source panel.</EmptyMessage>
	) : (
		<EmptyMessage title="No Sources">Add a card or folder in the Source panel.</EmptyMessage>
	)

	return (
		<div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
			{/* Home stays available while copying; the header handles its own dimming. */}
			<ImportHeader />
			{/* Everything but the progress is dimmed and blocked while copying. */}
			<div inert={progress !== null} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, opacity: progress !== null ? dimOpacity.dimmed : 1, transition: hoverTransition }}>
				<div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
					<aside style={{ width: layout.sourcePanelWidth, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: `${stroke[1]} solid ${edge.default}`, background: surface.panel }}>
						<PanelHeader title="Source" />
						<ScrollArea style={{ flex: 1 }} overlay>
							<div style={{ display: 'flex', flexDirection: 'column', gap: spacing[8], padding: `0 ${spacing[12]}` }}>
								{copied.map((source) => (
									<CopiedSourceCard key={source.id} source={source} />
								))}
								{pending.map((source) => (
									<PendingSourceCard key={source.id} source={source} />
								))}
								<AddSourceButton bottomInset={spacing[12]} />
							</div>
						</ScrollArea>
					</aside>

					<main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
						<ImportToolbar
							fileTypes={fileTypes}
							onToggleFileType={toggleFileType}
							sortBy={sortBy}
							isSortAscending={isSortAscending}
							onSortByChange={setSortBy}
							onSortAscendingChange={setSortAscending}
							groupBy={groupBy}
							onGroupByChange={setGroupBy}
							selectedCount={selectedCount}
							totalCount={allPhotos.length}
							photos={allPhotos}
							selectedIds={selectedIds}
							onSelectionChange={setPhotosSelected}
							onSelectAll={() => setPhotosSelected(allPhotos.map((p) => p.id), true)}
							onDeselectAll={() => setPhotosSelected(allPhotos.map((p) => p.id), false)}
						/>
						<ImportPhotoGrid
							sections={sections}
							selectedIds={selectedIds}
							collapsedKeys={collapsedKeys}
							onToggleCollapsed={toggleCollapsed}
							onSelectionChange={setPhotosSelected}
							columns={hasDestination ? COLUMNS_WITH_DESTINATION : COLUMNS_WITHOUT_DESTINATION}
							emptyState={emptyState}
						/>
					</main>

					{/* Without Copy Images there is nothing to configure, so the whole panel goes. */}
					{hasDestination && (
						<aside style={{ width: layout.destinationPanelWidth, flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: `${stroke[1]} solid ${edge.default}`, background: surface.panel }}>
							<PanelHeader
								title="Destination"
								action={
									isEditingDestination && copied.length > 0 && (
										<Button variant="secondary" size="sm" onClick={() => setEditingDestination(false)}>
											Use Last Settings
										</Button>
									)
								}
							/>
							<ScrollArea style={{ flex: 1 }} overlay>
								<div style={{ padding: `0 ${spacing[12]} ${spacing[12]}` }}>
									{showSummary ? (
										<DestinationSummary copiedSources={copied} pendingCount={pendingPhotos.filter((p) => selectedIds.has(p.id)).length} onChange={() => setEditingDestination(true)} />
									) : (
										<DestinationForm />
									)}
								</div>
							</ScrollArea>
							<MultipleCardsBanner style={{ margin: `0 ${spacing[12]} ${spacing[12]}` }} />
						</aside>
					)}
				</div>
			</div>
			<CopyFooter />
		</div>
	)
}

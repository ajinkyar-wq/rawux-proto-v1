import { Button, Checkbox, ScrollArea, colors, edge, spacing, stroke, surface, textStyle, layout } from '../../ui-kit'
import { formatGroupLabel, getVisiblePhotos } from '../../lib/importPhotos'
import type { ImportPhoto } from '../../types'
import { useImportStore } from '../../store/useImportStore'
import { AddSourceButton } from './AddSourceButton'
import { ImportHeader } from './ImportHeader'
import { ImportPhotoGrid } from './ImportPhotoGrid'
import type { GridSection } from './ImportPhotoGrid'
import { ImportToolbar } from './ImportToolbar'
import { PanelHeader } from './PanelHeader'
import { CopiedSourceCard, PendingSourceCard } from './SourceCard'

/** No destination panel here, so the full four columns. */
const PREVIEW_COLUMNS = 4

/** Option 2: review everything that was copied (or is staying in place), pick what to keep, and create the album. */
export function PreviewScreen() {
	const sources = useImportStore((s) => s.sources)
	const selectedIds = useImportStore((s) => s.selectedIds)
	const fileTypes = useImportStore((s) => s.fileTypes)
	const sortBy = useImportStore((s) => s.sortBy)
	const isSortAscending = useImportStore((s) => s.isSortAscending)
	const addToAlbum = useImportStore((s) => s.addToAlbum)
	const hiddenIds = useImportStore((s) => s.hiddenIds)
	const groupBy = useImportStore((s) => s.groupBy)
	const setGroupBy = useImportStore((s) => s.setGroupBy)
	const toggleFileType = useImportStore((s) => s.toggleFileType)
	const setSortBy = useImportStore((s) => s.setSortBy)
	const setSortAscending = useImportStore((s) => s.setSortAscending)
	const sort = { by: sortBy, isAscending: isSortAscending }
	const setPhotosSelected = useImportStore((s) => s.setPhotosSelected)
	const openCreateAlbum = useImportStore((s) => s.openCreateAlbum)
	const collapsedKeys = useImportStore((s) => s.collapsedKeys)
	const toggleCollapsed = useImportStore((s) => s.toggleCollapsed)
	const isSharingImages = useImportStore((s) => s.isSharingImages)
	const setSharingImages = useImportStore((s) => s.setSharingImages)

	const finished = sources.filter((source) => source.status !== 'pending')
	// A folder unchecked in an in-place source's tree is left out of the grid, as it is before ingest.
	const shown = (list: typeof sources) => getVisiblePhotos(list, fileTypes, sort, 'none').filter((photo) => !hiddenIds.has(photo.id))
	const photos = shown(finished)
	/** Same three groupings as Option 1: one section per source, per capture day across every source, or one run with no header. */
	function buildSections(): GridSection[] {
		if (groupBy === 'none') return [{ id: 'all', title: null, photos }]
		if (groupBy === 'date') {
			const days = new Map<string, ImportPhoto[]>()
			photos.forEach((photo) => days.set(photo.captureDay, [...(days.get(photo.captureDay) ?? []), photo]))
			return [...days.entries()].map(([day, items]) => ({ id: day, title: formatGroupLabel(day), photos: items }))
		}
		return finished.map((source) => ({ id: source.id, title: source.name, isCopied: source.status === 'copied', photos: shown([source]) }))
	}
	const sections = buildSections()
	const selectedCount = photos.filter((photo) => selectedIds.has(photo.id)).length

	return (
		<div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
			<ImportHeader
				action={
					<Button variant="primary" disabled={selectedCount === 0} onClick={openCreateAlbum}>
						{addToAlbum ? 'Add to Album' : 'Create Album'}
					</Button>
				}
			/>
			<div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
				<aside style={{ width: layout.sourcePanelWidth, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: `${stroke[1]} solid ${edge.default}`, background: surface.panel }}>
					<PanelHeader title="Source" />
					<ScrollArea style={{ flex: 1 }} overlay>
						<div style={{ display: 'flex', flexDirection: 'column', gap: spacing[8], padding: `0 ${spacing[12]} ${spacing[12]}` }}>
							{finished.map((source) => {
								// Every source reads the same as in Option 1: ingested ones with a seal, ones used in place with the folder tree they had before.
								return source.status === 'copied' ? <CopiedSourceCard key={source.id} source={source} /> : <PendingSourceCard key={source.id} source={source} />
							})}
							<AddSourceButton bottomInset={spacing[12]} />
							{/* The same note as in the Ingest dialog: once a first source is in, a second card is the likely next step. */}
							{finished.some((source) => source.status === 'copied') && <span style={{ ...textStyle('body-12'), color: colors.type.muted, paddingTop: spacing[8] }}>Shot on more than one card or source? Add them all here.</span>}
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
						totalCount={photos.length}
						onSelectAll={() => setPhotosSelected(photos.map((p) => p.id), true)}
						onDeselectAll={() => setPhotosSelected(photos.map((p) => p.id), false)}
					/>
					<ImportPhotoGrid
						sections={sections}
						selectedIds={selectedIds}
						collapsedKeys={collapsedKeys}
						onToggleCollapsed={toggleCollapsed}
						onSelectionChange={setPhotosSelected}
						columns={PREVIEW_COLUMNS}
						emptyState={
							<div style={{ padding: spacing[24], textAlign: 'center', ...textStyle('body-13'), color: colors.type.muted }}>
								<strong style={{ ...textStyle('label-13'), color: colors.type.secondary }}>No Photos to Show</strong>
								<div>Check a folder in the Source panel, or turn on more file types, to see photos.</div>
							</div>
						}
					/>
				</main>
			</div>
			{/* The same footer bar as Option 1, so the choice sits in one place whichever way photos came in. */}
			<div style={{ display: 'flex', alignItems: 'center', minHeight: layout.footerContentHeight, boxSizing: 'content-box', padding: `${spacing[8]} ${spacing[12]}`, background: surface.panel, borderTop: `${stroke[1]} solid ${edge.default}` }}>
				<Checkbox label="Share images to help improve Aftershoot" checked={isSharingImages} onChange={setSharingImages} />
			</div>
		</div>
	)
}

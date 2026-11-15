import type { ReactNode } from 'react'
import { Button, Divider, DropdownSelector, GridFour, IconButton, ListBullets, MagnifyingGlass, Plus, ScrollArea, Trash, spacing, dimOpacity } from '../../ui-kit'
import { useCullStore } from '../../store/useCullStore'
import { useImportStore } from '../../store/useImportStore'
import { AlbumCard } from './AlbumCard'
import { HomeHeader } from './HomeHeader'

// Albums are laid out in as many 240px+ columns as fit, so the grid reads as 4 across at the
// design's width but still reflows in a narrower window.
const ALBUM_MIN_COLUMN_WIDTH = 240

function noop() {}

/** Controls from the design that aren't built in this prototype: shown dimmed like any disabled control, and blocked from hover, click and focus. */
function DisplayOnly({ children }: { children: ReactNode }) {
	return (
		<div inert style={{ display: 'flex', alignItems: 'center', gap: spacing[12], opacity: dimOpacity.dimmed }}>
			{children}
		</div>
	)
}

/** The app's start screen: every album in the library, with the next step for each one. */
export function HomeScreen() {
	const openAlbum = useCullStore((s) => s.openAlbum)
	const albums = useCullStore((s) => s.albums)
	const openNewAlbum = useImportStore((s) => s.openNewAlbum)
	const resumeImport = useImportStore((s) => s.resumeImport)
	const openSavedImport = useImportStore((s) => s.openSavedImport)
	const copyProgress = useImportStore((s) => s.copyProgress)
	const addToAlbum = useImportStore((s) => s.addToAlbum)
	const albumName = useImportStore((s) => s.albumName)
	// Photos are being ingested for this album: an existing one, or the new one that doesn't exist until it is created.
	const ingestingName = copyProgress ? (addToAlbum ?? (albumName.trim() || 'Untitled Album')) : null
	const isNewIngest = ingestingName !== null && !albums.some((album) => album.name === ingestingName && album.photoCount > 0)

	return (
		<div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
			<HomeHeader />

			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${spacing[12]} ${spacing[20]}` }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: spacing[12] }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: spacing[4] }}>
						<IconButton icon={GridFour} label="Grid view" hasTooltip={false} active iconWeight="fill" />
						<DisplayOnly>
							<IconButton icon={ListBullets} label="List view" hasTooltip={false} />
						</DisplayOnly>
					</div>
					<Divider size={20} />
					<DisplayOnly>
						<DropdownSelector label="Date Created" isOpen={false} onToggle={noop} onClose={noop} labelTextStyle="body-14" />
						<Divider size={20} />
						<IconButton icon={MagnifyingGlass} label="Search albums" hasTooltip={false} />
						<Divider size={20} />
						<IconButton icon={Trash} label="Deleted albums" hasTooltip={false} />
					</DisplayOnly>
				</div>

				<Button variant="primary" icon={Plus} iconWeight="regular" onClick={() => openNewAlbum()}>
					New Album
				</Button>
			</div>

			<ScrollArea style={{ flex: 1 }}>
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: `repeat(auto-fill, minmax(${ALBUM_MIN_COLUMN_WIDTH}px, 1fr))`,
						gap: spacing[20],
						padding: `${spacing[8]} ${spacing[20]} ${spacing[24]}`,
					}}
				>
					{isNewIngest && <AlbumCard album={{ id: 'ingesting', name: ingestingName, photoCount: copyProgress?.total ?? 0, coverUrl: null, action: 'import' }} progress={copyProgress} onOpen={resumeImport} />}
					{albums.filter((album) => album.photoCount > 0).map((album) => (
						<AlbumCard
							key={album.id}
							album={album}
							progress={album.name === ingestingName ? copyProgress : null}
							onOpen={() => (album.name === ingestingName ? resumeImport() : album.isUnfinished ? openSavedImport(album.id) : openAlbum(album.name, album.action === 'edit' ? 'edit' : 'cull'))}
						/>
					))}
				</div>
			</ScrollArea>
		</div>
	)
}

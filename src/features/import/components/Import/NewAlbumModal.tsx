import { useRef, useState } from 'react'
import type { Ref } from 'react'
import { FolderSimple, IconButton, ImageSquare, Menu, Modal, SimCard, colors, hoverTransition, modalWidth, radius, spacing, stroke, surface, textStyle, dimOpacity, X } from '../../ui-kit'
import type { MenuEntry } from '../../ui-kit'
import { CONNECTED_CARDS } from '../../data/mockImport'
import { AlbumNameField } from './AlbumNameField'
import { useImportStore } from '../../store/useImportStore'

const DROP_AREA_HEIGHT = 320
const COPY_ROW_HEIGHT = 64
const HEADER_WIDTH = 217
/** Space between the artwork and the text beside it. */
const DROP_AREA_GAP = spacing[32]
const ADD_GLYPH_SIZE = 96
const WAY_GLYPH_SLOT_HEIGHT = 72
const WAY_TEXT_WIDTH = 217
/** The status dot sits at a fixed distance from the title's left edge, as in the design, not after the text. */
const WAY_DOT_LEFT = 180
/** The artwork carries its own dim fill; this is the extra fade at rest, lifted to full on hover. */
const ADD_GLYPH_OPACITY_IDLE = 0.63
const ADD_GLYPH_OPACITY_HOVER = dimOpacity.scrim
/** The big areas are lit gently: the standard hover fill at 60%, since at full strength it reads as a light patch on a dark card. */
const AREA_HOVER_BACKGROUND = `color-mix(in srgb, ${surface.clearHover} 60%, transparent)`
/** The main card's panel-to-near-black gradient. Grey 950 has no semantic surface token, so it is referenced directly. */
/** The bottom cards are the same panel-to-black gradient, translucent, at a slightly different angle each. Grey 950 has no semantic surface token. */
const TETHERED_CARD_BACKGROUND = `linear-gradient(195deg, color-mix(in srgb, ${surface.panel} 75%, transparent) 15%, color-mix(in srgb, var(--ui-color-grey-950) 75%, transparent) 122%)`
const CATALOG_CARD_BACKGROUND = `linear-gradient(190deg, color-mix(in srgb, ${surface.panel} 15%, transparent) 1%, color-mix(in srgb, var(--ui-color-grey-950) 75%, transparent) 110%)`
const MAIN_CARD_BACKGROUND = `linear-gradient(204deg, ${surface.panel} 15%, var(--ui-color-grey-950) 122%)`

interface AddGlyphProps {
	/** The folder or image artwork, and the pointer drawn over its bottom-right corner. */
	base: string
	cursor: string
}

/** 96px artwork with a pointer hint, positioned exactly as in the Figma frame (the artwork and its drop shadow overflow the box). */
function AddGlyph({ base, cursor, opacity }: AddGlyphProps & { opacity: number }) {
	return (
		<span style={{ position: 'relative', width: ADD_GLYPH_SIZE, height: ADD_GLYPH_SIZE, opacity, transition: hoverTransition, willChange: 'opacity' }}>
			<img src={base} alt="" style={{ position: 'absolute', left: -1, top: -7, width: ADD_GLYPH_SIZE, height: ADD_GLYPH_SIZE }} />
			<img src={cursor} alt="" style={{ position: 'absolute', left: 52, top: 48 }} />
		</span>
	)
}

/** The one place to add photos: folders and files alike, picked in the system panel. The whole area lights up on hover. */
function DropArea({ glyph, onClick }: { glyph: AddGlyphProps; onClick: () => void }) {
	const [hovered, setHovered] = useState(false)

	return (
		<button
			type="button"
			onClick={onClick}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				height: DROP_AREA_HEIGHT,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				gap: DROP_AREA_GAP,
				background: hovered ? AREA_HOVER_BACKGROUND : surface.clear,
				border: 'none',
				cursor: 'pointer',
				transition: hoverTransition,
			}}
		>
			<AddGlyph {...glyph} opacity={hovered ? ADD_GLYPH_OPACITY_HOVER : ADD_GLYPH_OPACITY_IDLE} />
			<span style={{ width: HEADER_WIDTH, display: 'flex', flexDirection: 'column', gap: spacing[4], textAlign: 'left' }}>
				<span style={{ ...textStyle('label-20'), color: hovered ? colors.type.secondary : colors.type.muted, transition: hoverTransition }}>RAW / JPEG / TIFF</span>
				<span style={{ ...textStyle('body-13'), color: hovered ? colors.type.disabled : colors.type.faint, transition: hoverTransition }}>
					Import your albums to cull, edit,
					<br />
					and retouch with AI
				</span>
			</span>
		</button>
	)
}

interface WayCardProps {
	glyph: string
	/** The artwork's own size in px; the title and text line up after a slot as wide as it. */
	glyphWidth: number
	glyphHeight: number
	title: string
	subtitle: string
	/** Draws the status dot at the end of the title row. */
	dot?: string
	background: string
	/** Makes the card clickable (Tethered Shooting starts a tethered session). */
	onClick?: () => void
}

/** The "or Ingest Images from a memory card" row. It keeps its own hover state so lighting it up doesn't re-render the whole dialog. */
function CopyRow({ buttonRef, isMenuOpen, onPress }: { buttonRef: Ref<HTMLButtonElement>; isMenuOpen: boolean; onPress: (point: { x: number; y: number }) => void }) {
	const [hovered, setHovered] = useState(false)
	const isLit = hovered || isMenuOpen

	return (
		<button
			ref={buttonRef}
			type="button"
			onClick={(e) => {
				// The row spans the whole card, so the menu opens where it was pressed. A keyboard press has no pointer position, so it falls back to the row's centre.
				const rect = e.currentTarget.getBoundingClientRect()
				onPress(e.detail === 0 ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: e.clientX, y: e.clientY })
			}}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				height: COPY_ROW_HEIGHT,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				gap: spacing[4],
				background: isLit ? AREA_HOVER_BACKGROUND : surface.clear,
				border: 'none',
				borderTop: `${stroke[1]} solid ${colors.edge.transparent1}`,
				color: isLit ? colors.type.secondary : colors.type.muted,
				cursor: 'pointer',
				transition: hoverTransition,
				...textStyle('label-14'),
			}}
		>
			or
			<img src="/import/sd-card.svg" alt="" width={24} height={24} />
			Ingest Images from a memory card
		</button>
	)
}

/** Other ways to start that aren't part of this prototype: shown as in the design, but not clickable. */
function WayCard({ glyph, glyphWidth, glyphHeight, title, subtitle, dot, background, onClick }: WayCardProps) {
	return (
		<div
			role={onClick ? 'button' : undefined}
			tabIndex={onClick ? 0 : undefined}
			aria-disabled={onClick ? undefined : 'true'}
			onClick={onClick}
			onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
			style={{ flex: 1, display: 'flex', alignItems: 'center', gap: spacing[32], padding: `${spacing[20]} ${spacing[40]}`, background, borderRadius: radius['2xl'], cursor: onClick ? 'pointer' : undefined }}
		>
			<span style={{ width: glyphWidth, height: WAY_GLYPH_SLOT_HEIGHT, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				<img src={glyph} alt="" width={glyphWidth} height={glyphHeight} />
			</span>
			<span style={{ width: WAY_TEXT_WIDTH, display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
				<span style={{ position: 'relative', height: 24, display: 'block', ...textStyle('label-20'), color: colors.type.muted, whiteSpace: 'nowrap' }}>
					{title}
					{dot && <img src={dot} alt="" width={12} height={12} style={{ position: 'absolute', left: WAY_DOT_LEFT, top: '50%', transform: 'translateY(-50%)' }} />}
				</span>
				<span style={{ ...textStyle('body-13'), color: colors.type.faint }}>{subtitle}</span>
			</span>
		</div>
	)
}

/** The "New Album" dialog, the same in both options: name the album and choose how its photos arrive. */
export function NewAlbumModal() {
	const isOpen = useImportStore((s) => s.isNewAlbumOpen)
	const albumName = useImportStore((s) => s.albumName)
	const addToAlbum = useImportStore((s) => s.addToAlbum)
	const setAlbumName = useImportStore((s) => s.setAlbumName)
	const startTetheredShooting = useImportStore((s) => s.startTetheredShooting)
	const closeNewAlbum = useImportStore((s) => s.closeNewAlbum)
	const openFinder = useImportStore((s) => s.openFinder)
	const startCopyFromCard = useImportStore((s) => s.startCopyFromCard)
	const startCopyFromCards = useImportStore((s) => s.startCopyFromCards)
	const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false)
	const [copyMenuPoint, setCopyMenuPoint] = useState<{ x: number; y: number } | null>(null)
	/** Which plugged-in cards are ticked in the menu. Every card starts ticked each time the menu opens. */
	const [pickedCards, setPickedCards] = useState<Set<number>>(() => new Set(CONNECTED_CARDS.map((card) => card.index)))
	const copyAnchorRef = useRef<HTMLButtonElement>(null)

	if (!isOpen) return null

	const toggleCard = (index: number) =>
		setPickedCards((picked) => {
			const next = new Set(picked)
			if (!next.delete(index)) next.add(index)
			return next
		})
	const pickedList = CONNECTED_CARDS.filter((card) => pickedCards.has(card.index))
	const pickedPhotoCount = pickedList.reduce((sum, card) => sum + card.photoCount, 0)
	const areAllPicked = pickedList.length === CONNECTED_CARDS.length

	// One card keeps the one-click import; two or more become a tick list with a single Import row.
	const cardEntries: MenuEntry[] =
		CONNECTED_CARDS.length === 1
			? [{ key: 'card', label: `${CONNECTED_CARDS[0].name} · Memory card`, icon: SimCard, onSelect: () => startCopyFromCard() }]
			: [
					{ key: 'all', label: `Select all · ${pickedList.length} of ${CONNECTED_CARDS.length}`, hasCheckbox: true, isChecked: areAllPicked, keepOpen: true, onSelect: () => setPickedCards(new Set(areAllPicked ? [] : CONNECTED_CARDS.map((card) => card.index))) },
					...CONNECTED_CARDS.map((card): MenuEntry => ({ key: `card-${card.index}`, label: `${card.name} · ${card.photoCount} photos`, hasCheckbox: true, isChecked: pickedCards.has(card.index), keepOpen: true, onSelect: () => toggleCard(card.index) })),
					{ kind: 'divider', key: 'card-divider' },
					pickedList.length
						? { key: 'import-cards', label: `Import ${pickedList.length} ${pickedList.length === 1 ? 'card' : 'cards'} · ${pickedPhotoCount} photos`, icon: SimCard, onSelect: () => startCopyFromCards(pickedList.map((card) => card.index)) }
						: { key: 'import-none', label: 'Select a card to import', keepOpen: true, onSelect: () => {} },
				]

	const copyEntries: MenuEntry[] = [
		...cardEntries,
		{ kind: 'divider', key: 'divider' },
		{ key: 'folder', label: 'Choose Folder...', icon: FolderSimple, onSelect: () => openFinder('copyFolder') },
		{ key: 'files', label: 'Choose Files...', icon: ImageSquare, onSelect: () => openFinder('copyFiles') },
	]

	return (
		<Modal isOpen onClose={closeNewAlbum} width={modalWidth.wide} appearance="feature">
			<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing[16] }}>
				<AlbumNameField value={albumName} onChange={setAlbumName} autoFocus={!addToAlbum} isReadOnly={!!addToAlbum} />
				<IconButton icon={X} label="Close" hasTooltip={false} onClick={closeNewAlbum} />
			</div>

			<div style={{ display: 'flex', flexDirection: 'column', background: MAIN_CARD_BACKGROUND, borderRadius: radius['2xl'], overflow: 'hidden' }}>
				<DropArea glyph={{ base: '/import/folder.svg', cursor: '/import/folder-cursor.svg' }} onClick={() => openFinder('import')} />
				<CopyRow buttonRef={copyAnchorRef} isMenuOpen={isCopyMenuOpen} onPress={(point) => { setCopyMenuPoint(point); if (!isCopyMenuOpen) setPickedCards(new Set(CONNECTED_CARDS.map((card) => card.index))); setIsCopyMenuOpen((open) => !open) }} />
			</div>

			<div style={{ display: 'flex', gap: spacing[20] }}>
				<WayCard glyph="/import/camera.svg" glyphWidth={72} glyphHeight={72} title="Tethered Shooting" subtitle="Live capture with real-time edits" dot="/import/dot-green.svg" background={TETHERED_CARD_BACKGROUND} onClick={startTetheredShooting} />
				<WayCard glyph="/import/lr-c1.svg" glyphWidth={90} glyphHeight={43.58} title="Edit Lr / C1 Catalog" subtitle="Edit your existing Lr/C1 catalogs with AI" background={CATALOG_CARD_BACKGROUND} />
			</div>

			<Menu isOpen={isCopyMenuOpen} onClose={() => setIsCopyMenuOpen(false)} anchorRef={copyAnchorRef} anchorPoint={copyMenuPoint} entries={copyEntries} minWidth={240} />
		</Modal>
	)
}

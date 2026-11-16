import { useState } from 'react'
import { Button, CaretDown, colors, hoverTransition, ImageSquare, Images, radius, spacing, stroke, textStyle, dimOpacity } from '../../ui-kit'
import type { Album } from '../../types'
import type { CopyProgress } from '../../store/useImportStore'

interface AlbumCardProps {
	album: Album
	onOpen: () => void
	/** Set while photos are being copied into this album: the cover shows how far along it is, and the button gives way to a status. */
	progress?: CopyProgress | null
}

const ACTION_LABEL: Record<Album['action'], string> = { cull: 'Cull Now', edit: 'Edit Now', import: 'Continue' }

// Cover proportions from the Figma album card (257 x 169).
const COVER_ASPECT_RATIO = 257 / 169
const BADGE_HEIGHT = 20
// Figma's "Blur/Light" effect is radius 4, which is CSS blur(2px); there's no blur token to reference.
const BADGE_BLUR = 'blur(2px)'
// The card's 11px button label is one step below Button's own 12px label-12.
const BUTTON_LABEL_STYLE = textStyle('label-11')
const BUTTON_MIN_WIDTH = 40
const SPLIT_CARET_WIDTH = 24
const SPINNER_SIZE = 48

/** The split button's two halves share one fill and meet at a hairline, so only the outer corners are rounded. */
const SPLIT_LEFT_STYLE = { ...BUTTON_LABEL_STYLE, minWidth: BUTTON_MIN_WIDTH, borderTopRightRadius: radius.none, borderBottomRightRadius: radius.none }
const SPLIT_RIGHT_STYLE = { borderTopLeftRadius: radius.none, borderBottomLeftRadius: radius.none, width: SPLIT_CARET_WIDTH, padding: spacing[0] }

/** One album tile on the Home screen: cover with photo count, name, and the album's next-step action. */
export function AlbumCard({ album, onOpen, progress }: AlbumCardProps) {
	const [hovered, setHovered] = useState(false)
	const hasMenu = album.action !== 'import'

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: spacing[6], minWidth: 0 }}>
			<div
				onClick={onOpen}
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
				style={{
					position: 'relative',
					aspectRatio: COVER_ASPECT_RATIO,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					gap: spacing[12],
					background: colors.surface.panel,
					borderRadius: radius.lg,
					overflow: 'hidden',
					outline: `${stroke[2]} solid ${hovered ? colors.edge.active : 'transparent'}`,
					cursor: 'pointer',
					transition: hoverTransition,
				}}
			>
				{album.coverUrl && <img src={album.coverUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
				{progress ? (
					<>
						{/* The cover dims behind a spinner and a status, the way an album that is being culled does. */}
						<div style={{ position: 'absolute', inset: 0, background: colors.surface.panel, opacity: dimOpacity.scrim }} />
						<div role="status" aria-label={`Ingesting photos into ${album.name}`} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing[12] }}>
							<svg width={SPINNER_SIZE} height={SPINNER_SIZE} viewBox="0 0 48 48" fill="none" aria-hidden>
								<circle cx="24" cy="24" r="20" stroke={colors.type.disabled} strokeWidth="4" />
								<path d="M24 4a20 20 0 0 1 20 20" stroke={colors.type.primary} strokeWidth="4" strokeLinecap="round">
									<animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="1s" repeatCount="indefinite" />
								</path>
							</svg>
							<span style={{ ...textStyle('label-14'), color: colors.type.secondary }}>Ingesting in progress</span>
						</div>
					</>
				) : album.coverUrl ? null : (
					<>
						<ImageSquare size={24} color={colors.type.disabled} />
						<span style={{ ...textStyle('body-14'), color: colors.type.disabled }}>Add Photos</span>
					</>
				)}

				<span
					style={{
						position: 'absolute',
						top: spacing[6],
						left: spacing[6],
						display: 'inline-flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: spacing[4],
						height: BADGE_HEIGHT,
						minWidth: BADGE_HEIGHT,
						padding: `0 ${spacing[4]}`,
						borderRadius: radius.sm,
						background: colors.surface.overlay,
						border: `${stroke[0]} solid ${colors.edge.subtle}`,
						backdropFilter: BADGE_BLUR,
						color: colors.type.secondary,
						...textStyle('label-11'),
					}}
				>
					<Images size={12} />
					{album.photoCount.toLocaleString()}
				</span>
			</div>

			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing[8] }}>
				<div style={{ display: 'flex', minWidth: 0 }}>
					<span
						style={{
							...textStyle('label-14'),
							color: colors.type.secondary,
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
							minWidth: 0,
						}}
					>
						{album.name}
					</span>
				</div>

				{progress ? (
					<span style={{ ...textStyle('body-12'), color: colors.type.muted, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
						{progress.done} / {progress.total}
					</span>
				) : (
				<div style={{ display: 'flex', alignItems: 'center', gap: spacing[1], flexShrink: 0 }}>
					<Button
						variant="secondary"
						size="xs"
						style={{ ...BUTTON_LABEL_STYLE, minWidth: BUTTON_MIN_WIDTH, ...(hasMenu ? SPLIT_LEFT_STYLE : {}) }}
						onClick={onOpen}
					>
						{ACTION_LABEL[album.action]}
					</Button>
					{hasMenu && <Button variant="secondary" size="xs" icon={CaretDown} aria-label="More actions" style={SPLIT_RIGHT_STYLE} />}
				</div>
				)}
			</div>
		</div>
	)
}

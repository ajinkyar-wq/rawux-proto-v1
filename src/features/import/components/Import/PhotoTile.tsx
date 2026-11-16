import { useState } from 'react'
import { Checkbox, colors, hoverTransition, spacing, textStyle } from '../../ui-kit'
import type { ImportPhoto } from '../../types'

interface PhotoTileProps {
	photo: ImportPhoto
	isSelected: boolean
	onToggle: (shiftKey: boolean) => void
}

/** Same proportions as the album grid's thumbnails, so a photo reads the same before and after import. */
const THUMB_ASPECT_RATIO = 1.5

/**
 * One photo in the import grid, styled like the album grid's `PhotoCard`: file name above the thumbnail.
 * Selection is shown by the tile's fill and the checkbox, never by its border, so selecting never changes the tile's size.
 */
export function PhotoTile({ photo, isSelected, onToggle }: PhotoTileProps) {
	const [hovered, setHovered] = useState(false)
	const label = `${photo.name}.${photo.ext}`

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
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: spacing[4],
				padding: spacing[8],
				background: isSelected ? colors.surface.control : hovered ? colors.surface.elevated : colors.surface.panel,
				cursor: 'pointer',
				transition: hoverTransition,
			}}
		>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing[8], height: 24 }}>
				<span style={{ ...textStyle('body-12'), color: colors.type.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{label}</span>
				{/* The tile itself toggles on click, so the checkbox stops its own click from bubbling and toggles once. */}
				<span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', flexShrink: 0 }}>
					<Checkbox checked={isSelected} onChange={() => onToggle(false)} />
				</span>
			</div>
			<div style={{ aspectRatio: String(THUMB_ASPECT_RATIO), overflow: 'hidden', background: colors.surface.panel }}>
				<img src={photo.thumbnailUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
			</div>
		</div>
	)
}

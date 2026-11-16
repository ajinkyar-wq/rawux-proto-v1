import { CaretDown } from '../../icons'
import { colors } from '../../tokens'

export interface ChevronProps {
	open: boolean
	/** Solid caret glyph instead of the default outline — for denser/inline contexts like a group header's count row. */
	filled?: boolean
}

/** Disclosure caret for collapsible sections — points down when open, rotates to point right when closed. */
export function Chevron({ open, filled = false }: ChevronProps) {
	return (
		<CaretDown
			size={12}
			weight={filled ? 'fill' : 'regular'}
			color={colors.type.muted}
			style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 0.12s' }}
		/>
	)
}

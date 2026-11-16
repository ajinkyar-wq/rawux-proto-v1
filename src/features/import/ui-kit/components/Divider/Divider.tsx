import { edge } from '../../tokens'

export interface DividerProps {
	orientation?: 'vertical' | 'horizontal'
	/** Length along the divider's axis — a px number, or a CSS length like '100%'. */
	size?: number | string
	/** Overrides the line color (defaults to edge.default). */
	color?: string
}

/** Thin separator used between control groups in toolbars and headers. */
export function Divider({ orientation = 'vertical', size = 16, color = edge.default }: DividerProps) {
	const isVertical = orientation === 'vertical'
	return (
		<div
			aria-hidden
			style={{
				flexShrink: 0,
				width: isVertical ? 1 : size,
				height: isVertical ? size : 1,
				background: color,
			}}
		/>
	)
}

import { Circle } from '../../icons'
import { edge, radius, stroke } from '../../tokens'

export interface ColorSwatchProps {
	color: string
	label: string
	active?: boolean
	/** Dot diameter in px. Figma "Color Tag" component (node 356:6713) spec default is 12. */
	size?: number
	onClick?: (e: React.MouseEvent) => void
}

// Figma spec (node 356:6713): 20px hit area, 12px dot, 18px selected ring (1px stroke, 2px gap).
// Both offsets are constant regardless of dot size: hit area = dot + 8, ring = dot + 6.
const HIT_AREA_PADDING = 8
const RING_PADDING = 6

/** Reusable circular colour-label indicator/toggle ("Color Tag") for filter rows and label pickers. */
export function ColorSwatch({ color, label, active = false, size = 12, onClick }: ColorSwatchProps) {
	return (
		<button
			type="button"
			aria-label={label}
			aria-pressed={active}
			onClick={onClick}
			style={{
				position: 'relative',
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				width: size + HIT_AREA_PADDING,
				height: size + HIT_AREA_PADDING,
				border: 'none',
				background: 'transparent',
				borderRadius: radius.full,
				padding: 0,
			}}
		>
			{active && (
				<span
					style={{
						position: 'absolute',
						boxSizing: 'border-box',
						width: size + RING_PADDING,
						height: size + RING_PADDING,
						borderRadius: radius.full,
						border: `${stroke[1]} solid ${edge.light}`,
					}}
				/>
			)}
			<Circle size={size} weight="fill" color={color} />
		</button>
	)
}

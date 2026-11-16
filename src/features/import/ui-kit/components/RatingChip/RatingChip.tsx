import { Star } from '../../icons'
import { colors, radius, spacing, stroke } from '../../tokens'
import { textStyle } from '../../tokens/typography'

export interface RatingChipProps {
	rating: number
	/** 'outline' — neutral bordered chip, used for group-level summaries. 'filled' — solid background (pass `background`), used for a single photo's label color. */
	variant?: 'outline' | 'filled'
	background?: string
}

/** Small `{rating} ★` pill shared by Cull Filters group headers and per-photo rating chips. */
export function RatingChip({ rating, variant = 'outline', background }: RatingChipProps) {
	const filled = variant === 'filled'
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				gap: spacing[2],
				width: 32,
				height: 16,
				padding: `0 ${spacing[4]}`,
				borderRadius: radius.sm,
				flexShrink: 0,
				...(filled ? { background } : { border: `${stroke[1]} solid ${colors.edge.default}` }),
			}}
		>
			<span style={{ ...textStyle('body-12'), color: filled ? colors.type.white : colors.type.secondary }}>{rating}</span>
			<Star size={12} weight="fill" color={filled ? colors.type.white : colors.type.secondary} />
		</div>
	)
}

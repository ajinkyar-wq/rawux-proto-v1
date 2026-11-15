import { colors, spacing, radius } from '../../tokens'

export interface FilterCounterBadgeProps {
	count: number | string
}

/** White pill badge for an active-filter count (Figma "Filter Counter", node 4578:1056). Used by DropdownSelector and anywhere else a filter trigger needs to surface a count. */
export function FilterCounterBadge({ count }: FilterCounterBadgeProps) {
	return (
		<span
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				minWidth: 12,
				padding: `0 ${spacing[2]}`,
				borderRadius: radius.full,
				background: colors.edge.white,
				color: colors.type.inverseSecondary,
				fontFamily: 'var(--ui-font-family-base)',
				fontSize: 11,
				fontWeight: 600,
				lineHeight: '12px',
				letterSpacing: '0.5px',
				textTransform: 'uppercase',
			}}
		>
			{count}
		</span>
	)
}

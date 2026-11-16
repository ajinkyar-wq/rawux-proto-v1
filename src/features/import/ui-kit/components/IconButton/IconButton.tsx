import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import type { Icon } from '../../icons'
import { HoverTooltip } from '../Tooltip'
import { edge, hoverTransition, radius, spacing, stroke, surface, type as typeColor } from '../../tokens'

export type IconButtonSize = 'sm' | 'md'
export type IconButtonVariant = 'default' | 'flat'

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
	icon: Icon
	label: string
	/** Shows the label in a tooltip on hover. Turn off where the icon is self-evident, such as an options menu. */
	hasTooltip?: boolean
	size?: IconButtonSize
	/** Overrides the icon's size when the design calls for a glyph smaller or larger than the button's default. */
	iconSize?: number
	active?: boolean
	/** 'default' shows a background/border on active + hover. 'flat' never changes background — only the icon colour/weight shifts. */
	variant?: IconButtonVariant
	iconWeight?: 'regular' | 'fill'
	/** Small status dot rendered in the top-right corner, e.g. an unread indicator. */
	badgeColor?: string
	/** Content rendered centered on top of the icon, e.g. a rating number on a star. */
	overlay?: React.ReactNode
}

const BOX_SIZE: Record<IconButtonSize, number> = { sm: 20, md: 24 }
const ICON_SIZE: Record<IconButtonSize, number> = { sm: 14, md: 16 }

/** Reusable icon-only button for repurposing across the app (nav, toolbars, headers). */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
	{ icon: IconComponent, label, hasTooltip = true, size = 'md', iconSize, active = false, variant = 'default', iconWeight, badgeColor, overlay, style, disabled, ...rest },
	ref,
) {
	const box = BOX_SIZE[size]
	const isFlat = variant === 'flat'

	return (
		<HoverTooltip message={hasTooltip ? label : undefined} size="compact">
			<button
				ref={ref}
				type="button"
				aria-label={label}
				disabled={disabled}
				style={{
					position: 'relative',
					display: 'inline-flex',
					alignItems: 'center',
					justifyContent: 'center',
					width: box,
					height: box,
					padding: spacing[4],
					borderRadius: radius.sm,
					border: !isFlat && active ? `${stroke[0]} solid ${edge.active}` : 'none',
					background: isFlat ? 'transparent' : active ? surface.clearActive : surface.clear,
					color: active ? typeColor.secondary : typeColor.muted,
					opacity: disabled ? 0.5 : 1,
					transition: hoverTransition,
					...style,
				}}
				onMouseEnter={(e) => {
					if (isFlat || disabled || active) return
					e.currentTarget.style.background = surface.clearHover
				}}
				onMouseLeave={(e) => {
					if (isFlat || active) return
					e.currentTarget.style.background = surface.clear
				}}
				{...rest}
			>
				<IconComponent size={iconSize ?? ICON_SIZE[size]} weight={iconWeight ?? (active ? 'fill' : 'regular')} />
				{overlay && (
					<span aria-hidden style={{ position: 'absolute', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
						{overlay}
					</span>
				)}
				{badgeColor && (
					<span
						aria-hidden
						style={{
							position: 'absolute',
							top: 2,
							right: 2,
							width: 6,
							height: 6,
							borderRadius: radius.full,
							background: badgeColor,
							border: `${stroke[1]} solid ${surface.panel}`,
						}}
					/>
				)}
			</button>
		</HoverTooltip>
	)
})

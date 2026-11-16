import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { Icon } from '../../icons'
import { hoverTransition, radius, spacing, stroke, surface, type as typeColor } from '../../tokens'
import { textStyle } from '../../tokens/typography'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'xs' | 'sm' | 'md'

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
	variant?: ButtonVariant
	size?: ButtonSize
	icon?: Icon
	iconWeight?: 'regular' | 'fill'
	iconPosition?: 'left' | 'right'
	children?: ReactNode
}

const SIZE_STYLES: Record<ButtonSize, { height: number; padding: string; iconSize: number }> = {
	// 24px matches IconButton's md box, so a Button sits flush in a header row alongside icon buttons.
	xs: { height: 24, padding: `0 ${spacing[8]}`, iconSize: 12 },
	sm: { height: 28, padding: `0 ${spacing[10]}`, iconSize: 12 },
	md: { height: 32, padding: `0 ${spacing[12]}`, iconSize: 14 },
}

const VARIANT_STYLES: Record<ButtonVariant, { background: string; color: string; border: string; hoverBackground: string }> = {
	primary: { background: surface.primary, color: typeColor.white, border: 'none', hoverBackground: surface.primaryHover },
	secondary: { background: surface.secondary, color: typeColor.secondary, border: `${stroke[1]} solid transparent`, hoverBackground: surface.secondaryHover },
	ghost: { background: surface.clear, color: typeColor.secondary, border: 'none', hoverBackground: surface.clearHover },
}

/** Reusable button — primary (filled), secondary (outlined), or ghost (borderless) — for repurposing across the app. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
	{ variant = 'secondary', size = 'md', icon: IconComponent, iconWeight = 'regular', iconPosition = 'left', children, style, disabled, ...rest },
	ref,
) {
	const sizeStyles = SIZE_STYLES[size]
	const variantStyles = VARIANT_STYLES[variant]

	return (
		<button
			ref={ref}
			type="button"
			disabled={disabled}
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				gap: spacing[6],
				height: sizeStyles.height,
				padding: sizeStyles.padding,
				borderRadius: radius.sm,
				opacity: disabled ? 0.5 : 1,
				...textStyle('label-12'),
				background: variantStyles.background,
				color: variantStyles.color,
				border: variantStyles.border,
				transition: hoverTransition,
				...style,
			}}
			onMouseEnter={(e) => {
				if (disabled) return
				e.currentTarget.style.background = variantStyles.hoverBackground
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.background = variantStyles.background
			}}
			{...rest}
		>
			{IconComponent && iconPosition === 'left' && <IconComponent size={sizeStyles.iconSize} weight={iconWeight} />}
			{children}
			{IconComponent && iconPosition === 'right' && <IconComponent size={sizeStyles.iconSize} weight={iconWeight} />}
		</button>
	)
})

import { useState } from 'react'
import type { CSSProperties, InputHTMLAttributes } from 'react'
import type { Icon } from '../../icons'
import { edge, hoverTransition, radius, spacing, stroke, surface, type as typeColor } from '../../tokens'
import { textStyle } from '../../tokens/typography'
import type { TextStyleName } from '../../tokens/typography'

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
	value: string
	onChange: (value: string) => void
	/** Fixed width in px, or a CSS length. Defaults to filling the parent. */
	width?: number | string
	/** 'box' is a filled field with all four edges, for forms. 'underline' is an open field with only a bottom edge, for naming something in place. */
	variant?: 'box' | 'underline'
	/** Underline variant only: an icon at the right end of the line, e.g. a pencil on a name. */
	trailingIcon?: Icon
	/** Underline variant only: the text style, 'body-14' unless a denser form needs 'body-13'. */
	textStyleName?: TextStyleName
}

/** Single-line text input — names, numbers and short free text. The underline variant changes its line as it is hovered, focused and filled. */
export function TextField({ value, onChange, width = '100%', variant = 'box', trailingIcon: TrailingIcon, textStyleName = 'body-14', disabled, readOnly, style, onFocus, onBlur, ...rest }: TextFieldProps) {
	const [isFocused, setIsFocused] = useState(false)
	const [isHovered, setIsHovered] = useState(false)

	if (variant === 'underline') {
		const isFilled = value.length > 0
		// Line brightness: focus is the strongest, then hover, then a filled value, then an empty field at rest.
		const lineColor = isFocused ? edge.focus : isHovered && !readOnly ? edge.active : isFilled ? edge.subtle : edge.default

		return (
			<label
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				style={{
					width,
					height: 32,
					display: 'flex',
					alignItems: 'center',
					gap: spacing[8],
					padding: `0 ${spacing[4]}`,
					borderBottom: `${stroke[2]} solid ${lineColor}`,
					transition: hoverTransition,
					opacity: disabled ? 0.5 : 1,
					cursor: readOnly ? 'default' : 'text',
				}}
			>
				<input
					{...rest}
					value={value}
					disabled={disabled}
					readOnly={readOnly}
					onChange={(e) => onChange(e.target.value)}
					onFocus={(e) => {
						setIsFocused(true)
						onFocus?.(e)
					}}
					onBlur={(e) => {
						setIsFocused(false)
						onBlur?.(e)
					}}
					style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: isFilled ? typeColor.secondary : typeColor.muted, ...textStyle(textStyleName), ...style }}
				/>
				{TrailingIcon && <TrailingIcon size={16} color={isFocused ? typeColor.secondary : typeColor.muted} />}
			</label>
		)
	}

	const fieldStyle: CSSProperties = {
		width,
		height: 28,
		padding: `0 ${spacing[8]}`,
		background: surface.control,
		border: `${stroke[2]} solid ${edge.default}`,
		borderRadius: radius.sm,
		outline: 'none',
		color: typeColor.secondary,
		opacity: disabled ? 0.5 : 1,
		...textStyle('body-13'),
		...style,
	}

	return <input {...rest} value={value} disabled={disabled} readOnly={readOnly} onChange={(e) => onChange(e.target.value)} onFocus={onFocus} onBlur={onBlur} style={fieldStyle} />
}

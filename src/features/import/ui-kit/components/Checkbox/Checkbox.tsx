import { Check, Minus } from '../../icons'
import { edge, radius, spacing, stroke, surface, type as typeColor } from '../../tokens'
import { textStyle } from '../../tokens/typography'
import { Tooltip, useDelayedHover } from '../Tooltip'

export interface CheckboxProps {
	checked: boolean
	onChange: (checked: boolean) => void
	label?: string
	disabled?: boolean
	/** Shows a dash instead of a check — some but not all of a group's children are checked. Takes precedence over `checked`. */
	indeterminate?: boolean
	/** Shown in a tooltip above the checkbox on hover while `disabled` — explains why it can't be toggled right now. */
	disabledReason?: string
	/** 'sm' is the 12px box used in dense side-panel lists; 'md' (16px) is the default. */
	size?: 'sm' | 'md'
}

/** Reusable checkbox — filled square + check glyph, with an optional trailing label. */
const BOX_SIZE = { sm: 12, md: 16 } as const
const GLYPH_SIZE = { sm: 8, md: 12 } as const

/** The box on its own, for places that draw a checkbox inside something already clickable, like a menu row. */
export function CheckboxMark({ checked, indeterminate, size = 'md' }: { checked: boolean; indeterminate?: boolean; size?: 'sm' | 'md' }) {
	const filled = checked || indeterminate
	return (
		<span
			aria-hidden
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				flexShrink: 0,
				width: BOX_SIZE[size],
				height: BOX_SIZE[size],
				borderRadius: size === 'sm' ? radius.xs : radius.sm,
				background: filled ? surface.primary : surface.control,
				border: filled ? 'none' : `${stroke[1]} solid ${edge.subtle}`,
			}}
		>
			{indeterminate ? <Minus size={GLYPH_SIZE[size]} weight="bold" color={typeColor.white} /> : checked && <Check size={GLYPH_SIZE[size]} weight="bold" color={typeColor.white} />}
		</span>
	)
}

export function Checkbox({ checked, onChange, label, disabled, indeterminate, disabledReason, size = 'md' }: CheckboxProps) {
	const { hovered, onMouseEnter, onMouseLeave } = useDelayedHover()

	const button = (
		<button
			type="button"
			role="checkbox"
			aria-checked={indeterminate ? 'mixed' : checked}
			disabled={disabled}
			onClick={() => onChange(!checked)}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				// A checked box holds an icon and an empty one doesn't, which moves the baseline an inline-flex box sits on; centring on the line instead keeps it from shifting 1px when toggled.
				verticalAlign: 'middle',
				gap: spacing[6],
				background: 'none',
				border: 'none',
				padding: 0,
				cursor: disabled ? 'not-allowed' : 'pointer',
				opacity: disabled ? 0.5 : 1,
			}}
		>
			<CheckboxMark checked={checked} indeterminate={indeterminate} size={size} />
			{label && <span style={{ ...textStyle('body-13'), color: typeColor.secondary }}>{label}</span>}
		</button>
	)

	if (!disabled || !disabledReason) return button

	return (
		<Tooltip visible={hovered} message={disabledReason} placement="top">
			{button}
		</Tooltip>
	)
}

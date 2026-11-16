import { colors, radius, spacing } from '../../tokens'
import { textStyle } from '../../tokens/typography'
import { Tooltip, useDelayedHover } from '../Tooltip'

export interface RadioOption<T extends string> {
	value: T
	label: string
	disabled?: boolean
	/** Shown in a tooltip above the option on hover while `disabled` — explains why it can't be selected right now. */
	disabledReason?: string
}

export interface RadioGroupProps<T extends string> {
	options: RadioOption<T>[]
	value: T
	onChange: (value: T) => void
}

const DOT_SIZE = 16
const DOT_INNER_SIZE = 8

function RadioOptionButton<T extends string>({
	option,
	selected,
	onChange,
}: {
	option: RadioOption<T>
	selected: boolean
	onChange: (value: T) => void
}) {
	const { hovered, onMouseEnter, onMouseLeave } = useDelayedHover()
	const disabled = Boolean(option.disabled)

	const button = (
		<button
			type="button"
			role="radio"
			aria-checked={selected}
			aria-disabled={disabled}
			onClick={() => {
				if (!disabled) onChange(option.value)
			}}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: spacing[8],
				background: 'none',
				border: 'none',
				padding: 0,
				cursor: disabled ? 'not-allowed' : 'pointer',
				opacity: disabled ? 0.5 : 1,
			}}
		>
			<span
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					justifyContent: 'center',
					width: DOT_SIZE,
					height: DOT_SIZE,
					borderRadius: radius.full,
					border: `1.5px solid ${selected ? colors.surface.primary : colors.edge.default}`,
				}}
			>
				{selected && (
					<span
						style={{
							width: DOT_INNER_SIZE,
							height: DOT_INNER_SIZE,
							borderRadius: radius.full,
							background: colors.surface.primary,
						}}
					/>
				)}
			</span>
			<span style={{ ...textStyle('body-14'), color: colors.type.primary }}>{option.label}</span>
		</button>
	)

	if (!disabled || !option.disabledReason) return button

	return (
		<Tooltip visible={hovered} message={option.disabledReason} placement="top">
			{button}
		</Tooltip>
	)
}

/** Side-by-side radio options — filled dot when selected. For mutually-exclusive choices shown inline (not a dropdown). */
export function RadioGroup<T extends string>({ options, value, onChange }: RadioGroupProps<T>) {
	return (
		<div style={{ display: 'flex', gap: spacing[24] }}>
			{options.map((option) => (
				<RadioOptionButton key={option.value} option={option} selected={option.value === value} onChange={onChange} />
			))}
		</div>
	)
}

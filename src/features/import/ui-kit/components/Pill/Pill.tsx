import { useState } from 'react'
import { X } from '../../icons'
import { colors, hoverTransition, radius, spacing } from '../../tokens'
import { textStyle } from '../../tokens/typography'
import { Tooltip, useDelayedHover } from '../Tooltip'

export interface PillProps {
	label: string
	selected: boolean
	onToggle: () => void
	disabled?: boolean
	/** Shown in a tooltip above the pill on hover while `disabled` — explains why it can't be toggled right now. */
	disabledReason?: string
}

/** Toggleable chip — for small multi-select choices (e.g. expression filters). Figma node 387:7417/387:7439. */
export function Pill({ label, selected, onToggle, disabled, disabledReason }: PillProps) {
	// Instant, for the hover styling below — a tooltip flashing in late is fine, but a chip that's
	// slow to light up under the cursor reads as laggy.
	const [hovered, setHovered] = useState(false)
	// Delayed, for the disabled-reason tooltip only, so a quick pass-over doesn't flash it.
	const tooltipHover = useDelayedHover()

	const button = (
		<button
			type="button"
			aria-pressed={selected}
			aria-disabled={disabled}
			onClick={() => {
				if (!disabled) onToggle()
			}}
			onMouseEnter={() => {
				setHovered(true)
				tooltipHover.onMouseEnter()
			}}
			onMouseLeave={() => {
				setHovered(false)
				tooltipHover.onMouseLeave()
			}}
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: spacing[6],
				// Fixed so the chip is 24px whatever its border or icon.
				height: 24,
				boxSizing: 'border-box',
				padding: `0 ${spacing[8]}`,
				borderRadius: radius.sm,
				// Inactive has no visible edge until hovered; active is the one outlined chip, with an X to take it off.
				border: `0.5px solid ${selected ? colors.edge.emphasis : hovered && !disabled ? colors.edge.active : 'transparent'}`,
				// Same fill either way so toggling doesn't change the chip's weight; hover steps it one brighter.
				background: hovered && !disabled ? (selected ? colors.surface.secondaryHover : colors.surface.control) : colors.surface.elevated,
				cursor: disabled ? 'not-allowed' : 'pointer',
				transition: hoverTransition,
				// A disabled-but-selected pill (e.g. the last expression left checked, which can't be
				// unchecked) should still read as active/locked-on, not grayed-out like an unavailable
				// option — the dim treatment only applies to a disabled pill that's also unselected.
				opacity: disabled && !selected ? 0.5 : 1,
			}}
		>
			<span
				style={{
					...textStyle('body-12'),
					color: selected ? colors.type.primary : hovered && !disabled ? colors.type.secondary : colors.type.muted,
					whiteSpace: 'nowrap',
				}}
			>
				{label}
			</span>
			{selected && <X size={12} color={colors.type.primary} />}
		</button>
	)

	if (!disabled || !disabledReason) return button

	return (
		<Tooltip visible={tooltipHover.hovered} message={disabledReason} placement="top">
			{button}
		</Tooltip>
	)
}

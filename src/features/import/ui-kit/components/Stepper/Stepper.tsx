import { useState } from 'react'
import { Minus, Plus } from '../../icons'
import { colors, radius, stroke } from '../../tokens'
import { textStyle } from '../../tokens/typography'
import { Tooltip, useDelayedHover } from '../Tooltip'

export interface StepperProps {
	value: number
	min: number
	max: number
	onChange: (value: number) => void
	/** Overrides the rendered value text (e.g. "Auto" / "Off") without changing the underlying number. */
	displayValue?: string
	disabled?: boolean
	/** Recolors the value and border in accent blue — e.g. when a total was auto-raised to fit an allocation. */
	highlighted?: boolean
	/** Brightens the border — e.g. while a popover anchored to this stepper is open. Overridden by `warning` and `highlighted`. */
	active?: boolean
	/** Recolors the value and border in warning yellow — e.g. an Auto pose that the current total leaves with zero photos. Takes precedence over `highlighted`. */
	warning?: boolean
	/** Dims the value to a muted gray — e.g. a pose explicitly set to 0/excluded, so it reads as "off" rather than a normal count. Lowest precedence. */
	muted?: boolean
	/** Shown in a tooltip above the − button on hover once it's floored at `min` — explains why it won't go lower. */
	decrementDisabledReason?: string
	/** Shown in a tooltip above the + button on hover once it's capped at `max` — explains why it won't go higher. */
	incrementDisabledReason?: string
	width?: number
}

const HEIGHT = 28
const BUTTON_WIDTH = 28
const VALUE_WIDTH = 32

/** Reusable −/value/+ numeric stepper — for bounded counts (keep-per-subject, group shots, pose counts). */
export function Stepper({
	value,
	min,
	max,
	onChange,
	displayValue,
	disabled,
	highlighted,
	active,
	warning,
	muted,
	decrementDisabledReason,
	incrementDisabledReason,
	width = 112,
}: StepperProps) {
	const canDecrement = !disabled && value > min
	const canIncrement = !disabled && value < max
	const decrementHover = useDelayedHover()
	const incrementHover = useDelayedHover()
	const [draft, setDraft] = useState<string | null>(null)

	const commitDraft = () => {
		const parsed = draft === null ? NaN : Number.parseInt(draft, 10)
		if (Number.isInteger(parsed)) onChange(Math.min(max, Math.max(min, parsed)))
		setDraft(null)
	}

	// Shared between the read-only display and the in-place input so typing a value doesn't change
	// its color from what it'll settle back into once committed.
	const valueColor = warning ? colors.type.warning : highlighted ? colors.type.accent : muted ? colors.type.muted : colors.type.primary

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				width,
				height: HEIGHT,
				// border-box so the border's presence/thickness (it disappears when muted) is absorbed
				// inside this fixed width/height instead of adding to it — otherwise the whole control,
				// and the + button with it, would shift by the border width whenever `muted` flips.
				boxSizing: 'border-box',
				borderRadius: radius.sm,
				// Muted (value at 0/off) hides the border by making it transparent rather than
				// removing it — the border's width must stay reserved at all times, or the content
				// box available to the space-between buttons shifts by the border's thickness the
				// instant `muted` flips (e.g. 0 -> 1), moving the + button.
				border: `${stroke[2]} solid ${
					muted
						? 'transparent'
						: warning
							? colors.type.warning
							: highlighted
								? colors.type.accent
								: active
									? colors.edge.active
									: colors.edge.default
				}`,
				background: colors.surface.control,
				opacity: disabled ? 0.5 : 1,
			}}
		>
			<Tooltip
				visible={decrementHover.hovered && !canDecrement && !!decrementDisabledReason}
				message={decrementDisabledReason ?? ''}
				placement="top"
			>
				{/* aria-disabled (not the native `disabled` attribute) so a disabled button still fires
				 * mouse events — otherwise the tooltip explaining why it's floored could never show on hover. */}
				<button
					type="button"
					aria-label="Decrease"
					aria-disabled={!canDecrement}
					onClick={() => canDecrement && onChange(value - 1)}
					onMouseEnter={decrementHover.onMouseEnter}
					onMouseLeave={decrementHover.onMouseLeave}
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						width: BUTTON_WIDTH,
						height: HEIGHT,
						background: 'none',
						border: 'none',
						padding: 0,
						cursor: canDecrement ? 'pointer' : 'default',
					}}
				>
					<Minus size={12} color={canDecrement ? colors.type.secondary : colors.type.disabled} />
				</button>
			</Tooltip>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					width: VALUE_WIDTH,
					height: HEIGHT,
					flexShrink: 0,
					// Negative margin equal to the stepper's own border width so this box's border overlaps
					// it instead of sitting inset by it — the full HEIGHT (28) box reaches the pill's outer
					// top/bottom edge instead of stopping at the pill's inner (border-in) content box.
					margin: '-1px 0',
					// Kept tight horizontally so a two-digit value (this stepper can reach 20) still fits.
					padding: `0 2px`,
					// A box only appears while actively editing — it's what marks the value as a text
					// field you can type into, rather than just the stepper's usual read-only display.
					// A literal 0.5px (the spec's hairline stroke) rounds away to nothing on standard-DPI
					// displays, so this uses a full 1px to stay reliably visible.
					border: draft !== null ? `1px solid ${colors.edge.active}` : '1px solid transparent',
					borderRadius: radius.xs,
				}}
			>
				{draft !== null ? (
					<input
						type="text"
						inputMode="numeric"
						value={draft}
						autoFocus
						// Selecting the existing digits on focus lets typing immediately replace them,
						// instead of the user having to select-all or delete first.
						onFocus={(e) => e.target.select()}
						onChange={(e) => setDraft(e.target.value.replace(/[^0-9-]/g, ''))}
						onBlur={commitDraft}
						onKeyDown={(e) => {
							if (e.key === 'Enter') commitDraft()
							if (e.key === 'Escape') setDraft(null)
						}}
						style={{
							...textStyle('label-13'),
							color: valueColor,
							width: '100%',
							textAlign: 'center',
							background: 'none',
							border: 'none',
							outline: 'none',
							padding: 0,
						}}
					/>
				) : (
					<span
						onClick={() => !disabled && setDraft(String(value))}
						style={{
							...textStyle('label-13'),
							color: valueColor,
							cursor: disabled ? 'default' : 'text',
						}}
					>
						{displayValue ?? value}
					</span>
				)}
			</div>
			<Tooltip
				visible={incrementHover.hovered && !canIncrement && !!incrementDisabledReason}
				message={incrementDisabledReason ?? ''}
				placement="top"
			>
				<button
					type="button"
					aria-label="Increase"
					aria-disabled={!canIncrement}
					onClick={() => canIncrement && onChange(value + 1)}
					onMouseEnter={incrementHover.onMouseEnter}
					onMouseLeave={incrementHover.onMouseLeave}
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						width: BUTTON_WIDTH,
						height: HEIGHT,
						background: 'none',
						border: 'none',
						padding: 0,
						cursor: canIncrement ? 'pointer' : 'default',
					}}
				>
					<Plus size={12} color={canIncrement ? colors.type.secondary : colors.type.disabled} />
				</button>
			</Tooltip>
		</div>
	)
}

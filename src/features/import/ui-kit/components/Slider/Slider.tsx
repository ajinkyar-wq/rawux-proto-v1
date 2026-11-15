import { useRef, useState } from 'react'
import { colors, radius, spacing } from '../../tokens'
import { textStyle } from '../../tokens/typography'

export interface SliderProps {
	/** Ordered set of selectable values — the slider snaps to the nearest index. */
	steps: number[]
	value: number
	onChange: (value: number) => void
	label: string
	width?: number | string
	/** One label per step, rendered under a tick at that step's position — also draws tick dots for every step. */
	stepLabels?: string[]
	/** Just two fixed labels under the track ends (left/right) — for continuous-feeling sliders where per-step ticks don't apply. Mutually exclusive with `stepLabels`. */
	endLabels?: [string, string]
	/** Floating pill above the handle showing the current value (e.g. a live percentage). */
	valueLabel?: string
	/** Overrides the filled-track color (defaults to today's grey). */
	accentColor?: string
}

const TRACK_HEIGHT = 4
const HANDLE_PADDING = 2

// Figma spec (node 347:6529): handle bar grows and lightens from Default -> Hover -> Grabbed.
const HANDLE_BAR: Record<'default' | 'hover' | 'grabbed', { w: number; h: number; color: string }> = {
	default: { w: 2, h: 12, color: colors.edge.subtle },
	hover: { w: 4, h: 14, color: colors.edge.active },
	grabbed: { w: 4, h: 14, color: colors.edge.strong },
}

/** Reusable discrete stepped slider — for thumbnail size, zoom, or any fixed-step control. Pass `stepLabels` for a labeled-tick variant (e.g. strictness pickers). */
export function Slider({
	steps,
	value,
	onChange,
	label,
	width = 88,
	stepLabels,
	endLabels,
	valueLabel,
	accentColor = 'var(--ui-color-grey-500)',
}: SliderProps) {
	const trackRef = useRef<HTMLDivElement>(null)
	const [hovered, setHovered] = useState(false)
	const [dragging, setDragging] = useState(false)

	const index = Math.max(0, steps.indexOf(value))
	const percent = steps.length > 1 ? (index / (steps.length - 1)) * 100 : 0

	const state = dragging ? 'grabbed' : hovered ? 'hover' : 'default'
	const bar = HANDLE_BAR[state]
	const pillSize = { w: bar.w + HANDLE_PADDING * 2, h: bar.h + HANDLE_PADDING * 2 }

	const setValueFromClientX = (clientX: number) => {
		const rect = trackRef.current?.getBoundingClientRect()
		if (!rect) return
		const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
		onChange(steps[Math.round(ratio * (steps.length - 1))])
	}

	return (
		<div style={{ width, display: 'flex', flexDirection: 'column', gap: 4 }}>
			<div
				ref={trackRef}
				role="slider"
				aria-label={label}
				aria-valuemin={0}
				aria-valuemax={steps.length - 1}
				aria-valuenow={index}
				tabIndex={0}
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
				onPointerDown={(e) => {
					e.currentTarget.setPointerCapture(e.pointerId)
					setDragging(true)
					setValueFromClientX(e.clientX)
				}}
				onPointerMove={(e) => {
					if (dragging) setValueFromClientX(e.clientX)
				}}
				onPointerUp={() => setDragging(false)}
				onPointerCancel={() => setDragging(false)}
				onLostPointerCapture={() => setDragging(false)}
				onKeyDown={(e) => {
					if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(steps[Math.min(steps.length - 1, index + 1)])
					if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(steps[Math.max(0, index - 1)])
				}}
				style={{
					position: 'relative',
					width: '100%',
					height: 18,
					display: 'flex',
					alignItems: 'center',
					cursor: 'pointer',
					touchAction: 'none',
				}}
			>
				{/* Track */}
				<div
					style={{
						position: 'absolute',
						left: 0,
						right: 0,
						height: TRACK_HEIGHT,
						borderRadius: radius.xl,
						background: 'var(--ui-edge-5)',
						overflow: 'hidden',
					}}
				>
					<div
						style={{
							position: 'absolute',
							left: 0,
							top: 0,
							bottom: 0,
							width: `${percent}%`,
							background: accentColor,
						}}
					/>
				</div>

				{/* Step tick dots */}
				{stepLabels &&
					steps.map((step, i) => {
						const tickPercent = steps.length > 1 ? (i / (steps.length - 1)) * 100 : 0
						return (
							<div
								key={step}
								style={{
									position: 'absolute',
									left: `${tickPercent}%`,
									top: '50%',
									transform: 'translate(-50%, -50%)',
									width: 6,
									height: 6,
									borderRadius: radius.full,
									background: i <= index ? accentColor : 'var(--ui-edge-5)',
									pointerEvents: 'none',
								}}
							/>
						)
					})}

				{/* Handle */}
				<div
					style={{
						position: 'absolute',
						left: `${percent}%`,
						top: '50%',
						transform: 'translate(-50%, -50%)',
						width: pillSize.w,
						height: pillSize.h,
						borderRadius: radius.full,
						background: 'var(--ui-surface-1)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						pointerEvents: 'none',
					}}
				>
					<div style={{ width: bar.w, height: bar.h, borderRadius: radius.lg, background: bar.color }} />
				</div>

				{/* Floating current-value pill — overlaid just below the track, doesn't reserve flow height. */}
				{valueLabel && (
					<div
						style={{
							position: 'absolute',
							left: `${percent}%`,
							top: '100%',
							marginTop: spacing[4],
							transform: 'translateX(-50%)',
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
							padding: spacing[2],
							borderRadius: radius.xs,
							background: colors.surface.inverse,
							pointerEvents: 'none',
							zIndex: 1,
						}}
					>
						<span
							style={{
								...textStyle('subheading-11'),
								color: colors.type.inverse,
								textTransform: 'uppercase',
								whiteSpace: 'nowrap',
							}}
						>
							{valueLabel}
						</span>
					</div>
				)}
			</div>

			{endLabels && (
				<div style={{ display: 'flex', justifyContent: 'space-between' }}>
					<span style={{ ...textStyle('subheading-11'), color: colors.type.disabled, textTransform: 'uppercase' }}>{endLabels[0]}</span>
					<span style={{ ...textStyle('subheading-11'), color: colors.type.disabled, textTransform: 'uppercase' }}>{endLabels[1]}</span>
				</div>
			)}

			{stepLabels && (
				<div style={{ position: 'relative', height: 12, width: '100%' }}>
					{stepLabels.map((stepLabel, i) => {
						const tickPercent = steps.length > 1 ? (i / (steps.length - 1)) * 100 : 0
						const isFirst = i === 0
						const isLast = i === stepLabels.length - 1
						return (
							<span
								key={stepLabel}
								style={{
									...textStyle('subheading-11'),
									position: 'absolute',
									left: `${tickPercent}%`,
									transform: isFirst ? 'none' : isLast ? 'translateX(-100%)' : 'translateX(-50%)',
									color: i === index ? colors.type.muted : colors.type.disabled,
									whiteSpace: 'nowrap',
									textTransform: 'uppercase',
								}}
							>
								{stepLabel}
							</span>
						)
					})}
				</div>
			)}
		</div>
	)
}

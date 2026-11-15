import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { colors, radius, spacing } from '../../tokens'
import { textStyle } from '../../tokens/typography'

export type TooltipPlacement = 'top' | 'bottom'
export type TooltipSize = 'default' | 'compact'
export type TooltipAlign = 'center' | 'end'

export interface TooltipProps {
	visible: boolean
	message: string
	placement?: TooltipPlacement
	/** 'default' is the larger info bubble (e.g. validation messages). 'compact' is a single-line, 20px-tall hint for icon/shortcut labels. */
	size?: TooltipSize
	/** Single keyboard key shown as a keycap chip after the message, e.g. "Q" or "⌘". Compact size only. */
	shortcut?: string
	/** 'center' (default) centers the bubble on the trigger. 'end' right-aligns it to the trigger instead, for a trigger near a container's right edge. */
	align?: TooltipAlign
	/** Layout overrides for the box around the trigger, e.g. `{ display: 'flex', minWidth: 0 }` so a truncated label inside it can still shrink. */
	wrapperStyle?: CSSProperties
	/** The element the tooltip points at — rendered as-is; the bubble anchors relative to this. */
	children: ReactNode
}

const BEAK_SIZE = 6
/** Space kept between the bubble and the window edge. */
const VIEWPORT_MARGIN = 8
const TOOLTIP_Z_INDEX = 200

interface BubblePosition {
	top: number
	left: number
	/** Distance of the beak's centre from the bubble's left edge. */
	beakCentre: number
	placement: TooltipPlacement
}

/**
 * Reusable floating info bubble with a beak pointing at its trigger — e.g. an out-of-range input.
 *
 * The bubble is drawn on top of the page, outside the trigger's own container, so a dialog or scrolling
 * panel around the trigger can't cut it off. It stays inside the window: it slides sideways to fit, and
 * flips to the other side of the trigger when there is no room.
 */
export function Tooltip({ visible, message, placement = 'bottom', size = 'default', shortcut, align = 'center', wrapperStyle, children }: TooltipProps) {
	const isCompact = size === 'compact'
	const triggerRef = useRef<HTMLDivElement>(null)
	const bubbleRef = useRef<HTMLDivElement>(null)
	const [position, setPosition] = useState<BubblePosition | null>(null)

	useLayoutEffect(() => {
		const trigger = triggerRef.current
		const bubble = bubbleRef.current
		if (!visible || !trigger || !bubble) {
			setPosition(null)
			return
		}
		const rect = trigger.getBoundingClientRect()
		const width = bubble.offsetWidth
		const height = bubble.offsetHeight
		const centre = rect.left + rect.width / 2
		const wanted = align === 'end' ? rect.right - width : centre - width / 2
		const left = Math.max(VIEWPORT_MARGIN, Math.min(wanted, window.innerWidth - width - VIEWPORT_MARGIN))
		const needed = height + BEAK_SIZE
		const fitsAbove = rect.top - needed >= VIEWPORT_MARGIN
		const fitsBelow = rect.bottom + needed <= window.innerHeight - VIEWPORT_MARGIN
		const side: TooltipPlacement = placement === 'top' ? (fitsAbove || !fitsBelow ? 'top' : 'bottom') : fitsBelow || !fitsAbove ? 'bottom' : 'top'
		setPosition({
			top: side === 'top' ? rect.top - height - BEAK_SIZE : rect.bottom + BEAK_SIZE,
			left,
			beakCentre: Math.max(BEAK_SIZE * 2, Math.min(centre - left, width - BEAK_SIZE * 2)),
			placement: side,
		})
	}, [visible, message, shortcut, placement, align, size])

	const isTop = (position?.placement ?? placement) === 'top'
	const beakStyle: CSSProperties = { width: 0, height: 0, marginLeft: (position?.beakCentre ?? 0) - BEAK_SIZE, borderLeft: `${BEAK_SIZE}px solid transparent`, borderRight: `${BEAK_SIZE}px solid transparent` }

	return (
		<div ref={triggerRef} style={{ position: 'relative', display: 'inline-flex', ...wrapperStyle }}>
			{children}
			{visible &&
				createPortal(
					<div
						style={{
							position: 'fixed',
							top: position?.top ?? 0,
							left: position?.left ?? 0,
							// Measured invisibly first, then shown where it fits.
							visibility: position ? 'visible' : 'hidden',
							zIndex: TOOLTIP_Z_INDEX,
							pointerEvents: 'none',
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'flex-start',
							width: 'max-content',
						}}
						ref={bubbleRef}
					>
						{/* When the tooltip sits below its trigger, the beak points up and sits above the bubble. Compact tooltips are plain chips with no beak. */}
						{!isTop && !isCompact && <div style={{ ...beakStyle, borderBottom: `${BEAK_SIZE}px solid ${colors.surface.inverse}` }} />}
						<div
							style={
								isCompact
									? {
											...textStyle('label-11'),
											display: 'flex',
											alignItems: 'center',
											height: 20,
											color: colors.type.inverseSecondary,
											background: colors.surface.inverse,
											borderRadius: radius.sm,
											padding: `0 ${spacing[6]}`,
											whiteSpace: 'nowrap',
										}
									: {
											...textStyle('label-12'),
											color: colors.type.inverseSecondary,
											background: colors.surface.inverse,
											borderRadius: radius.sm,
											padding: `${spacing[8]} ${spacing[10]}`,
											width: 'max-content',
											maxWidth: 264,
											whiteSpace: 'normal',
										}
							}
						>
							{message}
							{isCompact && shortcut && (
								<span
									style={{
										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										width: 16,
										height: 16,
										marginLeft: spacing[6],
										borderRadius: radius.xs,
										background: colors.surface.inverse,
										color: colors.type.inverseSecondary,
										fontWeight: 500,
									}}
								>
									{shortcut}
								</span>
							)}
						</div>
						{/* When the tooltip sits above its trigger, the beak points down and sits below the bubble. */}
						{isTop && !isCompact && <div style={{ ...beakStyle, borderTop: `${BEAK_SIZE}px solid ${colors.surface.inverse}` }} />}
					</div>,
					document.body,
				)}
		</div>
	)
}

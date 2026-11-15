import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { colors, radius } from '../../tokens'

const TRACK_WIDTH = 8
const THUMB_WIDTH = 4
const THUMB_WIDTH_HOVER = 6
const THUMB_MIN_HEIGHT = 24

interface ThumbGeometry {
	height: number
	top: number
	visible: boolean
}

const HIDDEN_THUMB: ThumbGeometry = { height: 0, top: 0, visible: false }

/**
 * Drop-in replacement for a plain `overflowY: 'auto'` div, with one difference: the scrollbar
 * it draws is a real always-on element, not the browser's native one. Several Chromium builds
 * (Arc included) force overlay-style native scrollbars — invisible at rest, appearing only
 * mid-scroll — and ignore any CSS attempt to override that (confirmed: neither a custom
 * `::-webkit-scrollbar` nor `scrollbar-gutter: stable` nor `overflow-y: scroll` could force one
 * to stay painted). Drawing our own is the only way to guarantee the same look everywhere.
 */
export function ScrollArea({
	children,
	style,
	/** Gap between the track and the component's own right edge — 0 by default (track flush against
	    the reserved gutter), set higher when the component spans past its visual container's padding
	    (e.g. the full side panel) and the track needs to land a fixed distance from that edge instead. */
	thumbInset = 0,
	/** Skips reserving gutter width for the track (it overlaps content instead) and only draws the
	    thumb while the pointer is over the scroll area or a drag is in progress — for a region where
	    scrolling is the exception rather than the norm, so the scrollbar shouldn't cost permanent
	    space or draw attention when nothing needs it. */
	overlay = false,
	/** Fill for the track itself (default transparent) — for a region like the photo grid where the
	    scrollbar needs to read as a distinct lane against the content scrolling behind it. */
	trackBackground = 'transparent',
}: {
	children: ReactNode
	style?: CSSProperties
	thumbInset?: number
	overlay?: boolean
	trackBackground?: string
}) {
	const contentRef = useRef<HTMLDivElement>(null)
	const [thumb, setThumb] = useState<ThumbGeometry>(HIDDEN_THUMB)
	const [dragging, setDragging] = useState(false)
	const [hovered, setHovered] = useState(false)
	const [areaHovered, setAreaHovered] = useState(false)

	useEffect(() => {
		const el = contentRef.current
		if (!el) return

		function recompute() {
			if (!el) return
			const { scrollHeight, clientHeight, scrollTop } = el
			if (scrollHeight <= clientHeight + 1) {
				setThumb(HIDDEN_THUMB)
				return
			}
			const height = Math.max(THUMB_MIN_HEIGHT, (clientHeight / scrollHeight) * clientHeight)
			const scrollableDistance = scrollHeight - clientHeight
			const trackRange = clientHeight - height
			const top = scrollableDistance > 0 ? trackRange * (scrollTop / scrollableDistance) : 0
			setThumb({ height, top, visible: true })
		}

		recompute()
		// Catches both the container being resized (e.g. the SidePanel resize handle) and its
		// content growing after mount (e.g. lazy-loaded images changing scrollHeight).
		const ro = new ResizeObserver(recompute)
		ro.observe(el)
		for (const child of el.children) ro.observe(child)
		el.addEventListener('scroll', recompute)
		return () => {
			ro.disconnect()
			el.removeEventListener('scroll', recompute)
		}
	}, [children])

	function onThumbPointerDown(e: React.PointerEvent) {
		e.preventDefault()
		const el = contentRef.current
		if (!el) return
		setDragging(true)
		const startY = e.clientY
		const startScrollTop = el.scrollTop
		const { scrollHeight, clientHeight } = el
		const thumbHeight = Math.max(THUMB_MIN_HEIGHT, (clientHeight / scrollHeight) * clientHeight)
		const scrollableDistance = scrollHeight - clientHeight
		const trackRange = clientHeight - thumbHeight

		function onMove(moveEvent: PointerEvent) {
			const deltaY = moveEvent.clientY - startY
			const scrollDelta = trackRange > 0 ? (deltaY / trackRange) * scrollableDistance : 0
			el!.scrollTop = Math.min(scrollableDistance, Math.max(0, startScrollTop + scrollDelta))
		}
		function onUp() {
			setDragging(false)
			window.removeEventListener('pointermove', onMove)
			window.removeEventListener('pointerup', onUp)
		}
		window.addEventListener('pointermove', onMove)
		window.addEventListener('pointerup', onUp)
	}

	const thumbShown = thumb.visible && (!overlay || areaHovered || dragging)

	return (
		<div
			style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0, ...style }}
			onMouseEnter={overlay ? () => setAreaHovered(true) : undefined}
			onMouseLeave={overlay ? () => setAreaHovered(false) : undefined}
		>
			<div
				ref={contentRef}
				className="scroll-area-content"
				style={{
					flex: 1,
					minHeight: 0,
					overflowY: 'auto',
					// Vertical scroll only — the custom thumb is drawn for one axis, and leaving this as
					// the CSS default of 'visible' would compute to 'auto' anyway (the spec forces both
					// axes into a scrolling mode once either one is), silently growing a native
					// horizontal scrollbar for any content that bleeds past its own edge.
					overflowX: 'hidden',
					paddingRight: overlay ? 0 : TRACK_WIDTH + thumbInset,
				}}
			>
				{children}
			</div>
			{thumbShown && (
				<div
					onMouseEnter={() => setHovered(true)}
					onMouseLeave={() => setHovered(false)}
					style={{
						position: 'absolute',
						right: thumbInset,
						top: 0,
						bottom: 0,
						width: TRACK_WIDTH,
						background: trackBackground,
					}}
				>
					<div
						onPointerDown={onThumbPointerDown}
						style={{
							position: 'absolute',
							left: '50%',
							top: thumb.height ? thumb.top : 0,
							transform: 'translateX(-50%)',
							width: dragging || hovered ? THUMB_WIDTH_HOVER : THUMB_WIDTH,
							height: thumb.height,
							borderRadius: radius.full,
							background: dragging || hovered ? colors.edge.active : colors.edge.subtle,
							cursor: 'pointer',
							transition: 'width 100ms ease',
						}}
					/>
				</div>
			)}
		</div>
	)
}

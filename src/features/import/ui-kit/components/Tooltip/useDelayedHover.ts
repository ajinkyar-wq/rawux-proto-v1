import { useEffect, useRef, useState } from 'react'

export const TOOLTIP_SHOW_DELAY_MS = 200

/**
 * Drives a hover-triggered Tooltip's `visible` flag: delays false -> true by `delayMs` (so a
 * mouse just passing over the trigger doesn't flash the tooltip), but resolves true -> false
 * immediately on mouse-out, cancelling any show that hasn't fired yet.
 */
export function useDelayedHover(delayMs: number = TOOLTIP_SHOW_DELAY_MS) {
	const [hovered, setHovered] = useState(false)
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

	useEffect(() => () => clearTimeout(timeoutRef.current), [])

	const onMouseEnter = () => {
		timeoutRef.current = setTimeout(() => setHovered(true), delayMs)
	}
	const onMouseLeave = () => {
		clearTimeout(timeoutRef.current)
		setHovered(false)
	}

	return { hovered, onMouseEnter, onMouseLeave }
}

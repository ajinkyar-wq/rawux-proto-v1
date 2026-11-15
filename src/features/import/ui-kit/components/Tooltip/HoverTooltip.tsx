import type { ReactNode } from 'react'
import { Tooltip } from './Tooltip'
import type { TooltipProps } from './Tooltip'
import { useDelayedHover } from './useDelayedHover'

export interface HoverTooltipProps extends Omit<TooltipProps, 'visible' | 'message' | 'children'> {
	/** The text to show. Without one, the children render as they are and no tooltip appears. */
	message?: string
	children: ReactNode
}

/**
 * A `Tooltip` that shows itself after a short hover, for the common case of labelling or explaining one element.
 * Use this instead of a native `title` attribute, whose look and timing the browser decides.
 * Hovering anywhere over the children counts, including a disabled control.
 */
export function HoverTooltip({ message, children, ...tooltipProps }: HoverTooltipProps) {
	const { hovered, onMouseEnter, onMouseLeave } = useDelayedHover()

	// The outer element has no box of its own, so it never changes the layout around the trigger.
	return (
		<div style={{ display: 'contents' }} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
			<Tooltip {...tooltipProps} visible={hovered && !!message} message={message ?? ''}>
				{children}
			</Tooltip>
		</div>
	)
}

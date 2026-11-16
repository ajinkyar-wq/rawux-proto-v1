import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { edge, radius, shadow, spacing, surface } from '../../tokens'

export type PopoverPlacement = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'

export interface PopoverProps {
	isOpen: boolean
	onClose: () => void
	/** The trigger element(s) — rendered as-is; the panel anchors relative to this. */
	children: ReactNode
	/** Panel content, shown when `isOpen`. */
	content: ReactNode
	placement?: PopoverPlacement
	/** Overrides the panel's inner padding (defaults to spacing[8]). */
	padding?: string
}

const PLACEMENT_STYLE: Record<PopoverPlacement, React.CSSProperties> = {
	'bottom-left': { top: '100%', left: 0, marginTop: spacing[4] },
	'bottom-right': { top: '100%', right: 0, marginTop: spacing[4] },
	'top-left': { bottom: '100%', left: 0, marginBottom: spacing[4] },
	'top-right': { bottom: '100%', right: 0, marginBottom: spacing[4] },
}

/** Reusable floating-panel primitive — anchors a panel to a trigger and closes on outside click. */
export function Popover({ isOpen, onClose, children, content, placement = 'bottom-left', padding = spacing[8] }: PopoverProps) {
	const rootRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!isOpen) return
		const handleClickOutside = (e: MouseEvent) => {
			if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose()
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [isOpen, onClose])

	return (
		<div ref={rootRef} style={{ position: 'relative' }}>
			{children}
			{isOpen && (
				<div
					style={{
						position: 'absolute',
						...PLACEMENT_STYLE[placement],
						background: surface.elevated,
						border: `1px solid ${edge.default}`,
						borderRadius: radius.lg,
						padding,
						zIndex: 20,
						boxShadow: shadow.elevated,
					}}
				>
					{content}
				</div>
			)}
		</div>
	)
}

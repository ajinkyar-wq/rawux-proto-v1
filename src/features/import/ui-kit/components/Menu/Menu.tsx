import { useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Check } from '../../icons'
import type { Icon } from '../../icons'
import { colors, edge, hoverTransition, layer, radius, shadow, spacing, surface, type as typeColor } from '../../tokens'
import { textStyle } from '../../tokens/typography'
import { CheckboxMark } from '../Checkbox/Checkbox'
import { Divider } from '../Divider'

export type MenuEntry =
	| { kind?: 'item'; key: string; label: string; icon?: Icon; isDanger?: boolean; isChecked?: boolean; /** Shows `isChecked` as a checkbox in the icon's place, for a setting that is switched on or off. */ hasCheckbox?: boolean; /** Leaves the menu open after the row is chosen, for rows that toggle a selection. */ keepOpen?: boolean; onSelect: () => void }
	| { kind: 'header'; key: string; label: string }
	| { kind: 'divider'; key: string }

export interface MenuProps {
	isOpen: boolean
	onClose: () => void
	/** The trigger the menu hangs from. */
	anchorRef: RefObject<HTMLElement | null>
	entries: MenuEntry[]
	/** Which edge of the trigger the menu lines up with. */
	align?: 'left' | 'right'
	/** Opens the menu centred on this point (viewport pixels, e.g. where the trigger was clicked) instead of against the trigger's edge. For wide triggers whose edge is far from the pointer. */
	anchorPoint?: { x: number; y: number } | null
	minWidth?: number
}

const MENU_GAP = 4
const VIEWPORT_MARGIN = 8
/** Space left between the pointer and a menu opened at it, so the menu doesn't sit under the cursor. */
const POINTER_CLEARANCE = 8

/**
 * Floating action/option list. Rendered through a portal with fixed positioning so a scrollable or
 * overflow-hidden ancestor (a side panel, a modal body) can't clip it.
 */
export function Menu({ isOpen, onClose, anchorRef, entries, align = 'left', anchorPoint, minWidth = 160 }: MenuProps) {
	const menuRef = useRef<HTMLDivElement>(null)
	const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

	useLayoutEffect(() => {
		if (!isOpen) return
		function measure() {
			const anchor = anchorRef.current
			const menu = menuRef.current
			if (!anchor || !menu) return
			const rect = anchor.getBoundingClientRect()
			const width = menu.offsetWidth
			const height = menu.offsetHeight
			const left = anchorPoint ? anchorPoint.x - width / 2 : align === 'right' ? rect.right - width : rect.left
			// With a point, hang just under the pointer; otherwise under the trigger.
			const belowEdge = anchorPoint ? anchorPoint.y + POINTER_CLEARANCE : rect.bottom
			const aboveEdge = anchorPoint ? anchorPoint.y - POINTER_CLEARANCE : rect.top
			const below = belowEdge + MENU_GAP
			// Flip above when there isn't room underneath, e.g. a footer button.
			const top = below + height > window.innerHeight - VIEWPORT_MARGIN ? Math.max(VIEWPORT_MARGIN, aboveEdge - height - MENU_GAP) : below
			setPosition({ top, left: Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - width - VIEWPORT_MARGIN)) })
		}
		measure()
		window.addEventListener('resize', measure)
		window.addEventListener('scroll', measure, true)
		return () => {
			window.removeEventListener('resize', measure)
			window.removeEventListener('scroll', measure, true)
		}
	}, [isOpen, anchorRef, align, anchorPoint, entries.length])

	useLayoutEffect(() => {
		if (!isOpen) return
		function handleMouseDown(e: MouseEvent) {
			const target = e.target as Node
			if (menuRef.current?.contains(target) || anchorRef.current?.contains(target)) return
			onClose()
		}
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key !== 'Escape') return
			// Capture phase, so an open menu closes alone instead of also closing the dialog under it.
			e.stopPropagation()
			onClose()
		}
		document.addEventListener('mousedown', handleMouseDown)
		window.addEventListener('keydown', handleKeyDown, true)
		return () => {
			document.removeEventListener('mousedown', handleMouseDown)
			window.removeEventListener('keydown', handleKeyDown, true)
		}
	}, [isOpen, onClose, anchorRef])

	if (!isOpen) return null

	return createPortal(
		<div
			ref={menuRef}
			role="menu"
			style={{
				position: 'fixed',
				top: position?.top ?? 0,
				left: position?.left ?? 0,
				// Hidden until measured so it never flashes at the corner of the screen.
				visibility: position ? 'visible' : 'hidden',
				minWidth,
				display: 'flex',
				flexDirection: 'column',
				gap: spacing[2],
				padding: spacing[4],
				background: surface.elevated,
				border: `1px solid ${edge.default}`,
				borderRadius: radius.lg,
				boxShadow: shadow.elevated,
				// Above Modal's 100 so menus opened from inside a dialog are visible.
				zIndex: layer.menu,
			}}
		>
			{entries.map((entry) => {
				if (entry.kind === 'divider')
					return (
						<div key={entry.key} style={{ margin: `${spacing[2]} 0` }}>
							<Divider orientation="horizontal" size="100%" />
						</div>
					)
				if (entry.kind === 'header') {
					return (
						<span key={entry.key} style={{ ...textStyle('subheading-11'), color: typeColor.muted, padding: `${spacing[6]} ${spacing[8]} ${spacing[2]}` }}>
							{entry.label}
						</span>
					)
				}
				const IconComponent = entry.icon
				return (
					<MenuItem
						key={entry.key}
						label={entry.label}
						icon={IconComponent}
						isDanger={entry.isDanger}
						isChecked={entry.isChecked}
						hasCheckbox={entry.hasCheckbox}
						onSelect={() => {
							if (!entry.keepOpen) onClose()
							entry.onSelect()
						}}
					/>
				)
			})}
		</div>,
		document.body,
	)
}

function MenuItem({ label, icon: IconComponent, isDanger, isChecked, hasCheckbox, onSelect }: { label: string; icon?: Icon; isDanger?: boolean; isChecked?: boolean; hasCheckbox?: boolean; onSelect: () => void }) {
	const [hovered, setHovered] = useState(false)

	return (
		<button
			type="button"
			role={hasCheckbox ? 'menuitemcheckbox' : 'menuitem'}
			aria-checked={hasCheckbox ? !!isChecked : undefined}
			onClick={onSelect}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: spacing[8],
				width: '100%',
				padding: spacing[8],
				border: 'none',
				borderRadius: radius.sm,
				background: hovered ? surface.clearHover : surface.clear,
				color: isDanger ? colors.type.error : hovered ? typeColor.secondary : typeColor.muted,
				textAlign: 'left',
				cursor: 'pointer',
				transition: hoverTransition,
				...textStyle('label-12'),
			}}
		>
			{hasCheckbox ? <CheckboxMark checked={!!isChecked} /> : IconComponent && <IconComponent size={16} />}
			<span style={{ flex: 1, whiteSpace: 'nowrap' }}>{label}</span>
			{!hasCheckbox && isChecked && <Check size={16} color={typeColor.secondary} />}
		</button>
	)
}

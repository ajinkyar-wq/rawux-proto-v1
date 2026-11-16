import type { ReactNode } from 'react'
import { CaretDown, type Icon } from '../../icons'
import { edge, hoverTransition, radius, spacing, stroke, surface, type as typeColor } from '../../tokens'
import { textStyle } from '../../tokens/typography'
import type { TextStyleName } from '../../tokens/typography'
import { Button } from '../Button'
import { Popover } from '../Popover'
import { FilterCounterBadge } from '../FilterCounterBadge'

export interface DropdownSelectorProps {
	icon?: Icon
	label: string
	isOpen: boolean
	onToggle: () => void
	onClose: () => void
	children?: ReactNode
	/** Which edge of the trigger the panel hangs from. Use 'right' near the right edge of the screen to keep the panel from overflowing. */
	align?: 'left' | 'right'
	/** True once this menu's filter has a selection — matches IconButton's active treatment (border + filled background + brighter label). */
	active?: boolean
	/** Number of active selections inside this menu. Rendered as a white pill badge next to the label (Figma "Filter Counter", node 4578:1056) instead of appended to the label text. Omitted/0 hides the badge. */
	count?: number
	/** Overrides the panel's inner padding (defaults to the Popover's own default of spacing[8]). */
	panelPadding?: string
	/** Overrides the panel's minimum width (defaults to 160, sized for longer filter-menu labels). */
	panelMinWidth?: number
	/** Overrides the trigger label's text style (defaults to 'body-12') — set this to match whatever
	 * text style the panel's own options use, so the trigger and its menu don't carry mismatched
	 * font weights for what reads as one control. */
	labelTextStyle?: TextStyleName
	/** 'secondary' renders the trigger as a secondary Button (filled, caret on the right) instead of the borderless filter-menu trigger. Ignores active, count, icon and labelTextStyle. */
	variant?: 'ghost' | 'secondary'
}

/**
 * Reusable label + caret trigger that reveals a floating panel — for filter/selector menus across the app.
 *
 * Two dropdown styles exist on purpose: this one is borderless and sits inline in toolbars and headers,
 * where it filters or views what's already on screen. Use `SelectField` instead for a value being
 * entered in a form or settings panel, which needs a visible field edge.
 */
export function DropdownSelector({
	icon: IconComponent,
	label,
	isOpen,
	onToggle,
	onClose,
	children,
	align = 'left',
	active = false,
	count = 0,
	panelPadding,
	panelMinWidth = 160,
	labelTextStyle = 'body-12',
	variant = 'ghost',
}: DropdownSelectorProps) {
	return (
		<Popover
			isOpen={isOpen && Boolean(children)}
			onClose={onClose}
			placement={align === 'right' ? 'bottom-right' : 'bottom-left'}
			padding={panelPadding}
			content={<div style={{ minWidth: panelMinWidth }}>{children}</div>}
		>
			{variant === 'secondary' ? (
				<Button variant="secondary" size="xs" icon={CaretDown} iconPosition="right" onClick={onToggle} aria-expanded={isOpen}>
					{label}
				</Button>
			) : (
				<button
					type="button"
					onClick={onToggle}
					aria-expanded={isOpen}
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: spacing[4],
						height: 28,
						padding: `${spacing[6]} ${spacing[8]}`,
						borderRadius: radius.sm,
						border: active ? `${stroke[0]} solid ${edge.active}` : 'none',
						background: active ? surface.clearActive : isOpen ? surface.clearHover : surface.clear,
						color: active ? typeColor.secondary : typeColor.muted,
						transition: hoverTransition,
						...textStyle(labelTextStyle),
					}}
				>
					{IconComponent && <IconComponent size={16} />}
					{label}
					{count > 0 && <FilterCounterBadge count={count} />}
					<CaretDown size={16} />
				</button>
			)}
		</Popover>
	)
}

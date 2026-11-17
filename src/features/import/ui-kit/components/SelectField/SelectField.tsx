import { useRef, useState } from 'react'
import { CaretDown } from '../../icons'
import type { Icon } from '../../icons'
import { edge, hoverTransition, radius, spacing, stroke, surface, type as typeColor } from '../../tokens'
import { textStyle } from '../../tokens/typography'
import { Menu } from '../Menu'
import type { MenuEntry } from '../Menu'

export interface SelectFieldProps {
	/** The selected option, or null to show the placeholder. */
	value: string | null
	placeholder?: string
	options: string[]
	/** An icon for the options that have one, by option, shown before its name in the menu. */
	optionIcons?: Record<string, Icon>
	onChange: (value: string) => void
	/** Overrides the text shown for the selected value, e.g. a shortened path. */
	displayValue?: string
	/** Trailing icon, defaulting to a caret. A folder icon makes the field read as a path picker. */
	icon?: Icon
	/** Extra entries below the options, after a divider, e.g. "Choose Folder...". */
	footerEntries?: MenuEntry[]
	disabled?: boolean
	/** Fixed width in px, or a CSS length. Defaults to filling the parent. */
	width?: number | string
	label: string
	/** 'box' is a filled field with all four edges. 'underline' is an open field with only a bottom edge, matching `TextField`'s underline variant. */
	variant?: 'box' | 'underline'
	/** Which edge of the field the menu lines up with. Right, when the menu is wider than a field that sits at the end of a row. */
	menuAlign?: 'left' | 'right'
}

/**
 * Full-width dropdown field for picking one value from a short list — forms, settings panels.
 *
 * Boxed, on the control surface, because it is an input with a value. Toolbar and header filters use
 * the borderless `DropdownSelector` instead.
 */
export function SelectField({ value, placeholder, options, optionIcons, onChange, displayValue, icon: IconComponent = CaretDown, footerEntries, disabled, width = '100%', label, variant = 'box', menuAlign = 'left' }: SelectFieldProps) {
	const [isOpen, setIsOpen] = useState(false)
	const [isHovered, setIsHovered] = useState(false)
	const isUnderline = variant === 'underline'
	// Underline: the line brightens on hover and while the menu is open, like the underline text field's does on hover and focus.
	const lineColor = isOpen ? edge.focus : isHovered && !disabled ? edge.active : value === null ? edge.default : edge.subtle
	const anchorRef = useRef<HTMLButtonElement>(null)
	const SelectedIcon = value === null ? undefined : optionIcons?.[value]
	const entries: MenuEntry[] = [
		...options.map((option) => ({ key: option, label: option, icon: optionIcons?.[option], isChecked: option === value, onSelect: () => onChange(option) })),
		...(footerEntries ? [{ kind: 'divider' as const, key: 'footer-divider' }, ...footerEntries] : []),
	]

	return (
		<>
			<button
				ref={anchorRef}
				type="button"
				aria-label={label}
				aria-expanded={isOpen}
				disabled={disabled}
				onClick={() => setIsOpen((open) => !open)}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: spacing[8],
					width,
					height: 32,
					padding: isUnderline ? `0 ${spacing[4]}` : `0 ${spacing[8]}`,
					background: isUnderline ? 'transparent' : surface.control,
					// One shorthand or the other, never both: an undefined longhand next to a shorthand makes React reset that edge to the browser default.
					...(isUnderline ? { border: 'none', borderBottom: `${stroke[2]} solid ${lineColor}` } : { border: `${stroke[2]} solid ${edge.default}` }),
					borderRadius: isUnderline ? 0 : radius.sm,
					color: value === null ? typeColor.muted : typeColor.secondary,
					opacity: disabled ? 0.5 : 1,
					cursor: disabled ? 'not-allowed' : 'pointer',
					transition: hoverTransition,
					...textStyle('body-13'),
				}}
			>
				<span style={{ minWidth: 0, display: 'inline-flex', alignItems: 'center', gap: spacing[8] }}>
					{/* The chosen option keeps the icon it has in the menu. */}
					{SelectedIcon && <SelectedIcon size={16} color={typeColor.secondary} style={{ flexShrink: 0 }} />}
					<span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value === null ? placeholder : (displayValue ?? value)}</span>
				</span>
				<IconComponent size={16} color={typeColor.muted} style={{ flexShrink: 0 }} />
			</button>
			<Menu isOpen={isOpen} onClose={() => setIsOpen(false)} anchorRef={anchorRef} entries={entries} align={menuAlign} minWidth={Math.max(180, anchorRef.current?.offsetWidth ?? 0)} />
		</>
	)
}

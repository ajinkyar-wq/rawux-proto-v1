/**
 * Colour tokens as CSS `var()` references, mirroring src/styles/tokens.css.
 * Import these instead of hardcoding `var(--ui-...)` strings so renames of the
 * underlying CSS custom property are caught by TypeScript.
 */

export const surface = {
	app: 'var(--ui-surface-0)',
	panel: 'var(--ui-surface-1)',
	elevated: 'var(--ui-surface-2)',
	control: 'var(--ui-surface-3)',
	/** The fill of a dialog (Figma Dialog/modal), a step darker than the app surface. */
	dialog: 'var(--ui-surface-dialog)',

	primary: 'var(--ui-surface-primary)',
	primaryHover: 'var(--ui-surface-primary--default--hover)',
	primaryActive: 'var(--ui-surface-primary--default--active)',
	primaryDisabled: 'var(--ui-surface-primary--default--disable)',

	secondary: 'var(--ui-surface-secondary)',
	secondaryHover: 'var(--ui-surface-secondary--default--hover)',
	secondaryFocus: 'var(--ui-surface-secondary--default--focus)',
	secondaryActive: 'var(--ui-surface-secondary--default--active)',

	negative: 'var(--ui-surface-negative)',
	negativeHover: 'var(--ui-surface-negative--default--hover)',
	negativeActive: 'var(--ui-surface-negative--default--active)',

	clear: 'var(--ui-surface-clear)',
	clearHover: 'var(--ui-surface-clear--default--hover)',
	clearActive: 'var(--ui-surface-clear--default--active)',

	/** Full-screen scrim behind a modal dialog. */
	overlay: 'var(--ui-surface-transparent--overlay0)',
	/** Translucent white — e.g. an unfilled star on a photo thumbnail. */
	overlayLight: 'var(--ui-surface-transparent--overlay1)',
	/** A faint wash that lifts a card off the surface behind it. */
	overlayFaint: 'var(--ui-surface-transparent--overlay2)',

	selected: 'var(--ui-surface-selected)',
	blurred: 'var(--ui-surface-blurred)',
	duplicates: 'var(--ui-surface-duplicates)',
	closedEyes: 'var(--ui-surface-closedeyes)',
	highlights: 'var(--ui-surface-highlights)',
	/** Wash behind an informational alert banner. */
	info: 'var(--ui-surface-info)',
	unrated: 'var(--ui-surface-unrated)',

	/** Light chip surface for on-dark inverse badges (e.g. a slider's floating value pill). */
	inverse: 'var(--ui-surface-2-inverse)',
} as const

export const type = {
	primary: 'var(--ui-type-0)',
	secondary: 'var(--ui-type-1)',
	muted: 'var(--ui-type-2)',
	disabled: 'var(--ui-type-3)',
	faint: 'var(--ui-type-4)',
	white: 'var(--ui-type-white)',
	accent: 'var(--ui-type-accent)',
	error: 'var(--ui-type-accent--default--error)',
	success: 'var(--ui-type-accent--default--success)',
	warning: 'var(--ui-type-accent--default--warning)',

	/** Dark text for use on light/inverse surfaces (e.g. a slider's floating value pill). */
	inverse: 'var(--ui-type-0-inverse)',
	/** Muted dark text for use on light/inverse surfaces (e.g. a tooltip bubble). */
	inverseSecondary: 'var(--ui-type-1-inverse)',
} as const

export const edge = {
	white: 'var(--ui-edge-0)',
	/** Light ring border, e.g. around a selected color swatch. */
	light: 'var(--ui-edge-1)',
	subtle: 'var(--ui-edge-5)',
	default: 'var(--ui-edge-6)',
	/** The hairline around a dialog. */
	dialog: 'var(--ui-edge-7)',
	/** Lighter edge for an input's active/focused border. */
	active: 'var(--ui-edge-4)',
	/** Stronger edge for a selected/active chip's border. */
	emphasis: 'var(--ui-edge-3)',
	/** Strongest edge — a selected grid card's border, a slider thumb being dragged. */
	strong: 'var(--ui-edge-2)',
	transparent1: 'var(--ui-edge-transparent-1)',
	focus: 'var(--ui-edge-accent--default--focus)',
	selected: 'var(--ui-edge-accent--selected)',
	blurred: 'var(--ui-edge-accent--blurred)',
	closedEyes: 'var(--ui-edge-accent--closedeyes)',
	duplicates: 'var(--ui-edge-accent--duplicates)',
	highlights: 'var(--ui-edge-accent--highlights)',
	/** Border of an informational alert banner. */
	info: 'var(--ui-edge-info)',
	unrated: 'var(--ui-edge-accent--unrated)',
} as const

export const label = {
	green: 'var(--ui-color-label-green)',
	blue: 'var(--ui-color-label-blue)',
	yellow: 'var(--ui-color-label-yellow)',
	red: 'var(--ui-color-label-red)',
	purple: 'var(--ui-color-label-purple)',
	gray: 'var(--ui-color-label-gray)',

	/** Soft background + border pair for a "positive/recommended" tag chip. */
	greenBg: 'var(--ui-color-transparent-green-700-12)',
	greenBorder: 'var(--ui-color-transparent-green-700-40)',
} as const

export const shadow = {
	elevated: 'var(--ui-shadow-elevated)',
} as const

export const colors = { surface, type, edge, label, shadow }

/** The orange of the One Click bolt, used for its label wherever it appears. It has no design-system token. */
export const oneClickColor = '#FF975F'

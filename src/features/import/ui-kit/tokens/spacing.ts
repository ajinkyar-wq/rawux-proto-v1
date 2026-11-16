/** Spacing, radius, and stroke tokens as CSS `var()` references. */

export const spacing = {
	0: 'var(--ui-spacing-0)',
	1: 'var(--ui-spacing-1)',
	2: 'var(--ui-spacing-2)',
	4: 'var(--ui-spacing-4)',
	6: 'var(--ui-spacing-6)',
	8: 'var(--ui-spacing-8)',
	10: 'var(--ui-spacing-10)',
	12: 'var(--ui-spacing-12)',
	16: 'var(--ui-spacing-16)',
	20: 'var(--ui-spacing-20)',
	24: 'var(--ui-spacing-24)',
	28: 'var(--ui-spacing-28)',
	32: 'var(--ui-spacing-32)',
	40: 'var(--ui-spacing-40)',
	48: 'var(--ui-spacing-48)',
	56: 'var(--ui-spacing-56)',
	64: 'var(--ui-spacing-64)',
} as const

export const radius = {
	none: 'var(--ui-rounded-none)',
	xs: 'var(--ui-rounded-xs)',
	sm: 'var(--ui-rounded-sm)',
	md: 'var(--ui-rounded-md)',
	lg: 'var(--ui-rounded-lg)',
	xl: 'var(--ui-rounded-xl)',
	'2xl': 'var(--ui-rounded-2xl)',
	'3xl': 'var(--ui-rounded-3xl)',
	full: 'var(--ui-rounded-full)',
} as const

export const stroke = {
	0: 'var(--ui-stroke-0)',
	1: 'var(--ui-stroke-1)',
	2: 'var(--ui-stroke-2)',
	3: 'var(--ui-stroke-3)',
	4: 'var(--ui-stroke-4)',
} as const

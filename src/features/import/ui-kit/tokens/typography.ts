import type { CSSProperties } from 'react'

/**
 * Named text styles, mirroring the `--proto-text-*` scale in src/styles/tokens.css.
 * Always apply size + weight + line-height (+ tracking/uppercase where present)
 * together via `textStyle()` rather than picking properties individually.
 */
export type TextStyleName =
	| 'heading-20'
	| 'heading-16'
	| 'heading-14'
	| 'body-14'
	| 'body-13'
	| 'body-12'
	| 'body-11'
	| 'label-20'
	| 'label-14'
	| 'label-13'
	| 'label-12'
	| 'label-11'
	| 'label-9'
	| 'subheading-10'
	| 'subheading-11'

const BASE: Record<TextStyleName, CSSProperties> = {
	'heading-20': {
		fontSize: 'var(--proto-text-heading-20-size)',
		fontWeight: 'var(--proto-text-heading-20-weight)' as CSSProperties['fontWeight'],
		lineHeight: 'var(--proto-text-heading-20-line-height)',
	},
	'heading-16': {
		fontSize: 'var(--proto-text-heading-16-size)',
		fontWeight: 'var(--proto-text-heading-16-weight)' as CSSProperties['fontWeight'],
		lineHeight: 'var(--proto-text-heading-16-line-height)',
	},
	'heading-14': {
		fontSize: 'var(--proto-text-heading-14-size)',
		fontWeight: 'var(--proto-text-heading-14-weight)' as CSSProperties['fontWeight'],
		lineHeight: 'var(--proto-text-heading-14-line-height)',
	},
	'body-14': {
		fontSize: 'var(--proto-text-body-14-size)',
		fontWeight: 'var(--proto-text-body-14-weight)' as CSSProperties['fontWeight'],
		lineHeight: 'var(--proto-text-body-14-line-height)',
	},
	'body-13': {
		fontSize: 'var(--proto-text-body-13-size)',
		fontWeight: 'var(--proto-text-body-13-weight)' as CSSProperties['fontWeight'],
		lineHeight: 'var(--proto-text-body-13-line-height)',
	},
	'body-11': {
		fontSize: 'var(--proto-text-body-11-size)',
		fontWeight: 'var(--proto-text-body-11-weight)' as CSSProperties['fontWeight'],
		lineHeight: 'var(--proto-text-body-11-line-height)',
	},
	'body-12': {
		fontSize: 'var(--proto-text-body-12-size)',
		fontWeight: 'var(--proto-text-body-12-weight)' as CSSProperties['fontWeight'],
		lineHeight: 'var(--proto-text-body-12-line-height)',
	},
	'label-20': {
		fontSize: 'var(--proto-text-label-20-size)',
		fontWeight: 'var(--proto-text-label-20-weight)' as CSSProperties['fontWeight'],
		lineHeight: 'var(--proto-text-label-20-line-height)',
	},
	'label-14': {
		fontSize: 'var(--proto-text-label-14-size)',
		fontWeight: 'var(--proto-text-label-14-weight)' as CSSProperties['fontWeight'],
		lineHeight: 'var(--proto-text-label-14-line-height)',
	},
	'label-13': {
		fontSize: 'var(--proto-text-label-13-size)',
		fontWeight: 'var(--proto-text-label-13-weight)' as CSSProperties['fontWeight'],
		lineHeight: 'var(--proto-text-label-13-line-height)',
	},
	'label-12': {
		fontSize: 'var(--proto-text-label-12-size)',
		fontWeight: 'var(--proto-text-label-12-weight)' as CSSProperties['fontWeight'],
		lineHeight: 'var(--proto-text-label-12-line-height)',
	},
	'label-11': {
		fontSize: 'var(--proto-text-label-11-size)',
		fontWeight: 'var(--proto-text-label-11-weight)' as CSSProperties['fontWeight'],
		lineHeight: 'var(--proto-text-label-11-line-height)',
	},
	'label-9': {
		fontSize: 'var(--proto-text-label-9-size)',
		fontWeight: 'var(--proto-text-label-9-weight)' as CSSProperties['fontWeight'],
		lineHeight: 'var(--proto-text-label-9-line-height)',
	},
	'subheading-10': {
		fontSize: 'var(--proto-text-subheading-10-size)',
		fontWeight: 'var(--proto-text-subheading-10-weight)' as CSSProperties['fontWeight'],
		lineHeight: 'var(--proto-text-subheading-10-line-height)',
		letterSpacing: 'var(--proto-text-subheading-10-tracking)',
		textTransform: 'uppercase',
	},
	'subheading-11': {
		fontSize: 'var(--proto-text-subheading-11-size)',
		fontWeight: 'var(--proto-text-subheading-11-weight)' as CSSProperties['fontWeight'],
		lineHeight: 'var(--proto-text-subheading-11-line-height)',
		letterSpacing: 'var(--proto-text-subheading-11-tracking)',
		textTransform: 'uppercase',
	},
}

/** Returns the CSS style object for a named text style. */
export function textStyle(name: TextStyleName): CSSProperties {
	return BASE[name]
}

export const textStyles = BASE

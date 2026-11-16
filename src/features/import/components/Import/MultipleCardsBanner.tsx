import type { CSSProperties } from 'react'
import { Info, colors, edge, radius, spacing, stroke, surface, textStyle } from '../../ui-kit'

/** An alert banner for the foot of a Destination or Source panel: a second card is a likely next step, so it is there from the start. */
export function MultipleCardsBanner({ style }: { style?: CSSProperties }) {
	return (
		<div style={{ display: 'flex', gap: spacing[8], padding: `${spacing[8]} ${spacing[10]}`, background: surface.info, border: `${stroke[0]} solid ${edge.info}`, borderRadius: radius.md, ...style }}>
			<Info size={16} color={colors.type.accent} style={{ flexShrink: 0, padding: `${spacing[2]} 0`, boxSizing: 'content-box' }} />
			<div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2], minWidth: 0 }}>
				<span style={{ ...textStyle('label-13'), color: colors.type.secondary }}>Using multiple memory cards?</span>
				<span style={{ ...textStyle('body-12'), color: colors.type.muted }}>You can add and ingest cards one by one into the same album.</span>
			</div>
		</div>
	)
}

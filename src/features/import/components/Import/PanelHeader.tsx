import type { ReactNode } from 'react'
import { colors, spacing, textStyle, layout } from '../../ui-kit'

interface PanelHeaderProps {
	title: string
	action?: ReactNode
	/** Side panels indent their header to line up with their content; a panel inside a dialog already has its padding. */
	isInset?: boolean
}

const PANEL_PADDING = spacing[12]
/** As tall as the action button, so a header doesn't grow when an action appears and the content below never moves. */

/** Title row at the top of a Source or Destination panel, with an optional action on the right. */
export function PanelHeader({ title, action, isInset = true }: PanelHeaderProps) {
	return (
		<div style={{ padding: isInset ? `${PANEL_PADDING} ${PANEL_PADDING} ${spacing[16]}` : 0 }}>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: layout.panelHeaderHeight }}>
				<span style={{ ...textStyle('heading-14'), color: colors.type.secondary }}>{title}</span>
				{action}
			</div>
		</div>
	)
}

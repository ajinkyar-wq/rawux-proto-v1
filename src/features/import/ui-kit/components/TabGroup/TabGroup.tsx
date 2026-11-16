import { radius, spacing, surface, type as typeColor } from '../../tokens'
import { textStyle } from '../../tokens/typography'

export interface TabGroupItem {
	id: string
	label: string
}

export interface TabGroupProps {
	tabs: TabGroupItem[]
	activeTab: string
	onChange: (id: string) => void
	/** Width of each tab; defaults to auto-sizing to content. */
	tabWidth?: number
}

/** Reusable segmented tab switcher for repurposing across the app. */
export function TabGroup({ tabs, activeTab, onChange, tabWidth }: TabGroupProps) {
	return (
		<div
			role="tablist"
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				background: surface.app,
				borderRadius: radius.sm,
				padding: spacing[2],
				gap: spacing[2],
			}}
		>
			{tabs.map((tab) => {
				const isActive = tab.id === activeTab
				return (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={isActive}
						onClick={() => onChange(tab.id)}
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
							width: tabWidth,
							whiteSpace: 'nowrap',
							padding: `${spacing[6]} ${spacing[12]}`,
							borderRadius: radius.sm,
							border: 'none',
							background: isActive ? surface.secondary : 'transparent',
							color: isActive ? typeColor.secondary : typeColor.disabled,
							...textStyle('subheading-11'),
						}}
					>
						{tab.label}
					</button>
				)
			})}
		</div>
	)
}

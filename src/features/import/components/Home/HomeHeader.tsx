import type { ReactNode } from 'react'
import { Aperture, Button, ChatCircleDots, Divider, DotsThreeVertical, Gear, House, IconButton, Lightning, MagicWand, MonitorPlay, Storefront, colors, radius, spacing, stroke, textStyle } from '../../ui-kit'
import type { Icon } from '../../ui-kit'

const NAV_ITEMS: Array<{ label: string; icon: Icon; isActive?: boolean }> = [
	{ label: 'Home', icon: House, isActive: true },
	{ label: 'AI Profiles', icon: MagicWand },
	{ label: 'Marketplace', icon: Storefront },
]

const AVATAR_SIZE = 28

/** The label colours stand in for the badge's rainbow outline. */
const BADGE_OUTLINE = `linear-gradient(135deg, ${colors.label.red}, ${colors.label.yellow}, ${colors.label.green}, ${colors.label.blue}, ${colors.label.purple})`

function FoundersBadge(): ReactNode {
	return (
		<span style={{ display: 'inline-flex', padding: stroke[1], borderRadius: radius.sm, background: BADGE_OUTLINE }}>
			<span
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					height: 22,
					padding: `0 ${spacing[6]}`,
					borderRadius: radius.xs,
					background: colors.surface.panel,
					color: colors.type.secondary,
					...textStyle('label-9'),
				}}
			>
				FOUNDERS
			</span>
		</span>
	)
}

/** Top bar of the Home screen: product mark, main navigation, and account utilities. */
export function HomeHeader() {
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				padding: `${spacing[8]} ${spacing[16]}`,
				background: colors.surface.panel,
				borderBottom: `${stroke[1]} solid ${colors.edge.default}`,
			}}
		>
			<div style={{ display: 'flex', alignItems: 'center', gap: spacing[12] }}>
				<Aperture size={24} color={colors.type.accent} />
				<FoundersBadge />
				<Divider size={20} />
				<nav style={{ display: 'flex', alignItems: 'center', gap: spacing[4] }}>
					{NAV_ITEMS.map(({ label, icon, isActive }) => (
						<Button
							key={label}
							variant="ghost"
							icon={icon}
							iconWeight={isActive ? 'fill' : 'regular'}
							style={{ color: isActive ? colors.type.primary : colors.type.muted, ...textStyle('body-14') }}
						>
							{label}
						</Button>
					))}
				</nav>
			</div>

			<div style={{ display: 'flex', alignItems: 'center', gap: spacing[12] }}>
				<IconButton icon={ChatCircleDots} label="Chat" hasTooltip={false} badgeColor={colors.type.success} />
				<IconButton icon={MonitorPlay} label="Tutorials" hasTooltip={false} />
				<IconButton icon={Gear} label="Settings" hasTooltip={false} />
				<IconButton icon={Lightning} label="Upgrade" hasTooltip={false} iconWeight="fill" style={{ color: colors.type.warning }} />
				<IconButton icon={DotsThreeVertical} label="More" hasTooltip={false} />
				<span
					aria-label="Account"
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						justifyContent: 'center',
						width: AVATAR_SIZE,
						height: AVATAR_SIZE,
						borderRadius: radius.full,
						background: colors.surface.control,
						color: colors.type.secondary,
						...textStyle('label-12'),
					}}
				>
					S
				</span>
			</div>
		</div>
	)
}

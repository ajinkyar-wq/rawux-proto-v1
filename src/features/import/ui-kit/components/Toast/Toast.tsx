import { layer, radius, shadow, spacing, surface, type as typeColor } from '../../tokens'
import { textStyle } from '../../tokens/typography'

export interface ToastProps {
	message: string
}

/** Short status message pinned to the bottom centre of the screen. It clears itself, so it has no close button. Always light, so it stands apart from the dark app, like a tooltip. */
export function Toast({ message }: ToastProps) {
	return (
		<div
			role="status"
			style={{
				position: 'fixed',
				left: '50%',
				bottom: spacing[24],
				transform: 'translateX(-50%)',
				maxWidth: 520,
				display: 'flex',
				alignItems: 'center',
				gap: spacing[8],
				padding: `${spacing[8]} ${spacing[16]}`,
				background: surface.inverse,
				borderRadius: radius.lg,
				boxShadow: shadow.elevated,
				color: typeColor.inverse,
				// Above Modal (100), Menu (110) and the Finder dialog (115).
				zIndex: layer.toast,
				...textStyle('body-13'),
			}}
		>
			<span>{message}</span>
		</div>
	)
}

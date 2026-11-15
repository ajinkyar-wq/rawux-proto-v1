import { radius, surface } from '../../tokens'

export interface SwitchProps {
	checked: boolean
	onChange: (checked: boolean) => void
	disabled?: boolean
	/** Names the switch for screen readers when no visible label sits beside it. */
	'aria-label'?: string
}

const TRACK = { width: 28, height: 16, padding: 2 }
const THUMB = TRACK.height - TRACK.padding * 2

/** Reusable on/off toggle — filled track slides a circular thumb between edges. */
export function Switch({ checked, onChange, disabled, 'aria-label': ariaLabel }: SwitchProps) {
	return (
		<button
			type="button"
			role="switch"
			aria-label={ariaLabel}
			aria-checked={checked}
			disabled={disabled}
			onClick={() => onChange(!checked)}
			style={{
				position: 'relative',
				width: TRACK.width,
				height: TRACK.height,
				padding: TRACK.padding,
				borderRadius: radius.full,
				border: 'none',
				background: checked ? surface.primary : surface.control,
				opacity: disabled ? 0.5 : 1,
				cursor: disabled ? 'default' : 'pointer',
				flexShrink: 0,
			}}
		>
			<span
				style={{
					display: 'block',
					width: THUMB,
					height: THUMB,
					borderRadius: radius.full,
					background: surface.panel,
					transform: `translateX(${checked ? TRACK.width - TRACK.padding * 2 - THUMB : 0}px)`,
					transition: 'transform 0.12s ease',
				}}
			/>
		</button>
	)
}

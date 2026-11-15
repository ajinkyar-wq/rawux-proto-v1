import { radius, surface } from '../../tokens'

export interface ProgressBarProps {
	/** 0 to 100. */
	value: number
	label?: string
}

const BAR_HEIGHT = 4

/** Thin determinate progress bar — for long-running work such as copying photos. */
export function ProgressBar({ value, label }: ProgressBarProps) {
	const clamped = Math.min(100, Math.max(0, value))

	return (
		<div
			role="progressbar"
			aria-label={label}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(clamped)}
			style={{ width: '100%', height: BAR_HEIGHT, borderRadius: radius.full, background: surface.control, overflow: 'hidden' }}
		>
			<div style={{ width: `${clamped}%`, height: '100%', background: surface.primary, transition: 'width 0.06s linear' }} />
		</div>
	)
}

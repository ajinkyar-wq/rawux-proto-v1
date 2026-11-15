import { Button, ProgressBar, colors, spacing, textStyle } from '../../ui-kit'
import type { CopyProgress as CopyProgressState } from '../../store/useImportStore'

const SECONDS_PER_BATCH = 26
const PHOTOS_PER_BATCH = 95

function etaText(photosLeft: number): string {
	const seconds = Math.ceil((photosLeft * SECONDS_PER_BATCH) / PHOTOS_PER_BATCH)
	return seconds >= 60 ? `About ${Math.ceil(seconds / 60)} min left` : `About ${Math.max(1, seconds)} sec left`
}

/** What a footer shows while photos are being copied, in place of its usual controls: how far along, how long is left, the bar, and a way to stop. */
export function CopyProgress({ progress, onCancel }: { progress: CopyProgressState; onCancel: () => void }) {
	return (
		<div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: spacing[16] }}>
		<div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: spacing[8] }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing[12], ...textStyle('body-12') }}>
				<span style={{ color: colors.type.secondary, fontVariantNumeric: 'tabular-nums' }}>
					Ingesting {progress.done} of {progress.total} photo{progress.total === 1 ? '' : 's'}
				</span>
				<span style={{ color: colors.type.muted }}>{etaText(progress.total - progress.done)}</span>
			</div>
			<ProgressBar value={(progress.done / progress.total) * 100} label="Ingest progress" />
		</div>
			<Button variant="secondary" onClick={onCancel}>
				Cancel
			</Button>
		</div>
	)
}

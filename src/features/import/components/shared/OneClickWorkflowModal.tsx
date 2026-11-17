import { useState } from 'react'
import { Button, Divider, IconButton, Modal, PencilSimple, SelectField, X, colors, modalWidth, spacing, textStyle } from '../../ui-kit'
import { GENRES } from '../../data/genres'
import { useCullStore } from '../../store/useCullStore'

interface Step {
	id: string
	title: string
	/** What the step will do, as a short run of settings. */
	summary: string
}

const STEPS: Step[] = [
	{ id: 'culling', title: 'Culling', summary: 'Auto Target • Standard' },
	{ id: 'editing', title: 'Editing', summary: 'Tropical Sorbet • AI Crop • AI Straighten • AI Mask' },
	{ id: 'retouching', title: 'Retouching', summary: 'Subject Sync' },
	{ id: 'export', title: 'Export', summary: 'Export to Folder' },
]

/** One Click: pick which steps run and with what, then start them all in one go. Shown wherever the app asks for it, over whatever is open. */
export function OneClickWorkflowModal() {
	const isOpen = useCullStore((s) => s.oneClick.isOpen)
	const initialGenre = useCullStore((s) => s.oneClick.genre)
	const onClose = useCullStore((s) => s.closeOneClick)

	// Mounted only while open, so each opening starts from the genre it was asked for with every step switched on.
	return isOpen ? <OneClickWorkflow initialGenre={initialGenre} onClose={onClose} /> : null
}

function OneClickWorkflow({ initialGenre, onClose }: { initialGenre: string | null; onClose: () => void }) {
	const showToast = useCullStore((s) => s.showToast)
	const [genre, setGenre] = useState(initialGenre && GENRES.includes(initialGenre) ? initialGenre : GENRES[0])
	const [enabled, setEnabled] = useState<Record<string, boolean>>({ culling: true, editing: true, retouching: true, export: true })

	const stepCount = STEPS.filter((step) => enabled[step.id]).length

	function start() {
		onClose()
		showToast('One Click started')
	}

	return (
		<Modal isOpen onClose={onClose} width={modalWidth.compact}>
			<div style={{ display: 'flex', alignItems: 'center', gap: spacing[8] }}>
				<h3 style={{ flex: 1, margin: 0, ...textStyle('heading-16'), color: colors.type.secondary }}>One Click Workflow</h3>
				<SelectField label="Genre" value={genre} options={GENRES} onChange={setGenre} width={160} menuAlign="right" />
				<IconButton icon={X} label="Close" hasTooltip={false} onClick={onClose} />
			</div>

			<div style={{ display: 'flex', flexDirection: 'column' }}>
				{STEPS.map((step, index) => (
					<div key={step.id}>
						{index > 0 && <Divider orientation="horizontal" size="100%" color={colors.edge.transparent1} />}
						<div style={{ display: 'flex', alignItems: 'center', gap: spacing[12], padding: `${spacing[16]} 0` }}>
							<div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
								<span style={{ ...textStyle('heading-14'), color: colors.type.secondary }}>{step.title}</span>
								<span style={{ ...textStyle('body-13'), color: colors.type.muted }}>{step.summary}</span>
							</div>
							<IconButton icon={PencilSimple} label={`Edit ${step.title}`} hasTooltip={false} onClick={() => showToast(`Opens ${step.title} settings`)} />
							<Toggle label={step.title} on={enabled[step.id]} onChange={(checked) => setEnabled((prev) => ({ ...prev, [step.id]: checked }))} />
						</div>
					</div>
				))}
			</div>

			<div style={{ display: 'flex', justifyContent: 'flex-end' }}>
				<Button variant="primary" disabled={stepCount === 0} onClick={start}>
					Start Now
				</Button>
			</div>
		</Modal>
	)
}

/** Same switch as the Tethering panel: blue track when on, white handle either way. */
function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
	return (
		<button
			type="button"
			role="switch"
			aria-label={label}
			aria-checked={on}
			onClick={() => onChange(!on)}
			style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: on ? 'flex-end' : 'flex-start',
				width: 32,
				flexShrink: 0,
				padding: 2,
				border: 'none',
				borderRadius: 9999,
				background: on ? '#2563eb' : '#303030',
				cursor: 'pointer',
				transition: 'background-color 0.15s',
			}}
		>
			<span style={{ width: 12, height: 12, borderRadius: 9999, background: '#fff' }} />
		</button>
	)
}

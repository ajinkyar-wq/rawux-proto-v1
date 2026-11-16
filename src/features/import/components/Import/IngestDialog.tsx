import { Button, Checkbox, IconButton, Modal, ScrollArea, X, colors, edge, hoverTransition, modalWidth, spacing, stroke, textStyle, dimOpacity, layout } from '../../ui-kit'
import { getPhotosToIngest } from '../../lib/importPhotos'
import { formatCount } from '../../lib/plural'
import { useImportStore } from '../../store/useImportStore'
import type { ImportSource } from '../../types'
import { PanelHeader } from './PanelHeader'
import { AddSourceButton } from './AddSourceButton'
import { MultipleCardsBanner } from './MultipleCardsBanner'
import { CopyProgress } from './CopyProgress'
import { DestinationForm, DestinationSummary } from './DestinationPanel'
import { CopiedSourceCard, PendingSourceCard } from './SourceCard'

const BODY_HEIGHT = 392
/** The footer row is as tall while copying as with its button, so the dialog doesn't change size. */

function IngestSourceCard({ source }: { source: ImportSource }) {
	// Copied or not, a source looks the same here as in Option 1: its folders to choose from, or a line saying where it went.
	return source.status === 'copied' ? <CopiedSourceCard source={source} /> : <PendingSourceCard source={source} />
}

/** Option 2: choose the sources and copy settings, copy everything first, and only then look at the photos. */
export function IngestDialog() {
	const isOpen = useImportStore((s) => s.isIngestOpen)
	const sources = useImportStore((s) => s.sources)
	const progress = useImportStore((s) => s.copyProgress)
	const isSharingImages = useImportStore((s) => s.isSharingImages)
	const setSharingImages = useImportStore((s) => s.setSharingImages)
	const hiddenIds = useImportStore((s) => s.hiddenIds)
	const isEditingDestination = useImportStore((s) => s.isEditingDestination)
	const setEditingDestination = useImportStore((s) => s.setEditingDestination)
	const closeIngest = useImportStore((s) => s.closeIngest)
	const copyPendingSources = useImportStore((s) => s.copyPendingSources)
	const cancelCopy = useImportStore((s) => s.cancelCopy)
	const openPreview = useImportStore((s) => s.openPreview)
	const openCreateAlbum = useImportStore((s) => s.openCreateAlbum)
	const addToAlbum = useImportStore((s) => s.addToAlbum)

	if (!isOpen) return null

	const copied = sources.filter((source) => source.status === 'copied')
	const pending = sources.filter((source) => source.status === 'pending' && source.isEnabled)
	const pendingCount = pending.reduce((sum, source) => sum + getPhotosToIngest(source, hiddenIds).length, 0)
	const copiedCount = copied.reduce((sum, source) => sum + source.photos.length, 0)
	const showSummary = copied.length > 0 && !isEditingDestination

	return (
		<Modal isOpen onClose={closeIngest} width={modalWidth.regular}>
			{/* Closing stays available while copying: the copy carries on and shows on its album's card on Home. */}
			<div style={{ display: 'flex', alignItems: 'center', gap: spacing[8] }}>
				<h3 style={{ flex: 1, margin: 0, ...textStyle('heading-16'), color: colors.type.secondary }}>Ingest Images</h3>
				<IconButton icon={X} label="Close" hasTooltip={false} onClick={closeIngest} />
			</div>

			<div inert={progress !== null} style={{ display: 'flex', flexDirection: 'column', gap: spacing[16], opacity: progress !== null ? dimOpacity.dimmed : 1, transition: hoverTransition }}>
				<div style={{ display: 'flex', gap: spacing[16], height: BODY_HEIGHT }}>
					<section style={{ width: 252, display: 'flex', flexDirection: 'column', gap: spacing[8], minHeight: 0 }}>
						<PanelHeader title="Source" isInset={false} />
						<ScrollArea style={{ flex: 1 }} overlay>
							<div style={{ display: 'flex', flexDirection: 'column', gap: spacing[8] }}>
								{sources.length ? sources.map((source) => <IngestSourceCard key={source.id} source={source} />) : <span style={{ ...textStyle('body-13'), color: colors.type.muted }}>Add a card or folder.</span>}
								<AddSourceButton />
							</div>
						</ScrollArea>
						<MultipleCardsBanner />
					</section>

					<section style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: spacing[8], minHeight: 0, paddingLeft: spacing[16], borderLeft: `${stroke[1]} solid ${edge.default}` }}>
						<PanelHeader
							title="Destination"
							isInset={false}
							action={
								isEditingDestination && copied.length > 0 && (
									<Button variant="secondary" size="sm" onClick={() => setEditingDestination(false)}>
										Use Last Settings
									</Button>
								)
							}
						/>
						<ScrollArea style={{ flex: 1 }} overlay>
							{showSummary ? <DestinationSummary copiedSources={copied} pendingCount={pendingCount} onChange={() => setEditingDestination(true)} /> : <DestinationForm />}
						</ScrollArea>
					</section>
				</div>
			</div>

			{/* While copying, the progress takes the place of the button: nothing here can be changed until it is done. */}
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: spacing[12], minHeight: layout.footerContentHeight }}>
				{progress ? (
					<CopyProgress progress={progress} onCancel={cancelCopy} />
				) : (
					<>
						<Checkbox label="Share images to help improve Aftershoot" checked={isSharingImages} onChange={setSharingImages} />
						{/* Right beside the buttons, away from the checkbox: what they will take in, the photos still to ingest, or those already in. */}
						<span style={{ flex: 1, textAlign: 'right', ...textStyle('body-12'), color: colors.type.muted, fontVariantNumeric: 'tabular-nums' }}>{pendingCount || copiedCount ? formatCount(pendingCount || copiedCount, 'photo') : ''}</span>
						{pendingCount > 0 ? (
							<>
								<Button variant="secondary" onClick={() => copyPendingSources(openPreview)}>
									Ingest &amp; Add Source
								</Button>
								<Button variant="primary" onClick={() => copyPendingSources(openCreateAlbum)}>
									{addToAlbum ? 'Ingest & Add to Album' : 'Ingest & Create Album'}
								</Button>
							</>
						) : (
							<>
								<Button variant="secondary" disabled={!copiedCount} onClick={openPreview}>
									Review Photos
								</Button>
								<Button variant="primary" disabled={!copiedCount} onClick={openCreateAlbum}>
									{addToAlbum ? 'Add to Album' : 'Create Album'}
								</Button>
							</>
						)}
					</>
				)}
			</div>
		</Modal>
	)
}

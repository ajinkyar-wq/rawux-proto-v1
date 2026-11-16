import { useRef, useState } from 'react'
import { Button, FolderSimple, ImageSquare, Menu, Plus, SimCard, spacing, surface } from '../../ui-kit'
import { useImportStore } from '../../store/useImportStore'

/**
 * Full-width "Add Source" button below the last source card: pick another folder or set of files to bring in. Folders and files are separate choices.
 * It sticks to the foot of the scrolling list once the cards run past it, so it is never out of reach. `bottomInset` is the panel's own bottom padding,
 * which the stuck button has to keep because the padding scrolls away with the list.
 */
export function AddSourceButton({ disabled, bottomInset = 0 }: { disabled?: boolean; bottomInset?: string | number }) {
	const openFinder = useImportStore((s) => s.openFinder)
	const addCardSource = useImportStore((s) => s.addCardSource)
	// Where the button was clicked: the button spans the panel, so the menu opens at the pointer rather than at an edge far from it.
	const [anchorPoint, setAnchorPoint] = useState<{ x: number; y: number } | null>(null)
	const anchorRef = useRef<HTMLButtonElement>(null)

	return (
		<div style={{ position: 'sticky', bottom: 0, zIndex: 1, background: surface.panel, padding: `${spacing[8]} 0 ${bottomInset}`, margin: `calc(-1 * ${spacing[8]}) 0 0` }}>
			<Button
				ref={anchorRef}
				variant="secondary"
				icon={Plus}
				disabled={disabled}
				style={{ width: '100%' }}
				onClick={(event) => setAnchorPoint(anchorPoint ? null : { x: event.clientX, y: event.clientY })}
			>
				Add Source
			</Button>
			<Menu
				isOpen={anchorPoint !== null}
				onClose={() => setAnchorPoint(null)}
				anchorPoint={anchorPoint}
				anchorRef={anchorRef}
				entries={[
					{ key: 'camera-card', label: 'CANON 720D', icon: SimCard, onSelect: () => addCardSource(1, 'CANON 720D') },
					{ key: 'brand-card', label: 'SANDISK', icon: SimCard, onSelect: () => addCardSource(2, 'SANDISK') },
					{ kind: 'divider', key: 'divider' },
					{ key: 'folder', label: 'Add Folder', icon: FolderSimple, onSelect: () => openFinder('addFolder') },
					{ key: 'files', label: 'Add Files', icon: ImageSquare, onSelect: () => openFinder('addFiles') },
				]}
			/>
		</div>
	)
}

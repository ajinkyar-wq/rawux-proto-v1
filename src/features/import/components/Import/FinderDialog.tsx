import { useEffect, useState } from 'react'
import { Button, CaretLeft, Eject, FolderSimple, IconButton, Image, ImageSquare, modalWidth, colors, edge, radius, shadow, spacing, stroke, surface, textStyle, layer } from '../../ui-kit'
import { FINDER_DRIVES, FINDER_FAVORITES, isDocumentFile, isImageFile, listFinderLocation } from '../../data/mockImport'
import type { FinderPurpose } from '../../store/useImportStore'
import { useImportStore } from '../../store/useImportStore'

const DIALOG_HEIGHT = 420
const SIDEBAR_WIDTH = 168
const FILE_PURPOSES: FinderPurpose[] = ['importFiles', 'copyFiles', 'addFiles']
/** Like the macOS open panel with both files and folders allowed: either can be selected, and several at once. */
const MIXED_PURPOSES: FinderPurpose[] = ['import', 'add']

/** Every way into the Finder ends in the same verb: whatever happens next, the user is importing what they picked. */
const CTA_VERB = 'Import'

function startLocation(purpose: FinderPurpose): string[] {
	if (purpose === 'copyFiles') return ['NIKON D7200', 'DCIM']
	if (purpose === 'copyFolder') return ['NIKON D7200']
	return ['Pictures']
}

/** A stand-in for the system file picker, so the prototype can show choosing folders and files without touching the real disk. */
export function FinderDialog() {
	const request = useImportStore((s) => s.finder)
	if (!request) return null
	return <FinderWindow key={request.purpose} purpose={request.purpose} />
}

function SidebarButton({ label, isActive, isRemovable, onClick }: { label: string; isActive: boolean; /** A drive that can be ejected shows an eject icon at the right. */ isRemovable?: boolean; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: spacing[8],
				textAlign: 'left',
				padding: `${spacing[6]} ${spacing[8]}`,
				border: 'none',
				borderRadius: radius.sm,
				background: isActive ? surface.control : surface.clear,
				color: isActive ? colors.type.secondary : colors.type.muted,
				cursor: 'pointer',
				...textStyle('body-13'),
			}}
		>
			<span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
			{isRemovable && <Eject size={16} aria-label="Removable drive" style={{ flexShrink: 0 }} />}
		</button>
	)
}

function FinderWindow({ purpose }: { purpose: FinderPurpose }) {
	const completeFinder = useImportStore((s) => s.completeFinder)
	const closeFinder = useImportStore((s) => s.closeFinder)
	const [stack, setStack] = useState<string[]>(() => startLocation(purpose))
	const [selected, setSelected] = useState<string[]>([])
	const isMixed = MIXED_PURPOSES.includes(purpose)
	const isMulti = FILE_PURPOSES.includes(purpose)

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key !== 'Escape') return
			// Capture phase, so Escape closes only the picker and not the dialog it was opened from.
			e.stopPropagation()
			closeFinder()
		}
		window.addEventListener('keydown', handleKeyDown, true)
		return () => window.removeEventListener('keydown', handleKeyDown, true)
	}, [closeFinder])
	const location = stack[stack.length - 1]
	const entries = listFinderLocation(location)

	function go(nextStack: string[]) {
		setStack(nextStack)
		setSelected([])
	}

	function handleEntryClick(name: string, isFolder: boolean, isExtending: boolean) {
		if (isMixed) {
			// As in Finder: a plain click selects just that item, Cmd or Shift adds to or removes from the selection.
			setSelected((prev) => (isExtending ? (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]) : [name]))
		} else if (isMulti) {
			if (isFolder) return
			setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]))
		} else {
			setSelected((prev) => (prev.includes(name) ? [] : [name]))
		}
	}

	/** Names what the button takes: "Import 2 Files", "Import 3 Folders", "Import 5 Items" for a mix, or just the verb while nothing is picked. */
	const pickedFiles = selected.filter(isImageFile).length
	const pickedFolders = selected.length - pickedFiles
	const noun = (count: number, singular: string, plural: string) => (count === 1 ? `${CTA_VERB} ${singular}` : `${CTA_VERB} ${count} ${plural}`)
	const confirmLabel = !isMixed && !isMulti
		? `${CTA_VERB}${selected.length ? '' : ' this'} Folder`
		: !selected.length
			? CTA_VERB
			: !pickedFolders
				? noun(pickedFiles, 'File', 'Files')
				: !pickedFiles
					? noun(pickedFolders, 'Folder', 'Folders')
					: noun(selected.length, 'Item', 'Items')

	function handleOpen(picked: string[] = selected) {
		if (isMixed) completeFinder({ stack, picked: null, files: picked.filter(isImageFile), folders: picked.filter((name) => !isImageFile(name)) })
		else if (isMulti) completeFinder({ stack, picked: null, files: picked })
		else completeFinder({ stack, picked: picked[0] ?? null, files: [] })
	}

	function handleEntryDoubleClick(name: string, isFolder: boolean) {
		if (isFolder) return go([...stack, name])
		// A photo opens straight away, as it does in the system panel.
		if (isMixed) handleOpen([name])
	}

	return (
		<div
			onClick={closeFinder}
			style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: surface.overlay, zIndex: layer.finder }}
		>
			<div
				role="dialog"
				aria-label={isMixed ? 'Choose files or folders' : isMulti ? 'Choose files' : 'Choose a folder'}
				onClick={(e) => e.stopPropagation()}
				style={{ width: modalWidth.regular, height: DIALOG_HEIGHT, display: 'flex', flexDirection: 'column', background: surface.elevated, border: `${stroke[1]} solid ${edge.default}`, borderRadius: radius.xl, boxShadow: shadow.elevated, overflow: 'hidden' }}
			>
				<div style={{ display: 'flex', alignItems: 'center', gap: spacing[8], padding: `${spacing[8]} ${spacing[12]}`, borderBottom: `${stroke[1]} solid ${edge.default}` }}>
					<IconButton icon={CaretLeft} label="Back" hasTooltip={false} disabled={stack.length < 2} onClick={() => go(stack.slice(0, -1))} />
					<strong style={{ flex: 1, ...textStyle('label-13'), color: colors.type.secondary }}>{location}</strong>
					<span style={{ ...textStyle('body-12'), color: colors.type.disabled }}>Search</span>
				</div>

				<div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
					<nav style={{ width: SIDEBAR_WIDTH, display: 'flex', flexDirection: 'column', gap: spacing[2], padding: spacing[8], borderRight: `${stroke[1]} solid ${edge.default}`, overflowY: 'auto' }}>
						<span style={{ ...textStyle('subheading-11'), color: colors.type.muted, padding: `${spacing[6]} ${spacing[8]}` }}>Favorites</span>
						{FINDER_FAVORITES.map((name) => (
							<SidebarButton key={name} label={name} isActive={stack[0] === name} onClick={() => go([name])} />
						))}
						<span style={{ ...textStyle('subheading-11'), color: colors.type.muted, padding: `${spacing[12]} ${spacing[8]} ${spacing[6]}` }}>Locations</span>
						{FINDER_DRIVES.map((drive) => (
							<SidebarButton key={drive.name} label={drive.name} isRemovable={drive.isRemovable} isActive={stack[0] === drive.name} onClick={() => go([drive.name])} />
						))}
					</nav>

					<div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', padding: `${spacing[6]} ${spacing[12]}`, borderBottom: `${stroke[1]} solid ${edge.default}`, color: colors.type.muted, ...textStyle('label-11') }}>
							<span>Name</span>
							<span>Kind</span>
						</div>
						<div style={{ flex: 1, overflowY: 'auto', padding: spacing[4] }}>
							{entries.map((name) => {
								const isImage = isImageFile(name)
								const isDocument = isDocumentFile(name)
								const isFolder = !isImage && !isDocument
								// Documents are never pickable; photos only when the dialog is choosing files or both.
								const isDisabled = isDocument || (isImage && !isMulti && !isMixed)
								const isOn = selected.includes(name)
								const RowIcon = isImage ? ImageSquare : isDocument ? Image : FolderSimple
								return (
									<button
										key={name}
										type="button"
										disabled={isDisabled}
										onClick={(e) => handleEntryClick(name, isFolder, e.metaKey || e.ctrlKey || e.shiftKey)}
										onDoubleClick={() => handleEntryDoubleClick(name, isFolder)}
										style={{
											width: '100%',
											display: 'flex',
											alignItems: 'center',
											gap: spacing[8],
											padding: `${spacing[6]} ${spacing[8]}`,
											border: 'none',
											borderRadius: radius.sm,
											background: isOn ? surface.secondary : surface.clear,
											color: isDisabled ? colors.type.disabled : colors.type.secondary,
											textAlign: 'left',
											cursor: isDisabled ? 'default' : 'pointer',
											...textStyle('body-13'),
										}}
									>
										<RowIcon size={16} weight="fill" color={isFolder ? colors.type.accent : colors.type.muted} />
										<span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
										<small style={{ color: colors.type.muted }}>{isImage ? `${name.split('.').pop()} image` : isDocument ? 'Document' : 'Folder'}</small>
									</button>
								)
							})}
						</div>
					</div>
				</div>

				<div style={{ display: 'flex', alignItems: 'center', gap: spacing[8], padding: `${spacing[8]} ${spacing[12]}`, borderTop: `${stroke[1]} solid ${edge.default}` }}>
					<span style={{ flex: 1 }} />
					<Button variant="ghost" onClick={closeFinder}>
						Cancel
					</Button>
					<Button variant="primary" disabled={isMulti && selected.length === 0} onClick={() => handleOpen()}>
						{confirmLabel}
					</Button>
				</div>
			</div>
		</div>
	)
}


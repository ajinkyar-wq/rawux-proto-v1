import type { ReactNode } from 'react'
import { ChatCircleDots, Divider, DotsThree, House, IconButton, colors, hoverTransition, spacing, stroke, dimOpacity } from '../../ui-kit'
import { EditableAlbumName } from '../shared/EditableAlbumName'
import { useImportStore } from '../../store/useImportStore'

/** App bar for the import screens: home, the album's name, and an optional action on the right. */
export function ImportHeader({ action }: { action?: ReactNode }) {
	const albumName = useImportStore((s) => s.albumName)
	const addToAlbum = useImportStore((s) => s.addToAlbum)
	const setAlbumName = useImportStore((s) => s.setAlbumName)
	const isCopying = useImportStore((s) => s.copyProgress !== null)
	const leaveImport = useImportStore((s) => s.leaveImport)

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: spacing[8],
				padding: `${spacing[6]} ${spacing[12]}`,
				paddingLeft: spacing[8],
				background: colors.surface.panel,
				borderBottom: `${stroke[1]} solid ${colors.edge.default}`,
			}}
		>
			<IconButton icon={House} label="Home" hasTooltip={false} iconWeight="fill" onClick={leaveImport} />
			{/* While copying, everything but the way home is dimmed and blocked. */}
			<div inert={isCopying} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: spacing[8], opacity: isCopying ? dimOpacity.dimmed : 1, transition: hoverTransition }}>
				<Divider />
				<EditableAlbumName value={albumName} onChange={setAlbumName} isReadOnly={!!addToAlbum} />
				<span style={{ flex: 1 }} />
				<IconButton icon={ChatCircleDots} label="Chat" hasTooltip={false} />
				<IconButton icon={DotsThree} label="More" hasTooltip={false} />
				{action}
			</div>
		</div>
	)
}

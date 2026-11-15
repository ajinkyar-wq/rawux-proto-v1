import { Button, Checkbox, ArrowSquareOut, Divider, FolderSimple, HardDrive, HoverTooltip, SelectField, TextField, TextAa, TreeStructure, colors, hoverTransition, radius, spacing, surface, textStyle } from '../../ui-kit'
import type { Icon } from '../../ui-kit'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { DESTINATION_PATHS } from '../../data/mockImport'
import { RENAME_PATTERNS, normalizeRenameText, renameWidth, renameWith, splitPath, truncateMiddle } from '../../lib/importPhotos'
import { useCullStore } from '../../store/useCullStore'
import { useImportStore } from '../../store/useImportStore'
import type { ImportSource, OrganizeMode, RenamePattern } from '../../types'

const ORGANIZE_OPTIONS: OrganizeMode[] = ['Into One Folder', 'By Original Folders', 'By Date']
const LABEL_WIDTH = 132
const NUMBER_FIELD_WIDTH = 72

const RENAME_FIELDS: Record<RenamePattern, Array<'number' | 'text'>> = {
	'Number + Text': ['number', 'text'],
	'Text + Number': ['text', 'number'],
	'Date + Number': ['number'],
	'Original + Text': ['text'],
}

/** A small caption over a rename input, so it is clear what each one is for. */
function RenameField({ label, width, flex, children }: { label: string; width?: number; flex?: boolean; children: ReactNode }) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2], width, flex: flex ? 1 : undefined, minWidth: 0 }}>
			<span style={{ ...textStyle('body-11'), color: colors.type.muted }}>{label}</span>
			{children}
		</div>
	)
}

function SettingsRow({ label, children }: { label: ReactNode; children?: ReactNode }) {
	return (
		<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing[8], minHeight: 32 }}>
			<span style={{ minWidth: LABEL_WIDTH, ...textStyle('body-13'), color: colors.type.secondary }}>{label}</span>
			<div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}>{children}</div>
		</div>
	)
}

function PathField({ value, label, disabled, onChange }: { value: string; label: string; disabled?: boolean; onChange: (path: string) => void }) {
	const showToast = useCullStore((s) => s.showToast)

	return (
		<SelectField
			variant="underline"
			label={label}
			value={value}
			displayValue={truncateMiddle(value)}
			options={DESTINATION_PATHS}
			icon={FolderSimple}
			disabled={disabled}
			footerEntries={[{ key: 'choose', label: 'Choose Folder...', onSelect: () => showToast('Opens a system folder picker') }]}
			onChange={onChange}
		/>
	)
}

/** The copy settings form: where photos go, whether they are backed up, and how they are renamed. Shared by Option 1's side panel and Option 2's copy dialog. */
export function DestinationForm() {
	const destination = useImportStore((s) => s.destination)
	const update = useImportStore((s) => s.updateDestination)
	const first = useImportStore((s) => s.sources.find((source) => source.status === 'pending')?.photos[0])
	const width = renameWidth(destination.startNumber)
	const start = Number(destination.startNumber) || 1
	const text = normalizeRenameText(destination.renameText)
	const ext = first?.ext ?? 'NEF'
	/** What each pattern asks for, left to right as it reads in the file name; the date and the original name are filled in, not typed. */
	const fieldOrder = RENAME_FIELDS[destination.renamePattern]
	const example = (offset: number) => `${renameWith(destination.renamePattern, String(start + offset).padStart(width, '0'), text, first?.originalName ?? 'IMG00301')}.${ext}`

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: spacing[12] }}>
			<SettingsRow label="Working Directory">
				<PathField label="Working Directory" value={destination.workingDirectory} onChange={(workingDirectory) => update({ workingDirectory })} />
			</SettingsRow>
			<SettingsRow label="Organize">
				<SelectField variant="underline" label="Organize" value={destination.organize} options={ORGANIZE_OPTIONS} onChange={(organize) => update({ organize: organize as OrganizeMode })} />
			</SettingsRow>
			<SettingsRow label={<Checkbox label="Create Subfolder" checked={destination.createSubfolder} onChange={(createSubfolder) => update({ createSubfolder })} />}>
				{destination.createSubfolder && <TextField variant="underline" textStyleName="body-13" aria-label="Subfolder name" value={destination.subfolderName} onChange={(subfolderName) => update({ subfolderName })} />}
			</SettingsRow>

			{/* A very faint rule between the groups, so it doesn't compete with the fields' own underlines. */}
			<Divider orientation="horizontal" size="100%" color={colors.edge.transparent1} />

			<SettingsRow label={<Checkbox label="Create Backup" checked={destination.backupOn} onChange={(backupOn) => update({ backupOn })} />}>
				{destination.backupOn && <PathField label="Backup Directory" value={destination.backupDirectory} onChange={(backupDirectory) => update({ backupDirectory })} />}
			</SettingsRow>

			<Divider orientation="horizontal" size="100%" color={colors.edge.transparent1} />

			<SettingsRow label={<Checkbox label="Rename Photos" checked={destination.renameOn} onChange={(renameOn) => update({ renameOn })} />}>
				{destination.renameOn && <SelectField variant="underline" label="Rename pattern" value={destination.renamePattern} options={RENAME_PATTERNS} onChange={(renamePattern) => update({ renamePattern: renamePattern as RenamePattern })} />}
			</SettingsRow>
			{/* Everything that belongs to a switched-off option is hidden, not dimmed. */}
			{destination.renameOn && (
				<div style={{ display: 'flex', flexDirection: 'column', gap: spacing[8] }}>
					{/* Only the parts the chosen pattern uses are shown, in the order they appear in the file name. */}
					<div style={{ display: 'flex', gap: spacing[8] }}>
						{fieldOrder.map((field) =>
							field === 'number' ? (
								<RenameField key="number" label="Start at" width={NUMBER_FIELD_WIDTH}>
									<TextField
										variant="underline"
										textStyleName="body-13"
										aria-label="Start number"
										inputMode="numeric"
										width={NUMBER_FIELD_WIDTH}
										value={destination.startNumber}
										placeholder="001"
										onChange={(value) => update({ startNumber: value.replace(/\D/g, '').slice(0, 6) })}
									/>
								</RenameField>
							) : (
								<RenameField key="text" label="Text" flex>
									<TextField
										variant="underline"
										textStyleName="body-13"
										aria-label="Text to add"
										value={destination.renameText}
										placeholder="e.g. Mara-Wedding"
										onChange={(renameText) => update({ renameText })}
									/>
								</RenameField>
							),
						)}
					</div>
					<span style={{ ...textStyle('body-12'), color: colors.type.muted }}>
						Ex: {example(0)}
						{destination.renamePattern !== 'Original + Text' && `, ${example(1)}`}
					</span>
				</div>
			)}
		</div>
	)
}

interface SummaryItemProps {
	icon: Icon
	label: string
	value: string
	detail?: string
	/** Reveals this location in the system file browser. */
	onReveal?: () => void
}


/** The path line of a directory: the whole row reveals the folder, so on hover the path underlines and lights up with the icon. */
function RevealPath({ path, onReveal }: { path: string; onReveal: () => void }) {
	const [isHovered, setIsHovered] = useState(false)
	const color = isHovered ? colors.type.secondary : colors.type.muted

	return (
		<button
			type="button"
			aria-label={`View ${path} in Finder`}
			onClick={onReveal}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing[8], padding: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', color, transition: hoverTransition }}
		>
			<span style={{ ...textStyle('body-12'), minWidth: 0, overflowWrap: 'anywhere', textDecoration: isHovered ? 'underline' : 'none' }}>{path}</span>
			<ArrowSquareOut size={16} style={{ flexShrink: 0 }} />
		</button>
	)
}

/** One setting in the summary card: a small caps label over an icon, the value in full strength and, where there is one, a quieter line beneath. */
function SummaryItem({ icon: IconComponent, label, value, detail, onReveal }: SummaryItemProps) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: spacing[6] }}>
			{/* Lines up with the text beside the icon: the icon's 16px plus the 12px gap. */}
			<span style={{ paddingLeft: spacing[28], ...textStyle('subheading-10'), color: colors.type.disabled }}>{label}</span>
			<div style={{ display: 'flex', alignItems: 'center', gap: spacing[12] }}>
				<IconComponent size={16} color={colors.type.muted} style={{ flexShrink: 0 }} />
				<div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: spacing[2], minWidth: 0 }}>
					{/* Both lines wrap rather than shorten: the card has the room, and a path cut in the middle can't be checked. */}
					<span style={{ ...textStyle('body-14'), color: colors.type.secondary, overflowWrap: 'anywhere' }}>{value}</span>
					{detail && (onReveal ? <RevealPath path={detail} onReveal={onReveal} /> : <span style={{ ...textStyle('body-12'), color: colors.type.muted, overflowWrap: 'anywhere' }}>{detail}</span>)}
				</div>
			</div>
		</div>
	)
}

/** What the latest copy was made with. A Change button appears while there are new photos the same settings would apply to. */
export function DestinationSummary({ copiedSources, pendingCount, onChange }: { copiedSources: ImportSource[]; pendingCount: number; onChange: () => void }) {
	const showToast = useCullStore((s) => s.showToast)
	// Only the settings of the latest copy: they are what the next one starts from, and the older ones are history.
	const last = copiedSources.findLast((source) => source.copySettings)?.copySettings

	return (
		<div style={{ display: 'flex', flexDirection: 'column', background: surface.elevated, borderRadius: radius.lg, overflow: 'hidden' }}>
			<div style={{ display: 'flex', flexDirection: 'column', gap: spacing[12], padding: `${spacing[16]} ${spacing[20]}` }}>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing[20], paddingBottom: spacing[4] }}>
					<span style={{ ...textStyle('heading-14'), color: colors.type.primary }}>Last Used Settings</span>
					{/* Always there, so the card keeps its shape; it only works while there are new photos these settings would apply to. */}
					<HoverTooltip message={pendingCount > 0 ? undefined : 'Add a source to change Ingest Settings'} size="compact" placement="top">
						<Button variant="secondary" size="xs" disabled={pendingCount === 0} onClick={onChange}>
							Change
						</Button>
					</HoverTooltip>
				</div>

				{last && (
					<>
						<SummaryItem icon={FolderSimple} label="Working Directory" value={splitPath(last.destination).leaf} detail={splitPath(last.destination).parent} onReveal={() => showToast('Opens the working directory in Finder')} />
						<Divider orientation="horizontal" size="100%" />
						<SummaryItem icon={TreeStructure} label="Organize" value={last.organize} />
						{/* In the same order as the settings form: directory, organize, backup, rename. */}
						{/* No backup was made, so there is nothing to say about one. */}
						{last.backup && (
							<>
								<Divider orientation="horizontal" size="100%" />
								<SummaryItem icon={HardDrive} label="Backup Directory" value={splitPath(last.backup).leaf} detail={splitPath(last.backup).parent} onReveal={() => showToast('Opens the backup directory in Finder')} />
							</>
						)}
						<Divider orientation="horizontal" size="100%" />
						<SummaryItem icon={TextAa} label="Rename Photos" value={last.isRenamed ? last.renamePattern : 'Original file names'} />
					</>
				)}
			</div>
		</div>
	)
}

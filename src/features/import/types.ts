// Simplified stand-in for the real app's `IImage` (common/Interfaces/Image/index.ts)
// and `Bucket` enum (common/Enums/Cull/index.ts). Trimmed to what the Cull grid
// screen actually renders — no EXIF/metadata fields.

export type ColorLabel = 'green' | 'blue' | 'yellow' | 'red' | 'purple' | 'none'

export type Bucket = 'mySelection' | 'duplicate' | 'warning' | 'edited' | 'retouched'

export type Orientation = 'landscape' | 'portrait'

export interface Photo {
	id: string
	name: string
	thumbnailUrl: string
	rating: number // 0-5
	label: ColorLabel
	buckets: Bucket[]
	duplicateCount: number
	/** Shared by every photo in the same near-duplicate set; undefined if it has no duplicates. */
	duplicateGroupId?: string
	fileType: 'RAW' | 'JPEG'
	orientation: Orientation
	hasWarning: boolean
	hasFace: boolean
	camera: string
	lens: string
	lensSerial: string
	photographer: string
}

export type AlbumAction = 'cull' | 'edit' | 'import'

/** One album tile on the Home screen. */
export interface Album {
	id: string
	name: string
	photoCount: number
	/** Null for an empty album, which shows an "Add Photos" placeholder instead of a cover. */
	coverUrl: string | null
	/** What the tile's primary button does: continue culling, jump to editing, or import photos into an empty album. */
	action: AlbumAction
	/** An import that was left part way: opening the tile goes back to the import step it stopped at, not into the album. */
	isUnfinished?: boolean
}

// ---- Import flow ----

export type ImportFileType = 'raw' | 'jpg'
export type SourceKind = 'card' | 'external' | 'internal'
export type SourceStatus = 'pending' | 'copied' | 'inplace'
export type OrganizeMode = 'Into One Folder' | 'By Original Folders' | 'By Date'
export type RenamePattern = 'Number + Text' | 'Text + Number' | 'Date + Number' | 'Original + Text'

export interface ImportPhoto {
	id: string
	/** Shown in the grid; replaced by the renamed value once the photo is copied with renaming on. */
	name: string
	originalName: string
	ext: string
	type: ImportFileType
	sourceId: string
	/** Where it sits under the source's root folder: empty for the root itself, "100NIKON" or "Old Shoot/Test" for a subfolder. */
	folder: string
	isInSubfolder: boolean
	isPortrait: boolean
	thumbnailUrl: string
	sizeMb: number
	/** YYYY-MM-DD, used by Group By Capture Date. */
	captureDay: string
}

/** What a source was copied with, shown back to the user in the Destination summary. */
export interface CopySettings {
	destination: string
	backup: string
	organize: OrganizeMode
	isRenamed: boolean
	renamePattern: RenamePattern
	firstNumber: number
	lastNumber: number
}

export interface ImportSource {
	id: string
	name: string
	kind: SourceKind
	path: string
	photos: ImportPhoto[]
	includeSubfolders: boolean
	/** Made of photos picked one by one rather than a folder; `path` is the folder they were picked from. */
	isFileSelection?: boolean
	/** Option 2's copy dialog lets a pending source be switched off without removing it. */
	isEnabled: boolean
	status: SourceStatus
	copySettings?: CopySettings
}

export interface DestinationSettings {
	workingDirectory: string
	organize: OrganizeMode
	createSubfolder: boolean
	subfolderName: string
	backupOn: boolean
	backupDirectory: string
	renameOn: boolean
	renamePattern: RenamePattern
	/** Kept as text so leading zeros survive ("001"). */
	startNumber: string
	renameText: string
}

export type AlbumMode = 'Cull' | 'Edit' | 'Retouch' | 'One Click'

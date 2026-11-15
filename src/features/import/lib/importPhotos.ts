import type { DestinationSettings, ImportPhoto, ImportSource, RenamePattern } from '../types'

export type GroupBy = 'none' | 'source' | 'date'

export type SortBy = 'time' | 'name'

export interface SortOrder {
	by: SortBy
	/** Oldest first for capture time, A to Z for file name. */
	isAscending: boolean
}

export interface FileTypeFilter {
	raw: boolean
	jpg: boolean
}

/** Photos of a source that currently count, i.e. not hidden by the source's "include subfolders" switch. */
export function getSourcePhotos(source: ImportSource, fileTypes: FileTypeFilter): ImportPhoto[] {
	return source.photos.filter((photo) => fileTypes[photo.type] && (source.includeSubfolders || !photo.isInSubfolder))
}

/** What copying a source brings over when every file type is taken: the photos not hidden by an unchecked folder or by the source's own "include subfolders" switch. */
export function getPhotosToIngest(source: ImportSource, hiddenIds: Set<string>): ImportPhoto[] {
	return source.photos.filter((photo) => !hiddenIds.has(photo.id) && (source.includeSubfolders || !photo.isInSubfolder))
}

/** Photos from the given sources, filtered by file type and put in the chosen order (then by capture day when grouping by date). Capture time follows the order the camera wrote the files in, day by day. */
export function getVisiblePhotos(sources: ImportSource[], fileTypes: FileTypeFilter, sort: SortOrder, groupBy: GroupBy): ImportPhoto[] {
	const direction = sort.isAscending ? 1 : -1
	const indexed = sources.flatMap((source) => getSourcePhotos(source, fileTypes)).map((photo, index) => ({ photo, index }))
	const byName = (a: ImportPhoto, b: ImportPhoto) => (a.name === b.name ? (a.ext < b.ext ? -1 : 1) : a.name < b.name ? -1 : 1)
	const byDay = (a: ImportPhoto, b: ImportPhoto) => (a.captureDay < b.captureDay ? -1 : a.captureDay > b.captureDay ? 1 : 0)
	indexed.sort((a, b) => direction * (sort.by === 'name' ? byName(a.photo, b.photo) : byDay(a.photo, b.photo) || a.index - b.index))
	const photos = indexed.map((entry) => entry.photo)
	if (groupBy === 'date') photos.sort((a, b) => byDay(a, b) * direction)
	return photos
}

export function formatGroupLabel(key: string): string {
	return new Date(`${key}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatSize(megabytes: number): string {
	return megabytes >= 1000 ? `${(megabytes / 1000).toFixed(1)} GB` : `${megabytes} MB`
}

/** Shortens a long path by keeping its start and end, e.g. `/Volumes/Photo...2026 Weddings`. */
export function truncateMiddle(text: string, maxLength = 22): string {
	if (text.length <= maxLength) return text
	return `${text.slice(0, Math.ceil(maxLength * 0.5))}...${text.slice(-Math.floor(maxLength * 0.38))}`
}

export const RENAME_PATTERNS: RenamePattern[] = ['Number + Text', 'Text + Number', 'Date + Number', 'Original + Text']

const CAPTURE_DATE_TOKEN = '20261003'

/** One renamed file name (without extension). Empty parts are left out rather than leaving a stray separator. */
export function renameWith(pattern: RenamePattern, number: string, text: string, original: string): string {
	const parts: Record<RenamePattern, string[]> = {
		'Number + Text': [number, text],
		'Text + Number': [text, number],
		'Date + Number': [CAPTURE_DATE_TOKEN, number],
		'Original + Text': [original, text],
	}
	return parts[pattern].filter(Boolean).join('_')
}

/** Width (digits) the rename number is padded to: at least 3, or as many as the user typed. */
export function renameWidth(startNumber: string): number {
	return Math.max(3, startNumber.length)
}

export function normalizeRenameText(text: string): string {
	return text.trim().replace(/\s+/g, '-')
}

/** Folder a copy lands in: the working directory plus the subfolder name when that option is on. */
export function destinationPath(settings: DestinationSettings): string {
	const subfolder = settings.subfolderName.trim()
	return settings.workingDirectory + (settings.createSubfolder && subfolder ? `/${subfolder}` : '')
}

export function splitPath(path: string): { leaf: string; parent: string } {
	const index = path.lastIndexOf('/')
	return { leaf: path.slice(index + 1), parent: path.slice(0, index).replace(/^\/Volumes\//, '') }
}

export interface FolderNode {
	/** Path under the source's root, e.g. "Old Shoot/Test"; empty for the root. */
	path: string
	name: string
	/** Every photo in this folder and below it. */
	photos: ImportPhoto[]
	children: FolderNode[]
}

/** Builds the folder tree of a source from where its photos sit. `rootName` labels the root, which holds everything. */
export function buildFolderTree(photos: ImportPhoto[], rootName: string): FolderNode {
	const root: FolderNode = { path: '', name: rootName, photos, children: [] }
	const byPath = new Map<string, FolderNode>([['', root]])
	photos.forEach((photo) => {
		if (!photo.folder) return
		const segments = photo.folder.split('/')
		segments.forEach((segment, index) => {
			const path = segments.slice(0, index + 1).join('/')
			if (!byPath.has(path)) {
				const node: FolderNode = { path, name: segment, photos: [], children: [] }
				byPath.set(path, node)
				byPath.get(segments.slice(0, index).join('/'))?.children.push(node)
			}
			byPath.get(path)?.photos.push(photo)
		})
	})
	byPath.forEach((node) => node.children.sort((a, b) => a.name.localeCompare(b.name)))
	return root
}

/** The mock photos carry no camera rating, so this is derived from the id to stay stable between renders. */
function idHash(photo: ImportPhoto): number {
	return [...photo.id].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7)
}

export function isRatedInCamera(photo: ImportPhoto): boolean {
	return idHash(photo) % 4 === 0
}

/** "12 Sep, 2:14 PM" for the list view. Only the day is known, so the time is a stable stand-in. */
export function formatCaptureTime(photo: ImportPhoto): string {
	const hash = idHash(photo)
	const date = new Date(`${photo.captureDay}T12:00:00`)
	const day = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
	const hour = 9 + (hash % 9)
	const minute = String(hash % 60).padStart(2, '0')
	return `${day}, ${hour > 12 ? hour - 12 : hour}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`
}

import type { ImportPhoto, ImportSource, SourceKind } from '../types'

/** Folders offered in the mock Finder dialog, by location. Anything not listed gets generated photo files. */
export const FINDER_LISTINGS: Record<string, string[]> = {
	Pictures: ['Client Preview', 'Aftershoot', 'Exports', '2025 Archive', 'Screenshots'],
	Desktop: ['Moodboard', 'Invoices', 'Shot list.pdf'],
	Documents: ['Contracts', 'Questionnaires', 'Pricing 2026.pdf'],
	Downloads: ['Harper Family Proofs', 'Lightroom Presets', 'Song list.txt'],
	'NIKON D7200': ['DCIM', 'MISC'],
	'CANON 720D': ['DCIM', 'MISC'],
	SANDISK: ['DCIM', 'MISC'],
	'Photo SSD': ['2026 Weddings', '2026 Portraits', 'Catalogs'],
	'Macintosh HD': ['Applications', 'Library', 'Users'],
	// Nested folders, down a few levels. Some hold photos beside their subfolders, as real shoots often do.
	'Client Preview': ['Edited', 'Old Shoot', 'Selects', 'CLI_0001.JPG', 'CLI_0002.JPG'],
	Aftershoot: ['2026', 'Previews', 'Presets'],
	'2026': ['Eric & Mara Wedding', 'Harper Family', 'Studio Portraits'],
	'Eric & Mara Wedding': ['Ceremony', 'Reception', 'Portraits', 'Details'],
	Ceremony: ['Processional', 'Vows', 'Recessional'],
	Exports: ['Web', 'Print', 'Social', 'EXP_0001.JPG', 'EXP_0002.JPG'],
	'2025 Archive': ['Q1', 'Q2', 'Q3', 'Q4'],
	Q1: ['January', 'February', 'March'],
	'2026 Weddings': ['Eric & Mara Wedding', 'Priya & Sam', 'Lena & Jonas'],
	'2026 Portraits': ['Studio', 'On Location'],
	'Harper Family Proofs': ['Day 1', 'Day 2', 'Selects'],
	DCIM: ['100NIKON', '101NIKON'],
}

export const FINDER_FAVORITES = ['Desktop', 'Documents', 'Downloads', 'Pictures']
export const FINDER_DRIVES = [
	{ name: 'Macintosh HD', isRemovable: false },
	{ name: 'NIKON D7200', isRemovable: true },
	{ name: 'CANON 720D', isRemovable: true },
	{ name: 'SANDISK', isRemovable: true },
	{ name: 'Photo SSD', isRemovable: true },
]

/** Where each top-level Finder location lives on disk, so a picked folder gets a believable path. */
const LOCATION_ROOTS: Record<string, string> = {
	Pictures: '~/',
	Desktop: '~/',
	Documents: '~/',
	Downloads: '~/',
	'Photo SSD': '/Volumes/',
	'Macintosh HD': '/',
	'NIKON D7200': '/Volumes/',
	'CANON 720D': '/Volumes/',
	SANDISK: '/Volumes/',
}

export const CARD_NAME = 'NIKON D7200'

export const DESTINATION_PATHS = ['~/Pictures/Client Preview', '~/Pictures/Aftershoot', '/Volumes/Photo SSD/2026 Weddings', '/Volumes/Backup HDD/Weddings']

const IMAGE_EXTENSION = /\.(jpe?g|nef|cr3|arw|tiff?)$/i
export const isImageFile = (name: string) => IMAGE_EXTENSION.test(name)
export const isDocumentFile = (name: string) => /\.\w+$/.test(name) && !isImageFile(name)

/** Small deterministic generator so every reload shows the same mock cards and folders. */
function seededRandom(seed: number) {
	let state = seed | 0
	return () => {
		state = (state + 0x6d2b79f5) | 0
		let t = Math.imul(state ^ (state >>> 15), 1 | state)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

let sourceCounter = 0
const CARD_MODELS = [
	{ name: 'Nikon D7200', raw: 'NEF', frames: 60 },
	{ name: 'Canon 720D', raw: 'CR2', frames: 30 },
	{ name: 'Sony A7 IV', raw: 'ARW', frames: 40 },
	{ name: 'Fujifilm X-T5', raw: 'RAF', frames: 36 },
]
/** Which subfolder each photo of a mock folder lands in, in turn: the root, then a few subfolders including a nested one. */
const FOLDER_SHAPE = ['', '', 'Selects', 'Old Shoot', 'Old Shoot/Test', 'Edited']
const CAPTURE_DAYS = ['2026-10-03', '2026-10-04', '2026-10-05']

function makePhoto(sourceId: string, seed: number, fields: Pick<ImportPhoto, 'name' | 'ext' | 'type' | 'folder' | 'isInSubfolder' | 'captureDay'>, isPortrait: boolean): ImportPhoto {
	const raw = fields.type === 'raw'
	return {
		...fields,
		id: `${sourceId}/${fields.name}.${fields.ext}`,
		originalName: fields.name,
		sourceId,
		isPortrait,
		thumbnailUrl: `https://picsum.photos/seed/import-${seed}/${isPortrait ? '240/360' : '360/240'}`,
		sizeMb: (raw ? 24 : 9) + (seed % 9),
	}
}

/** The memory cards the mock "has plugged in": the first three camera models, by card index. */
export const CONNECTED_CARDS = CARD_MODELS.slice(0, 3).map((model, index) => ({
	index,
	name: model.name,
	/** Each frame is a RAW, and two out of three also have a JPEG. */
	photoCount: Array.from({ length: model.frames }, (_, i) => (i % 3 !== 2 ? 2 : 1)).reduce((sum, n) => sum + n, 0),
}))

/** A memory card: each frame is a RAW, and two out of three also have a JPEG, split across two DCIM folders. */
export function buildCardSource(cardIndex: number): ImportSource {
	const model = CARD_MODELS[cardIndex % CARD_MODELS.length]
	const id = `source-${++sourceCounter}`
	const random = seededRandom(cardIndex * 41 + 7)
	const folderBase = 100 + cardIndex * 2
	const folders = [`${folderBase}NIKON`, `${folderBase + 1}NIKON`]
	const photos: ImportPhoto[] = []
	for (let i = 0; i < model.frames; i++) {
		const number = 301 + cardIndex * 120 + i
		const name = `IMG0${String(number).padStart(4, '0')}`
		const isSecondFolder = i >= model.frames * 0.6
		const base = { name, folder: isSecondFolder ? folders[1] : folders[0], isInSubfolder: isSecondFolder, captureDay: CAPTURE_DAYS[isSecondFolder ? 1 : 0] }
		const isPortrait = random() < 0.4
		photos.push(makePhoto(id, number, { ...base, ext: model.raw, type: 'raw' }, isPortrait))
		if (i % 3 !== 2) photos.push(makePhoto(id, number, { ...base, ext: 'JPG', type: 'jpg' }, isPortrait))
	}
	return { id, name: model.name, kind: 'card', path: `/Volumes/${model.name.toUpperCase()}`, photos, includeSubfolders: true, isEnabled: true, status: 'pending' }
}

/** A folder of mixed RAW and JPEG files, sized by the folder name so different folders feel different. */
export function buildFolderSource(name: string, path: string, kind: SourceKind): ImportSource {
	const id = `source-${++sourceCounter}`
	const random = seededRandom(name.length * 97 + sourceCounter)
	const count = 14 + Math.floor(random() * 26)
	const prefix = (name.replace(/[^A-Za-z]/g, '').slice(0, 3) || 'IMG').toUpperCase()
	const photos: ImportPhoto[] = Array.from({ length: count }, (_, i) => {
		const isRaw = random() < 0.55
		const folder = FOLDER_SHAPE[i % FOLDER_SHAPE.length]
		const base = { name: `${prefix}_${String(i + 1).padStart(4, '0')}`, folder, isInSubfolder: folder !== '', captureDay: CAPTURE_DAYS[folder === '' ? 0 : 1] }
		return makePhoto(id, sourceCounter * 500 + i, { ...base, ext: isRaw ? 'CR3' : 'JPG', type: isRaw ? 'raw' : 'jpg' }, random() < 0.45)
	})
	return { id, name, kind, path, photos, includeSubfolders: true, isEnabled: true, status: 'pending' }
}

/** A hand-picked set of files, which has no subfolders. */
export function buildFileSource(fileNames: string[], label: string, path: string, kind: SourceKind): ImportSource {
	const id = `source-${++sourceCounter}`
	const random = seededRandom(sourceCounter * 131)
	const photos: ImportPhoto[] = fileNames.map((fileName, i) => {
		const ext = (fileName.split('.').pop() || 'JPG').toUpperCase()
		const isRaw = !/^(JPE?G|TIFF?)$/.test(ext)
		return makePhoto(id, sourceCounter * 500 + i, { name: fileName.replace(/\.\w+$/, ''), ext, type: isRaw ? 'raw' : 'jpg', folder: '', isInSubfolder: false, captureDay: CAPTURE_DAYS[0] }, random() < 0.45)
	})
	return { id, name: label, kind, path, photos, includeSubfolders: true, isEnabled: true, status: 'pending', isFileSelection: true }
}

/** Contents of a Finder location: its known folders, or generated photo files for an unknown folder. */
export function listFinderLocation(location: string): string[] {
	const known = FINDER_LISTINGS[location]
	if (known) return known
	const random = seededRandom(location.length * 31 + location.charCodeAt(0))
	const prefix = (location.replace(/[^A-Za-z]/g, '').slice(0, 3) || 'IMG').toUpperCase()
	const count = 10 + Math.floor(random() * 10)
	return Array.from({ length: count }, (_, i) => `${prefix}_${String(i + 1).padStart(4, '0')}.${random() < 0.5 ? 'NEF' : 'JPG'}`)
}

/** Turns a Finder breadcrumb into a path like `/Volumes/Photo SSD/2026 Weddings`. */
export function finderPath(stack: string[]): string {
	const root = LOCATION_ROOTS[stack[0]] ?? '/'
	return (root + stack.filter((part) => part !== 'Macintosh HD').join('/')).replace(/\/$/, '')
}

export const isRemovablePath = (path: string) => path.startsWith('/Volumes/')

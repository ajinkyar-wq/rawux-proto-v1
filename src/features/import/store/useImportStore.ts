import { create } from 'zustand'
import { formatCount } from '../lib/plural'
import { buildCardSource, buildFileSource, buildFolderSource, CARD_NAME, DESTINATION_PATHS, finderPath, isRemovablePath } from '../data/mockImport'
import { destinationPath, getSourcePhotos, normalizeRenameText, renameWidth, renameWith, getPhotosToIngest } from '../lib/importPhotos'
import type { FileTypeFilter, GroupBy, SortBy } from '../lib/importPhotos'
import type { AlbumMode, DestinationSettings, ImportFileType, ImportPhoto, ImportSource } from '../types'
import { useCullStore } from './useCullStore'
import type { AppScreen, AppSection } from './useCullStore'

// The import flow keeps its own store, apart from useCullStore: it holds a whole in-progress session
// (sources, selection, destination settings, copy progress) that is thrown away once an album exists.

/** 'import' and 'add' take any mix of folders and photos, like the macOS open panel; the rest take one kind. */
export type FinderPurpose = 'import' | 'add' | 'importFolder' | 'importFiles' | 'copyFolder' | 'copyFiles' | 'addFolder' | 'addFiles'

export interface FinderRequest {
	purpose: FinderPurpose
	/** Set when the photos are going into an album that already exists. */
	addTo: string | null
}

export interface FinderResult {
	/** Breadcrumb of the location being viewed, starting at a sidebar location. */
	stack: string[]
	/** The folder the user selected inside that location, or null to use the location itself. */
	picked: string | null
	files: string[]
	/** Folders selected inside the location, for the purposes that take both folders and photos. With nothing selected, the location itself is used. */
	folders?: string[]
}

export interface CopyProgress {
	done: number
	total: number
	sourceNames: string
}

interface CreateAlbumRequest {
	photoCount: number
	coverUrl: string | null
}

const COPY_TICK_MS = 60
const COPY_FINISH_DELAY_MS = 350
/** Roughly how many progress ticks a copy takes, regardless of how many photos it has. */
const COPY_TICKS = 45

const DEFAULT_DESTINATION: DestinationSettings = {
	workingDirectory: DESTINATION_PATHS[0],
	organize: 'By Original Folders',
	createSubfolder: true,
	subfolderName: 'Eric & Mara Wedding',
	backupOn: true,
	backupDirectory: DESTINATION_PATHS[0],
	renameOn: true,
	renamePattern: 'Number + Text',
	startNumber: '001',
	renameText: '',
}

const MODE_TO_SECTION: Record<AlbumMode, AppSection> = { Cull: 'cull', Edit: 'edit', Retouch: 'retouch', 'One Click': 'cull' }

/** Everything an import needs to carry on from where it was left. */
type SavedImport = Pick<ImportState, 'sources' | 'selectedIds' | 'hiddenIds' | 'fileTypes' | 'sortBy' | 'isSortAscending' | 'groupBy' | 'isInPlace' | 'isEditingDestination' | 'collapsedKeys' | 'destination' | 'albumName'>

interface ImportState {
	isNewAlbumOpen: boolean
	finder: FinderRequest | null
	isIngestOpen: boolean
	createAlbum: CreateAlbumRequest | null
	/** Imports left part way, by the id of the album tile that stands for each, so opening a tile can go back to where it stopped. */
	savedImports: Record<string, SavedImport>

	albumName: string
	/** Name of the existing album photos are being added to, or null when creating a new one. */
	addToAlbum: string | null
	sources: ImportSource[]
	selectedIds: Set<string>
	/** Photos of folders unchecked in the Source panel: left out of the grid, and never selected. */
	hiddenIds: Set<string>
	fileTypes: FileTypeFilter
	sortBy: SortBy
	isSortAscending: boolean
	groupBy: GroupBy
	/** Option 1: photos stay where they are instead of being copied. */
	isInPlace: boolean
	destination: DestinationSettings
	isEditingDestination: boolean
	/** Whether the images may be shared to help improve Aftershoot. Chosen in the footer, and kept across sessions rather than reset with one. */
	isSharingImages: boolean
	copyProgress: CopyProgress | null
	collapsedKeys: Record<string, boolean>
	/** Option 3: photos as rows or as thumbnails. */
	viewMode: 'list' | 'grid'

	setViewMode: (mode: 'list' | 'grid') => void
	openNewAlbum: (addTo?: string | null) => void
	closeNewAlbum: () => void
	setAlbumName: (name: string) => void
	openFinder: (purpose: FinderPurpose, addTo?: string | null) => void
	closeFinder: () => void
	completeFinder: (result: FinderResult) => void
	startCopyFromCard: (addTo?: string | null) => void
	/** Brings in several memory cards at once, each as its own source in one import. */
	startCopyFromCards: (cardIndexes: number[]) => void
	addCardSource: (cardIndex: number, label: string) => void

	toggleFileType: (type: ImportFileType) => void
	setSortBy: (sortBy: SortBy) => void
	setSortAscending: (isAscending: boolean) => void
	setGroupBy: (groupBy: GroupBy) => void
	togglePhoto: (id: string) => void
	setPhotosSelected: (ids: string[], isSelected: boolean) => void
	setPhotosHidden: (ids: string[], isHidden: boolean) => void
	toggleSourceEnabled: (id: string) => void
	setIncludeSubfolders: (id: string, include: boolean) => void
	removeSource: (id: string) => void
	updateDestination: (patch: Partial<DestinationSettings>) => void
	setEditingDestination: (isEditing: boolean) => void
	setSharingImages: (isSharing: boolean) => void
	toggleCollapsed: (key: string) => void

	/** Option 1: copies the selected photos and keeps the screen open for another card or folder. */
	copyAndAddMore: () => void
	/** Option 1: copies the selected photos (or keeps them in place), then asks what to do with the new album. */
	copyAndCreateAlbum: () => void
	/** Option 2: copies every pending source in the dialog, then continues. */
	copyPendingSources: (onDone?: () => void) => void
	openPreview: () => void
	cancelCopy: () => void
	resumeImport: () => void
	closeIngest: () => void
	openIngest: () => void
	openCreateAlbum: () => void
	/** Opens an unfinished import from its tile on Home, at the step it was left on. */
	openSavedImport: (albumId: string) => void
	/** Leaves the import screens for Home. Whatever the import holds stays there as an album that opens back into it. */
	leaveImport: () => void
	closeCreateAlbum: () => void
	confirmCreateAlbum: (options: { genre: string; mode: AlbumMode }) => void
}

let copyTimer: ReturnType<typeof setInterval> | undefined
let copyFinishTimer: ReturnType<typeof setTimeout> | undefined

function removeSession(): Pick<ImportState, 'sources' | 'selectedIds' | 'hiddenIds' | 'fileTypes' | 'sortBy' | 'isSortAscending' | 'groupBy' | 'isInPlace' | 'isEditingDestination' | 'copyProgress' | 'collapsedKeys'> {
	return { sources: [], selectedIds: new Set(), hiddenIds: new Set(), fileTypes: { raw: true, jpg: true }, sortBy: 'time', isSortAscending: true, groupBy: 'source', isInPlace: false, isEditingDestination: false, copyProgress: null, collapsedKeys: {} }
}

/** Photos that will be copied: the selected ones among the sources still to copy. Unselected photos are not copied and drop out of the grid. */
export function getPhotosToCopy(state: Pick<ImportState, 'sources' | 'selectedIds' | 'fileTypes'>): ImportPhoto[] {
	return state.sources.filter((source) => source.status === 'pending').flatMap((source) => getSourcePhotos(source, state.fileTypes)).filter((photo) => state.selectedIds.has(photo.id))
}

/** Photos the user would get in an album right now. */
export function getAlbumPhotos(state: Pick<ImportState, 'sources' | 'selectedIds' | 'fileTypes' | 'isInPlace'>): ImportPhoto[] {
	const option = useCullStore.getState().designOption
	const finished = state.sources.filter((source) => source.status !== 'pending')
	if (option === 2) return finished.flatMap((source) => getSourcePhotos(source, state.fileTypes)).filter((photo) => state.selectedIds.has(photo.id))
	// Copied photos stay selectable after the copy: what was ingested can differ from what ends up in the album.
	const copied = finished.flatMap((source) => getSourcePhotos(source, state.fileTypes)).filter((photo) => state.selectedIds.has(photo.id))
	if (!state.isInPlace) return copied
	const pending = state.sources.filter((source) => source.status === 'pending').flatMap((source) => getSourcePhotos(source, state.fileTypes))
	return [...copied, ...pending.filter((photo) => state.selectedIds.has(photo.id))]
}

export const useImportStore = create<ImportState>((set, get) => {
	const showToast = (message: string) => useCullStore.getState().showToast(message)
	const setScreen = (screen: AppScreen) => useCullStore.getState().setScreen(screen)

	/** Starts a fresh session holding exactly these sources, all selected. */
	function beginSession(sources: ImportSource[], options: { isInPlace: boolean; addTo: string | null }) {
		const ids = new Set(sources.flatMap((source) => source.photos.map((photo) => photo.id)))
		set((s) => ({
			...removeSession(),
			sources,
			selectedIds: ids,
			isInPlace: options.isInPlace,
			addToAlbum: options.addTo,
			albumName: options.addTo ?? (s.albumName.trim() || 'Untitled Album'),
			destination: { ...s.destination, startNumber: '001' },
			isNewAlbumOpen: false,
		}))
	}

	function addSource(source: ImportSource) {
		set((s) => ({ sources: [...s.sources, source], selectedIds: new Set([...s.selectedIds, ...source.photos.map((p) => p.id)]) }))
	}

	/** A source added to a running session: used in place when the session started that way, otherwise it waits in the Ingest dialog (Option 2) or on the screen (Option 1). */
	function addToSession(source: ImportSource) {
		const isInPlace = get().isInPlace
		addSource(isInPlace && useCullStore.getState().designOption === 2 ? { ...source, status: 'inplace' } : source)
		if (!isInPlace && useCullStore.getState().designOption === 2) set({ isIngestOpen: true })
	}

	function runCopy(total: number, sourceNames: string, onDone: () => void) {
		clearInterval(copyTimer)
		let done = 0
		set({ copyProgress: { done: 0, total, sourceNames } })
		copyTimer = setInterval(() => {
			done = Math.min(total, done + Math.max(1, Math.round(total / COPY_TICKS)))
			set({ copyProgress: { done, total, sourceNames } })
			if (done >= total) {
				clearInterval(copyTimer)
				copyFinishTimer = setTimeout(() => {
					set({ copyProgress: null })
					onDone()
				}, COPY_FINISH_DELAY_MS)
			}
		}, COPY_TICK_MS)
	}

	/** Marks the given pending sources as copied, keeping only `keep(photo)` photos and renaming them in order. */
	function markCopied(sourceIds: string[], keep: (photo: ImportPhoto) => boolean) {
		const { destination, sources } = get()
		const width = renameWidth(destination.startNumber)
		let next = Number(destination.startNumber) || 1
		const text = normalizeRenameText(destination.renameText)
		const updated: ImportSource[] = []
		sources.forEach((source) => {
			if (source.status !== 'pending' || !sourceIds.includes(source.id)) {
				updated.push(source)
				return
			}
			const kept = source.photos.filter(keep)
			if (!kept.length) return
			const first = next
			const photos = kept.map((photo) => {
				if (!destination.renameOn) return photo
				const name = renameWith(destination.renamePattern, String(next).padStart(width, '0'), text, photo.originalName)
				next += 1
				return { ...photo, name }
			})
			updated.push({
				...source,
				photos,
				status: 'copied',
				copySettings: {
					destination: destinationPath(destination),
					backup: destination.backupOn ? destination.backupDirectory : '',
					organize: destination.organize,
					isRenamed: destination.renameOn,
					renamePattern: destination.renamePattern,
					firstNumber: first,
					lastNumber: Math.max(first, next - 1),
				},
			})
		})
		set({
			sources: updated,
			isEditingDestination: false,
			destination: destination.renameOn ? { ...destination, startNumber: String(next).padStart(width, '0') } : destination,
		})
	}

	function finishAlbum(options: { genre: string; mode: AlbumMode } | null) {
		const state = get()
		const photos = getAlbumPhotos(state)
		const cull = useCullStore.getState()
		const name = state.addToAlbum ?? (state.albumName.trim() || 'Untitled Album')
		cull.addAlbum({ id: `album-${Date.now()}`, name, photoCount: photos.length, coverUrl: photos[0]?.thumbnailUrl ?? null, action: 'cull' })
		const mode = options?.mode ?? 'Cull'
		// Adding to an existing album returns to the tab it was started from; a new album opens where its mode starts.
		cull.openAlbum(name, state.addToAlbum ? cull.activeSection : MODE_TO_SECTION[mode])
		// One Click goes on the Cull tab, with its workflow open on top to set up and start.
		if (!state.addToAlbum && mode === 'One Click') cull.openOneClick(options?.genre)
		if (state.addToAlbum) cull.showToast(`Added ${formatCount(photos.length, 'photo')} to ${name}`)
		else if (options) cull.showToast('Album created')
		set({ ...removeSession(), createAlbum: null, isIngestOpen: false, addToAlbum: null, albumName: '' })
	}

	function requestAlbum() {
		const state = get()
		const photos = getAlbumPhotos(state)
		if (state.addToAlbum) {
			finishAlbum(null)
			return
		}
		set({ createAlbum: { photoCount: photos.length, coverUrl: photos[0]?.thumbnailUrl ?? null } })
	}

	/** Option 1 puts the source on the copy screen, Option 2 puts it in the copy dialog. */
	function openSources(sources: ImportSource[], options: { isInPlace: boolean; addTo: string | null }) {
		const option = useCullStore.getState().designOption
		beginSession(sources, options)
		if (option === 2) set({ isIngestOpen: true })
		else setScreen('copy')
	}

	/** Ends the import session. Whatever the import holds (ingested, in place, or picked and waiting) stays as an album on Home that opens back into the import; a session holding no photos leaves nothing behind. */
	function saveIngested() {
		const state = get()
		const { addToAlbum, albumName } = state
		// What the import holds: photos already in or kept in place, and those picked and waiting to be ingested. A session holding none leaves nothing behind.
		const photos = [...getAlbumPhotos(state), ...(state.isInPlace ? [] : getPhotosToCopy(state))]
		if (photos.length) {
			const cull = useCullStore.getState()
			const base = addToAlbum ?? (albumName.trim() || 'Untitled Album')
			if (addToAlbum) {
				// Photos added to an album that exists simply join it.
				cull.addAlbum({ id: `album-${Date.now()}`, name: addToAlbum, photoCount: photos.length, coverUrl: photos[0]?.thumbnailUrl ?? null, action: 'cull' })
			} else {
				// A new album never merges into another that happens to share its name; its tile takes you back into the import it came from.
				let name = base
				for (let n = 2; cull.albums.some((album) => album.name === name); n += 1) name = `${base} ${n}`
				const id = `album-${Date.now()}`
				const { sources, selectedIds, hiddenIds, fileTypes, sortBy, isSortAscending, groupBy, isInPlace, isEditingDestination, collapsedKeys, destination } = state
				const saved: SavedImport = { sources, selectedIds, hiddenIds, fileTypes, sortBy, isSortAscending, groupBy, isInPlace, isEditingDestination, collapsedKeys, destination, albumName: name }
				cull.addAlbum({ id, name, photoCount: photos.length, coverUrl: photos[0]?.thumbnailUrl ?? null, action: 'import', isUnfinished: true })
				set((s) => ({ savedImports: { ...s.savedImports, [id]: saved } }))
			}
		}
		set({ ...removeSession(), isIngestOpen: false, createAlbum: null, addToAlbum: null, albumName: '' })
	}

	/** Starting something new ends the import before it: what was ingested stays as an album, and the new one begins clean. */
	function unlessDraftWaiting(proceed: () => void) {
		const { sources, copyProgress } = get()
		if (!sources.length) return proceed()
		if (copyProgress) return showToast('Wait for the ingest to finish first')
		saveIngested()
		proceed()
	}

	return {
		isNewAlbumOpen: false,
		finder: null,
		isIngestOpen: false,
		createAlbum: null,
		isSharingImages: true,
		savedImports: {},

		albumName: '',
		addToAlbum: null,
		...removeSession(),
		destination: DEFAULT_DESTINATION,

		openNewAlbum: (addTo = null) => unlessDraftWaiting(() => set({ isNewAlbumOpen: true, addToAlbum: addTo, albumName: addTo ?? '' })),
		closeNewAlbum: () => set({ isNewAlbumOpen: false, addToAlbum: null }),
		setAlbumName: (name) => set({ albumName: name }),
		openFinder: (purpose, addTo = null) => {
			const open = () => set((s) => ({ finder: { purpose, addTo: addTo ?? s.addToAlbum } }))
			// Adding to the import in progress carries on as it is; anything else starts a new import.
			if (purpose === 'add' || purpose === 'addFolder' || purpose === 'addFiles') return open()
			unlessDraftWaiting(open)
		},
		closeFinder: () => set({ finder: null }),
		startCopyFromCard: (addTo = null) => {
			// With the New Album dialog open the check has already been made; from an album's menu it hasn't.
			const start = () => openSources([buildCardSource(0)], { isInPlace: false, addTo: addTo ?? get().addToAlbum })
			if (get().isNewAlbumOpen) return start()
			unlessDraftWaiting(start)
		},

		startCopyFromCards: (cardIndexes) => {
			if (!cardIndexes.length) return
			const start = () => openSources(cardIndexes.map((index) => buildCardSource(index)), { isInPlace: false, addTo: get().addToAlbum })
			if (get().isNewAlbumOpen) return start()
			unlessDraftWaiting(start)
		},

		addCardSource: (cardIndex, label) => {
			if (get().sources.some((source) => source.name === label)) return showToast(`${label} is already a source`)
			const incoming = { ...buildCardSource(cardIndex), name: label, path: `/Volumes/${label}` }
			if (get().sources.length === 0 && !get().isIngestOpen) return openSources([incoming], { isInPlace: false, addTo: get().addToAlbum })
			addToSession(incoming)
			showToast(`Added ${label} · ${formatCount(incoming.photos.length, 'photo')}`)
		},

		completeFinder: ({ stack, picked, files, folders = [] }) => {
			const request = get().finder
			if (!request) return
			set({ finder: null })
			const { designOption } = useCullStore.getState()
			const addTo = request.addTo
			const location = stack[stack.length - 1]
			const name = picked ?? location
			const path = finderPath([...stack, ...(picked ? [picked] : [])])
			const isCard = stack[0] === CARD_NAME && stack.length === 1 && (!picked || picked === 'DCIM')
			const kind = isRemovablePath(path) ? 'external' : 'internal'
			const makeFolder = () => (isCard ? buildCardSource(0) : buildFolderSource(name, path, kind))
			const fileLabel = `${files.length} file${files.length === 1 ? '' : 's'} from ${location}`
			const hasSession = get().sources.length > 0 || get().isIngestOpen

			/** A photo is the same one when it sits at the same place under the same name, whichever source brought it in. */
			const fileKey = (source: ImportSource, photo: ImportPhoto) => `${source.path}/${photo.folder}/${photo.name}.${photo.ext}`
			/** Picked files minus those already in a source: how many were new, and what is left of the source (null when none are). */
			const withoutKnownFiles = (source: ImportSource): { fresh: ImportSource | null; skipped: number } => {
				// Photos from a folder that is already a source are in it already, so they are not added a second time.
				const isInsideFolderSource = get().sources.some(
					(existing) => !existing.isFileSelection && (source.path === existing.path || (existing.includeSubfolders && source.path.startsWith(`${existing.path}/`))),
				)
				if (isInsideFolderSource) return { fresh: null, skipped: source.photos.length }
				const known = new Set(get().sources.flatMap((existing) => existing.photos.map((photo) => fileKey(existing, photo))))
				const photos = source.photos.filter((photo) => !known.has(fileKey(source, photo)))
				const skipped = source.photos.length - photos.length
				if (!photos.length) return { fresh: null, skipped }
				return { fresh: skipped ? { ...source, photos, name: `${photos.length} file${photos.length === 1 ? '' : 's'} from ${location}` } : source, skipped }
			}
			const alreadyAddedMessage = (count: number) => (count === 1 ? 'That photo is already a source' : 'Those photos are already sources')

			/** Every folder and the photos picked together, as sources. Nothing picked means the location itself. */
			const pickedSources = (): ImportSource[] => {
				const folderSource = (folder: string | null) => {
					const folderPath = finderPath([...stack, ...(folder ? [folder] : [])])
					const isCardFolder = stack[0] === CARD_NAME && stack.length === 1 && (!folder || folder === 'DCIM')
					return isCardFolder ? buildCardSource(0) : buildFolderSource(folder ?? location, folderPath, isRemovablePath(folderPath) ? 'external' : 'internal')
				}
				const fromFolders = folders.length || files.length ? folders.map(folderSource) : [folderSource(null)]
				return files.length ? [...fromFolders, buildFileSource(files, fileLabel, path, kind)] : fromFolders
			}

			switch (request.purpose) {
				case 'import': {
					const sources = pickedSources()
					// Only photos: straight to naming the album, as there is nothing to look through.
					if (!folders.length && files.length) {
						beginSession(sources.map((source) => ({ ...source, status: 'inplace' as const })), { isInPlace: true, addTo })
						return requestAlbum()
					}
					if (designOption !== 2) return openSources(sources, { isInPlace: true, addTo })
					beginSession(sources.map((source) => ({ ...source, status: 'inplace' as const })), { isInPlace: true, addTo })
					return setScreen('preview')
				}
				case 'add': {
					const incoming = pickedSources()
					if (!hasSession) return openSources(incoming, { isInPlace: false, addTo })
					// Folders are the same when their names match; picked files are checked one by one, so a photo is never added twice.
					const fileSource = files.length ? incoming[incoming.length - 1] : null
					const folderSources = incoming.filter((source) => source !== fileSource)
					const fresh = folderSources.filter((source) => !get().sources.some((existing) => existing.name === source.name))
					const { fresh: freshFiles, skipped } = fileSource ? withoutKnownFiles(fileSource) : { fresh: null, skipped: 0 }
					if (freshFiles) fresh.push(freshFiles)
					if (!fresh.length) return showToast(fileSource && !folderSources.length ? alreadyAddedMessage(skipped) : `${incoming[0].name} is already a source`)
					fresh.forEach(addToSession)
					const added = fresh.length === 1 ? `Added ${fresh[0].name} · ${formatCount(fresh[0].photos.length, 'photo')}` : `Added ${fresh.length} sources`
					return showToast(skipped ? `${added} · ${skipped} already added` : added)
				}
				case 'importFolder': {
					if (designOption !== 2) return openSources([makeFolder()], { isInPlace: true, addTo })
					const source = { ...makeFolder(), status: 'inplace' as const }
					beginSession([source], { isInPlace: true, addTo })
					return setScreen('preview')
				}
				case 'importFiles': {
					beginSession([{ ...buildFileSource(files, fileLabel, path, kind), status: 'inplace' }], { isInPlace: true, addTo })
					return requestAlbum()
				}
				case 'copyFolder':
					return openSources([makeFolder()], { isInPlace: false, addTo })
				case 'copyFiles':
					return openSources([buildFileSource(files, fileLabel, path, kind)], { isInPlace: false, addTo })
				case 'addFolder':
				case 'addFiles': {
					const incoming = request.purpose === 'addFiles' ? buildFileSource(files, fileLabel, path, kind) : makeFolder()
					if (!hasSession) return openSources([incoming], { isInPlace: false, addTo })
					const isFiles = request.purpose === 'addFiles'
					if (!isFiles && get().sources.some((source) => source.name === incoming.name)) return showToast(`${incoming.name} is already a source`)
					// Picked files are checked one by one against every source, so a photo is never added twice.
					const { fresh, skipped } = isFiles ? withoutKnownFiles(incoming) : { fresh: incoming, skipped: 0 }
					if (!fresh) return showToast(alreadyAddedMessage(skipped))
					addToSession(fresh)
					const added = `Added ${fresh.name} · ${formatCount(fresh.photos.length, 'photo')}`
					return showToast(skipped ? `${added} · ${skipped} already added` : added)
				}
			}
		},

		toggleFileType: (type) => {
			const other: ImportFileType = type === 'raw' ? 'jpg' : 'raw'
			const { fileTypes } = get()
			if (fileTypes[type] && !fileTypes[other]) return showToast('Keep at least one file type')
			set({ fileTypes: { ...fileTypes, [type]: !fileTypes[type] } })
		},
		setSortBy: (sortBy) => set({ sortBy }),
		setSortAscending: (isSortAscending) => set({ isSortAscending }),
		setGroupBy: (groupBy) => set({ groupBy }),
		togglePhoto: (id) =>
			set((s) => {
				const next = new Set(s.selectedIds)
				if (next.has(id)) next.delete(id)
				else next.add(id)
				return { selectedIds: next }
			}),
		setPhotosSelected: (ids, isSelected) =>
			set((s) => {
				const next = new Set(s.selectedIds)
				ids.forEach((id) => (isSelected ? next.add(id) : next.delete(id)))
				return { selectedIds: next }
			}),
		// Showing a folder again selects its photos, like adding them for the first time.
		setPhotosHidden: (ids, isHidden) =>
			set((s) => {
				const hidden = new Set(s.hiddenIds)
				const selected = new Set(s.selectedIds)
				ids.forEach((id) => {
					if (isHidden) {
						hidden.add(id)
						selected.delete(id)
					} else {
						hidden.delete(id)
						selected.add(id)
					}
				})
				return { hiddenIds: hidden, selectedIds: selected }
			}),
		toggleSourceEnabled: (id) => set((s) => ({ sources: s.sources.map((source) => (source.id === id && source.status === 'pending' ? { ...source, isEnabled: !source.isEnabled } : source)) })),
		setIncludeSubfolders: (id, include) => set((s) => ({ sources: s.sources.map((source) => (source.id === id ? { ...source, includeSubfolders: include } : source)) })),
		removeSource: (id) => {
			const removed = get().sources.find((source) => source.id === id)
			set((s) => {
				const ids = new Set(removed?.photos.map((p) => p.id))
				return { sources: s.sources.filter((source) => source.id !== id), selectedIds: new Set([...s.selectedIds].filter((photoId) => !ids.has(photoId))) }
			})
			if (removed) showToast(`Removed ${removed.name}`)
		},
		updateDestination: (patch) => set((s) => ({ destination: { ...s.destination, ...patch } })),
		setEditingDestination: (isEditing) => set({ isEditingDestination: isEditing }),
		setSharingImages: (isSharing) => set({ isSharingImages: isSharing }),
		viewMode: 'list',
		setViewMode: (mode) => set({ viewMode: mode }),
		toggleCollapsed: (key) => set((s) => ({ collapsedKeys: { ...s.collapsedKeys, [key]: !s.collapsedKeys[key] } })),

		copyAndAddMore: () => {
			const { sources, copyProgress } = get()
			if (copyProgress) return
			const pending = sources.filter((source) => source.status === 'pending')
			const items = getPhotosToCopy(get())
			if (!items.length) return
			runCopy(items.length, pending.map((source) => source.name).join(', '), () => {
				const chosen = new Set(items.map((photo) => photo.id))
				markCopied(pending.map((source) => source.id), (photo) => chosen.has(photo.id))
				showToast(`${formatCount(items.length, 'photo')} ingested`)
				// Finished while the user was on Home: nothing is left on screen to continue, so it settles as an album.
				if (useCullStore.getState().screen === 'home') saveIngested()
			})
		},
		copyAndCreateAlbum: () => {
			const { sources, copyProgress, isInPlace } = get()
			if (copyProgress) return
			const pending = sources.filter((source) => source.status === 'pending')
			const items = getPhotosToCopy(get())
			if (isInPlace) {
				if (!getAlbumPhotos(get()).length) return
				return requestAlbum()
			}
			if (!items.length) {
				if (getAlbumPhotos(get()).length > 0) requestAlbum()
				return
			}
			runCopy(items.length, pending.map((source) => source.name).join(', '), () => {
				const chosen = new Set(items.map((photo) => photo.id))
				markCopied(pending.map((source) => source.id), (photo) => chosen.has(photo.id))
				requestAlbum()
			})
		},
		copyPendingSources: (onDone) => {
			const { sources, copyProgress, hiddenIds } = get()
			if (copyProgress) return
			const pending = sources.filter((source) => source.status === 'pending' && source.isEnabled && getPhotosToIngest(source, hiddenIds).length)
			if (!pending.length) return onDone?.()
			const chosen = new Set(pending.flatMap((source) => getPhotosToIngest(source, hiddenIds).map((photo) => photo.id)))
			const total = chosen.size
			runCopy(total, pending.map((source) => source.name).join(', '), () => {
				markCopied(pending.map((source) => source.id), (photo) => chosen.has(photo.id))
				set((s) => ({ selectedIds: new Set([...s.selectedIds, ...s.sources.filter((source) => source.status === 'copied').flatMap((source) => source.photos.map((photo) => photo.id))]) }))
				if (onDone) onDone()
				else showToast(`${formatCount(total, 'photo')} ingested`)
			})
		},
		// Nothing has been copied yet when it stops, so every source is still waiting to be copied.
		cancelCopy: () => {
			clearInterval(copyTimer)
			clearTimeout(copyFinishTimer)
			set({ copyProgress: null })
			showToast('Ingest cancelled')
		},
		openPreview: () => {
			// The copy dialog sits over Home, so being on Home doesn't mean leaving: someone who closed the dialog mid-copy stays where they are.
			const hasLeft = !get().isIngestOpen
			set({ isIngestOpen: false })
			if (hasLeft) {
				saveIngested()
				return showToast('Ingest finished')
			}
			setScreen('preview')
		},
		/** Back to the import in progress, from its card on Home. */
		resumeImport: () => {
			if (useCullStore.getState().designOption !== 2) return setScreen('copy')
			// Sources still waiting to be ingested go back to the dialog; once everything is in, to the preview.
			const hasWaiting = get().sources.some((source) => source.status === 'pending' && source.isEnabled)
			if (hasWaiting || !get().sources.length) set({ isIngestOpen: true })
			else setScreen('preview')
		},
		openIngest: () => set({ isIngestOpen: true }),
		closeIngest: () => {
			// Closing during a copy leaves it running; its card on Home shows how far along it is.
			if (get().copyProgress) return set({ isIngestOpen: false })
			// Over the preview it is only the dialog that goes; over Home it is the whole import.
			if (useCullStore.getState().screen === 'preview') return set({ isIngestOpen: false })
			saveIngested()
		},
		openSavedImport: (albumId) => {
			const saved = get().savedImports[albumId]
			if (!saved || get().copyProgress) return
			// Whatever is open now is set aside first, the same as when leaving it.
			if (get().sources.length) saveIngested()
			const rest = { ...get().savedImports }
			delete rest[albumId]
			useCullStore.getState().removeAlbum(albumId)
			set({ ...saved, savedImports: rest, addToAlbum: null, isIngestOpen: false, createAlbum: null, copyProgress: null })
			get().resumeImport()
		},
		leaveImport: () => {
			// An ingest still running carries on; the Home card shows how far along it is.
			if (!get().copyProgress) saveIngested()
			useCullStore.getState().goHome()
		},
		openCreateAlbum: () => {
			const photos = getAlbumPhotos(get())
			if (get().addToAlbum) return finishAlbum(null)
			set({ createAlbum: { photoCount: photos.length, coverUrl: photos[0]?.thumbnailUrl ?? null } })
		},
		closeCreateAlbum: () => set({ createAlbum: null }),
		confirmCreateAlbum: (options) => finishAlbum(options),
	}
})

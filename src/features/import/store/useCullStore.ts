import { create } from 'zustand'
import { buildMockAlbums } from '../data/mockAlbums'
import type { Album } from '../types'

// The Home and import screens come from aftershoot-web-prototype, where this store also ran that
// prototype's own album screen. Here the album is the rawux Workspace (routes/index.tsx), so only
// what Home and the import flow read is kept. The name and exports match the original so the
// copied components and useImportStore work unchanged.

export type AppSection = 'cull' | 'edit' | 'retouch'
/** Home, the import copy screen, the import preview screen, or an open album. */
export type AppScreen = 'start' | 'home' | 'copy' | 'preview' | 'album'
export type DesignOption = 1 | 2 | 3

interface CullState {
	albumName: string
	screen: AppScreen
	/** Fixed at 3, the option the web prototype is taking forward. */
	designOption: DesignOption
	albums: Album[]
	toast: string | null
	/** The section the open album was opened on, or last switched to. */
	activeSection: AppSection
	/** The One Click Workflow dialog, and the genre it opens on. */
	oneClick: { isOpen: boolean; genre: string | null }
	/** Names of albums created in this session: they open with nothing culled or edited yet. */
	newAlbumNames: Set<string>
	/** Whether the open album is one created in this session. */
	isAlbumNew: boolean
	/** Goes up each time an album is opened, so the workspace starts over for it. */
	albumSession: number

	setAlbumName: (name: string) => void
	setActiveSection: (section: AppSection) => void
	openAlbum: (name: string, section: AppSection) => void
	openOneClick: (genre?: string | null) => void
	closeOneClick: () => void
	goHome: () => void
	setScreen: (screen: AppScreen) => void
	/** Puts a new album first, or, when one with this name exists, adds to its photo count. */
	addAlbum: (album: Album) => void
	removeAlbum: (id: string) => void
	showToast: (message: string) => void
	dismissToast: () => void
}

const TOAST_DURATION_MS = 2600
let toastTimer: ReturnType<typeof setTimeout> | undefined

export const useCullStore = create<CullState>((set) => ({
	albumName: '',
	screen: 'home',
	designOption: 3,
	albums: buildMockAlbums(),
	toast: null,
	activeSection: 'cull',
	oneClick: { isOpen: false, genre: null },
	newAlbumNames: new Set(),
	isAlbumNew: false,
	albumSession: 0,

	setAlbumName: (name) => set({ albumName: name }),
	setActiveSection: (section) => set({ activeSection: section }),
	openAlbum: (name, section) => set((s) => ({ screen: 'album', albumName: name, activeSection: section, isAlbumNew: s.newAlbumNames.has(name), albumSession: s.albumSession + 1 })),
	openOneClick: (genre = null) => set({ oneClick: { isOpen: true, genre } }),
	closeOneClick: () => set({ oneClick: { isOpen: false, genre: null } }),
	goHome: () => set({ screen: 'home' }),
	setScreen: (screen) => set({ screen }),
	removeAlbum: (id) => set((s) => ({ albums: s.albums.filter((album) => album.id !== id) })),
	addAlbum: (album) =>
		set((s) => {
			// An album with no photos has nothing to show or open, so it never gets a card.
			if (album.photoCount <= 0) return {}
			const existing = s.albums.find((a) => a.name === album.name)
			if (!existing) return { albums: [album, ...s.albums], newAlbumNames: new Set([...s.newAlbumNames, album.name]) }
			return { albums: s.albums.map((a) => (a === existing ? { ...a, photoCount: a.photoCount + album.photoCount, coverUrl: a.coverUrl ?? album.coverUrl } : a)) }
		}),
	dismissToast: () => {
		clearTimeout(toastTimer)
		set({ toast: null })
	},
	showToast: (message) => {
		set({ toast: message })
		clearTimeout(toastTimer)
		toastTimer = setTimeout(() => set({ toast: null }), TOAST_DURATION_MS)
	},
}))

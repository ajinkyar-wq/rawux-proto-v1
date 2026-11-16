import type { Album } from '../types'

const WEDDING_ALBUM_NAME = '93b4db31-ef73-4897-b055-e9d6518a9f2c'

// Mirrors the mix a real library shows: a run of large albums ready to cull, and a few
// smaller ones further along (Edit Now). An album exists only once photos have been ingested.
const ALBUM_SHAPES: Array<Pick<Album, 'name' | 'photoCount' | 'action'>> = [
	{ name: WEDDING_ALBUM_NAME, photoCount: 6270, action: 'cull' },
	{ name: WEDDING_ALBUM_NAME, photoCount: 6270, action: 'cull' },
	{ name: WEDDING_ALBUM_NAME, photoCount: 6270, action: 'cull' },
	{ name: WEDDING_ALBUM_NAME, photoCount: 6270, action: 'cull' },
	{ name: WEDDING_ALBUM_NAME, photoCount: 6270, action: 'cull' },
	{ name: 'JPG', photoCount: 60, action: 'edit' },
	{ name: 'JPG', photoCount: 175, action: 'cull' },
	{ name: 'Test', photoCount: 621, action: 'cull' },
]

/** Albums in newest-first order, so the array index doubles as the "Date Created" sort. */
export function buildMockAlbums(): Album[] {
	return ALBUM_SHAPES.map((shape, i) => ({
		...shape,
		id: `album-${i}`,
		coverUrl: shape.photoCount > 0 ? `https://picsum.photos/seed/album-cover-${i}/640/440` : null,
	}))
}

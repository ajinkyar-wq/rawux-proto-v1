import type { Album } from '../types'
import { sampleUrl } from '@/components/aftershoot/cull-data'

// The prototype has a single album, built from the sample photos in src/assets/samples.
const ALBUM_SHAPES: Array<Pick<Album, 'name' | 'photoCount' | 'action'>> = [
	{ name: 'Sample Album', photoCount: 232, action: 'cull' },
]

/** Albums in newest-first order, so the array index doubles as the "Date Created" sort. */
export function buildMockAlbums(): Album[] {
	return ALBUM_SHAPES.map((shape, i) => ({
		...shape,
		id: `album-${i}`,
		coverUrl: shape.photoCount > 0 ? sampleUrl(0) : null,
	}))
}

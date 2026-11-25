export type SubjectCategory = 'Masculine' | 'Feminine' | 'Elderly' | 'Child';

// A face's display crop, stored as a fraction (0..1) of the source image so a
// key-faces panel can render the region from the full-resolution photo rather
// than a re-encoded thumbnail. Framed head-to-chest with margin on all sides.
export interface FaceRect {
  x: number; y: number; w: number; h: number;
}

export interface ModelSubject {
  id: number;
  keyFaceDataUrl: string;
  photoCount: number;
  appearances: Array<{ imageIndex: number; score: number }>;
  gender?: 'Female' | 'Male';
  age?: number;
  category?: SubjectCategory;
}

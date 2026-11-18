// Order photos: shrink on the device, then upload to the counter API.

const MAX_SIDE = 1600; // px. Plenty for the workshop; keeps uploads small on the iPad.
const JPEG_QUALITY = 0.85;

export class PhotoError extends Error {}

// Re-encodes the photo as a JPEG no larger than MAX_SIDE on its longest side.
export async function shrinkPhoto(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new PhotoError('This photo could not be read. Try taking it again.');
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new PhotoError('This device could not prepare the photo.');
  ctx.fillStyle = '#FFFFFF'; // JPEG has no transparency
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
  if (!blob) throw new PhotoError('This device could not prepare the photo.');
  return blob;
}

// Uploads the photo for an order and returns the stored path.
export async function uploadPhoto(orderNo: string, blob: Blob): Promise<string> {
  const res = await fetch(`/api/photo?order=${encodeURIComponent(orderNo)}`, {
    method: 'POST',
    headers: { 'content-type': 'image/jpeg' },
    credentials: 'same-origin',
    body: blob,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new PhotoError(res.status === 401 ? 'Locked. Enter the PIN.' : body.error ?? 'The photo could not be saved.');
  }
  return ((await res.json()) as { path: string }).path;
}

export function photoUrl(path: string): string {
  return `/api/photo?path=${encodeURIComponent(path)}`;
}

// Removes a stored photo. A failure here is not shown: the order no longer refers to it.
export async function deletePhoto(path: string): Promise<void> {
  try {
    await fetch(`/api/photo?path=${encodeURIComponent(path)}`, { method: 'DELETE', credentials: 'same-origin' });
  } catch {
    /* ignore: the photo is unreferenced */
  }
}

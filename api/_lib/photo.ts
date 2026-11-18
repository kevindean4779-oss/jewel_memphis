// Rules for order photos. Kept free of server imports so they can be unit tested.

export const PHOTO_BUCKET = 'order-photos';
export const PHOTO_MAX_BYTES = 4 * 1024 * 1024;

// Order numbers look like CO-2041.
export function isOrderNo(value: unknown): value is string {
  return typeof value === 'string' && /^CO-\d{1,6}$/.test(value);
}

// Stored paths look like CO-2041/1767000000000.jpg
export function isPhotoPath(value: unknown): value is string {
  return typeof value === 'string' && /^CO-\d{1,6}\/\d{10,16}\.jpg$/.test(value);
}

export function newPhotoPath(orderNo: string, now = Date.now()): string {
  return `${orderNo}/${now}.jpg`;
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serviceClient } from './_lib/supabase.js';
import { isUnlocked } from './_lib/lock.js';
import { PHOTO_BUCKET, PHOTO_MAX_BYTES, isOrderNo, isPhotoPath, newPhotoPath } from './_lib/photo.js';

// The photo is sent as raw JPEG bytes, so Vercel must not parse the body.
export const config = { api: { bodyParser: false } };

class TooLarge extends Error {}

async function readBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > PHOTO_MAX_BYTES) throw new TooLarge('Photo is too large');
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

// Order photos. Only an unlocked counter can upload, view or delete them.
// POST   /api/photo?order=CO-2041   body: image/jpeg bytes  -> { path }
// GET    /api/photo?path=CO-2041/…  -> image bytes
// DELETE /api/photo?path=CO-2041/…
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isUnlocked(req)) return res.status(401).json({ error: 'Locked. Enter the PIN.' });

  try {
    const sb = serviceClient();
    const bucket = sb.storage.from(PHOTO_BUCKET);

    if (req.method === 'POST') {
      const order = req.query.order;
      if (!isOrderNo(order)) return res.status(400).json({ error: 'Invalid order' });
      if (req.headers['content-type'] !== 'image/jpeg') {
        return res.status(415).json({ error: 'Photo must be a JPEG' });
      }
      const bytes = await readBody(req);
      if (bytes.length === 0) return res.status(400).json({ error: 'Empty photo' });
      const path = newPhotoPath(order);
      const { error } = await bucket.upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
      if (error) throw error;
      return res.json({ path });
    }

    const path = req.query.path;
    if (!isPhotoPath(path)) return res.status(400).json({ error: 'Invalid photo' });

    if (req.method === 'GET') {
      const { data, error } = await bucket.download(path);
      if (error || !data) return res.status(404).json({ error: 'Photo not found' });
      res.setHeader('Content-Type', 'image/jpeg');
      return res.send(Buffer.from(await data.arrayBuffer()));
    }

    if (req.method === 'DELETE') {
      const { error } = await bucket.remove([path]);
      if (error) throw error;
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof TooLarge) return res.status(413).json({ error: 'Photo is too large' });
    console.error(`[photo] ${req.method} failed: ${(err as Error).message}`);
    return res.status(500).json({ error: 'Photo request failed' });
  }
}

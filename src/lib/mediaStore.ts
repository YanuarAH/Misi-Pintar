import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Penyimpanan file gambar soal.
 *
 * Proyek ini tidak memakai layanan storage eksternal (tanpa Supabase/S3), jadi file disimpan
 * di disk server pada `MEDIA_ROOT` (default `storage/media`, di luar `public/`) dan hanya
 * disajikan lewat route `/media/[id]` yang memeriksa hak akses. Tidak ada file yang bisa
 * diakses langsung berdasarkan path.
 */

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export type ImageMime = "image/jpeg" | "image/png" | "image/webp";

const EXTENSIONS: Record<ImageMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class MediaError extends Error {}

export function mediaRoot(): string {
  return process.env.MEDIA_ROOT ?? path.join(process.cwd(), "storage", "media");
}

/** Mendeteksi tipe gambar dari magic bytes — tipe dari browser tidak dipercaya. */
export function detectImageMime(bytes: Uint8Array): ImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function validateImageBytes(bytes: Uint8Array): { mime: ImageMime; sha256: string } {
  if (bytes.length === 0) throw new MediaError("File gambar kosong.");
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new MediaError("Ukuran gambar maksimal 3 MB.");
  }
  const mime = detectImageMime(bytes);
  if (!mime) throw new MediaError("Format gambar harus JPEG, PNG, atau WebP.");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return { mime, sha256 };
}

function assertSafeKey(key: string): void {
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(key)) {
    throw new MediaError("Nama file tidak valid.");
  }
}

/** Menyimpan file dan mengembalikan `storage_key` (nama file acak + ekstensi). */
export async function saveImageBytes(bytes: Uint8Array, mime: ImageMime): Promise<string> {
  const key = `${randomUUID()}.${EXTENSIONS[mime]}`;
  const root = mediaRoot();
  await mkdir(/*turbopackIgnore: true*/ root, { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ path.join(root, key), bytes, { mode: 0o600 });
  return key;
}

export async function readImageBytes(key: string): Promise<Buffer | null> {
  assertSafeKey(key);
  try {
    return await readFile(/*turbopackIgnore: true*/ path.join(mediaRoot(), key));
  } catch {
    return null;
  }
}

export async function deleteImageBytes(key: string): Promise<void> {
  assertSafeKey(key);
  try {
    await unlink(/*turbopackIgnore: true*/ path.join(mediaRoot(), key));
  } catch {
    // File sudah tidak ada: tidak perlu gagal.
  }
}

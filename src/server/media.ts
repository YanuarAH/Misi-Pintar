import { one, rows, type Viewer } from "@/lib/db";
import {
  MediaError,
  deleteImageBytes,
  readImageBytes,
  saveImageBytes,
  validateImageBytes,
  type ImageMime,
} from "@/lib/mediaStore";

export type MediaFile = { bytes: Buffer; mime: ImageMime };

async function assertQuestionEditable(viewer: Viewer, questionId: string): Promise<void> {
  const question = await one<{ id: string }>(
    viewer,
    `select q.id from questions q
      where q.id = $1 and public.app_mission_editable(q.mission_id)`,
    [questionId],
  );
  if (!question) throw new MediaError("Soal tidak ditemukan atau bukan milik misi Anda.");
}

/** Menghapus baris media (bila tidak dipakai soal lain) beserta file fisiknya. */
async function deleteIfUnused(viewer: Viewer, imageId: string): Promise<void> {
  const deleted = await rows<{ storage_key: string }>(
    viewer,
    "delete from media_assets where id = $1 returning storage_key",
    [imageId],
  );
  if (deleted[0]) await deleteImageBytes(deleted[0].storage_key);
}

/**
 * Melampirkan gambar ke soal: validasi tipe/ukuran dari isi file, simpan ke disk,
 * catat metadata, lalu hubungkan ke soal. Gambar lama dibersihkan bila tidak dipakai
 * soal lain (RLS menolak hapus bila masih ada referensi).
 */
export async function attachQuestionImage(
  viewer: Viewer,
  questionId: string,
  file: File,
): Promise<{ imageId: string }> {
  await assertQuestionEditable(viewer, questionId);

  const bytes = Buffer.from(await file.arrayBuffer());
  const { mime, sha256 } = validateImageBytes(bytes);

  const storageKey = await saveImageBytes(bytes, mime);

  let imageId: string;
  try {
    const inserted = await one<{ id: string }>(
      viewer,
      `insert into media_assets (storage_key, mime_type, byte_size, sha256, uploaded_by)
       values ($1, $2, $3, $4, $5) returning id`,
      [storageKey, mime, bytes.byteLength, sha256, viewer?.userId ?? null],
    );
    if (!inserted) throw new MediaError("Gambar gagal disimpan.");
    imageId = inserted.id;
  } catch (error) {
    await deleteImageBytes(storageKey);
    throw error;
  }

  const previous = await one<{ image_id: string | null }>(
    viewer,
    "select image_id from questions where id = $1",
    [questionId],
  );

  const updated = await one<{ id: string }>(
    viewer,
    "update questions set image_id = $2 where id = $1 and archived_at is null returning id",
    [questionId, imageId],
  );
  if (!updated) {
    await deleteIfUnused(viewer, imageId);
    throw new MediaError("Gambar gagal dihubungkan ke soal.");
  }

  if (previous?.image_id && previous.image_id !== imageId) {
    await deleteIfUnused(viewer, previous.image_id);
  }

  return { imageId };
}

/** Melepas gambar dari soal tanpa menghapus soal. */
export async function detachQuestionImage(viewer: Viewer, questionId: string): Promise<void> {
  await assertQuestionEditable(viewer, questionId);

  const previous = await one<{ image_id: string | null }>(
    viewer,
    "select image_id from questions where id = $1",
    [questionId],
  );
  await rows(viewer, "update questions set image_id = null where id = $1", [questionId]);

  if (previous?.image_id) await deleteIfUnused(viewer, previous.image_id);
}

/** Membaca gambar untuk route /media/[id]; RLS menentukan siapa yang boleh. */
export async function getMediaForViewer(viewer: Viewer, imageId: string): Promise<MediaFile | null> {
  const asset = await one<{ storage_key: string; mime_type: ImageMime }>(
    viewer,
    "select storage_key, mime_type from media_assets where id = $1",
    [imageId],
  );
  if (!asset) return null;
  const bytes = await readImageBytes(asset.storage_key);
  if (!bytes) return null;
  return { bytes, mime: asset.mime_type };
}

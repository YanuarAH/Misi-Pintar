import { getSession } from "@/lib/session";
import { getMediaForViewer } from "@/server/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Menyajikan gambar soal. Tidak ada file yang bisa diakses lewat path langsung: `storage_key`
 * hanya dikenal server, dan RLS memutuskan apakah pengguna berhak melihat gambarnya
 * (guru pemilik misi atau siswa yang boleh melihat misi tersebut).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response("Tidak ditemukan", { status: 404 });

  const session = await getSession();
  if (!session) return new Response("Tidak ditemukan", { status: 404 });

  const media = await getMediaForViewer({ userId: session.id, role: session.role }, id);
  if (!media) return new Response("Tidak ditemukan", { status: 404 });

  return new Response(new Uint8Array(media.bytes), {
    headers: {
      "Content-Type": media.mime,
      "Content-Length": String(media.bytes.byteLength),
      "Content-Disposition": 'inline; filename="gambar-soal"',
      // Gambar di balik otorisasi: jangan pernah disimpan cache bersama/disk.
      "Cache-Control": "private, no-store",
      "Vary": "Cookie",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

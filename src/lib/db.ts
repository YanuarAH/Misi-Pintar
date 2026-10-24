import { Pool, type PoolClient, type QueryResultRow } from "pg";

export type Viewer = { userId: string; role: "student" | "teacher" } | null;

declare global {
  // eslint-disable-next-line no-var
  var __misiPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!globalThis.__misiPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL belum diatur. Lihat .env.example.");
    }
    globalThis.__misiPool = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_SIZE ?? 8),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      application_name: "misi-pintar",
    });
  }
  return globalThis.__misiPool;
}

/** Menutup pool (dipakai script/test yang perlu keluar dengan rapi). */
export async function closePool(): Promise<void> {
  if (globalThis.__misiPool) {
    await globalThis.__misiPool.end();
    globalThis.__misiPool = undefined;
  }
}

/**
 * Menjalankan query dalam transaksi dengan identitas pengguna disetel untuk RLS.
 * Tidak ada query aplikasi yang boleh berjalan di luar pembungkus ini.
 */
export async function withViewer<T>(viewer: Viewer, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("select set_config('app.user_id', $1, true), set_config('app.role', $2, true)", [
      viewer?.userId ?? "",
      viewer?.role ?? "anon",
    ]);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // koneksi sudah tidak sehat; biarkan error asli yang dilaporkan
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function rows<T extends QueryResultRow>(
  viewer: Viewer,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  return withViewer(viewer, async (client) => {
    const result = await client.query<T>(sql, params);
    return result.rows;
  });
}

export async function one<T extends QueryResultRow>(
  viewer: Viewer,
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const result = await rows<T>(viewer, sql, params);
  return result[0] ?? null;
}

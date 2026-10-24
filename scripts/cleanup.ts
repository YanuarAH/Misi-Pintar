/**
 * Membersihkan percobaan terbengkalai: belum selesai, tidak punya satu pun jawaban,
 * dan sudah lama tidak disentuh. Percobaan selesai tidak pernah disentuh karena
 * merupakan riwayat belajar.
 *
 *   npm run db:cleanup              # default: lebih tua dari 7 hari
 *   npm run db:cleanup -- --days=30
 */
import { Client } from "pg";
import { loadEnv, requireEnv } from "./lib/env";

async function main() {
  loadEnv();
  const daysArg = process.argv.find((arg) => arg.startsWith("--days="));
  const days = Math.max(1, Number(daysArg?.split("=")[1] ?? 7));

  const client = new Client({ connectionString: requireEnv("ADMIN_DATABASE_URL") });
  await client.connect();

  const staleCondition = `a.completed_at is null
          and a.started_at < now() - ($1 || ' days')::interval
          and not exists (select 1 from attempt_answers aa where aa.attempt_id = a.id)`;

  try {
    const deleted = await client.query(`delete from attempts a where ${staleCondition}`, [days]);
    if (!deleted.rowCount) {
      console.log(`Tidak ada percobaan terbengkalai lebih dari ${days} hari.`);
      return;
    }
    console.log(`${deleted.rowCount} percobaan terbengkalai dihapus (lebih dari ${days} hari, tanpa jawaban).`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

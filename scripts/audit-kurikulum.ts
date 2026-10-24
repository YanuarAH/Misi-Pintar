/**
 * Meninjau data lama yang belum punya kategori kurikulum.
 *
 *   npm run db:audit-kurikulum
 *
 * Misi tanpa tingkat kelas tidak tampil ke siswa. Skrip ini mendaftarnya agar guru
 * dapat mengategorikan lewat /guru/misi (filter "Belum dikategorikan").
 */
import { Client } from "pg";
import { loadEnv, requireEnv } from "./lib/env";

async function main() {
  loadEnv();
  const client = new Client({ connectionString: requireEnv("ADMIN_DATABASE_URL") });
  await client.connect();

  try {
    const missions = await client.query<{
      slug: string;
      title: string;
      grade_level: number | null;
      is_published: boolean;
    }>(
      `select slug, title, grade_level, is_published
         from missions
        where archived_at is null and grade_level is null
        order by created_at asc`,
    );

    const classes = await client.query<{ id: string; name: string; join_code: string; students: string }>(
      `select c.id, c.name, c.join_code,
              (select count(*) from class_members cm where cm.class_id = c.id)::text as students
         from classes c
        where c.grade_level is null
        order by c.name asc`,
    );

    console.log("Misi tanpa tingkat kelas:");
    if (missions.rows.length === 0) {
      console.log("  (tidak ada)");
    } else {
      for (const row of missions.rows) {
        console.log(
          `  - ${row.slug} — "${row.title}" (${row.is_published ? "terbit" : "draf"}) → /guru/misi filter "Belum dikategorikan"`,
        );
      }
    }

    console.log("\nKelas belajar tanpa tingkat kelas:");
    if (classes.rows.length === 0) {
      console.log("  (tidak ada)");
    } else {
      for (const row of classes.rows) {
        console.log(`  - ${row.name} (kode ${row.join_code}, ${row.students} siswa) → /guru/kelas/${row.id}`);
      }
    }

    if (missions.rows.length === 0 && classes.rows.length === 0) {
      console.log("\nSemua konten sudah dikategorikan.");
      return;
    }

    console.log(
      "\nCatatan: misi/kelas di atas tidak diberi tingkat otomatis oleh migrasi. " +
        "Setelah dikategorikan, siswa pada tingkat yang sesuai baru dapat menerima misinya.",
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

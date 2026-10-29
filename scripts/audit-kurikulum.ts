/**
 * Meninjau misi dan kelas yang belum lengkap kategori kurikulumnya.
 *
 *   npm run db:audit-kurikulum
 *
 * Misi tanpa tingkat atau mata pelajaran tidak tampil ke siswa. Skrip ini mendaftarnya agar guru
 * dapat melengkapi lewat /guru/misi (filter "Belum dikategorikan") atau detail kelas.
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
      subject_slug: string | null;
      is_published: boolean;
    }>(
      `select slug, title, grade_level, subject_slug, is_published
         from missions
        where archived_at is null and (grade_level is null or subject_slug is null)
        order by created_at asc`,
    );

    const classes = await client.query<{
      id: string;
      name: string;
      join_code: string;
      grade_level: number | null;
      subject_slug: string | null;
      students: string;
    }>(
      `select c.id, c.name, c.join_code, c.grade_level, c.subject_slug,
              (select count(*) from class_members cm where cm.class_id = c.id)::text as students
         from classes c
        where c.grade_level is null or c.subject_slug is null
        order by c.name asc`,
    );

    console.log("Misi tanpa tingkat kelas atau mata pelajaran:");
    if (missions.rows.length === 0) {
      console.log("  (tidak ada)");
    } else {
      for (const row of missions.rows) {
        const missing = [
          row.grade_level === null ? "tingkat kelas" : null,
          row.subject_slug === null ? "mata pelajaran" : null,
        ]
          .filter((item): item is string => item !== null)
          .join(" dan ");
        console.log(
          `  - ${row.slug} — "${row.title}" (belum ada ${missing}; ${row.is_published ? "terbit" : "draf"}) → /guru/misi filter "Belum dikategorikan"`,
        );
      }
    }

    console.log("\nKelas belajar tanpa tingkat kelas atau mata pelajaran:");
    if (classes.rows.length === 0) {
      console.log("  (tidak ada)");
    } else {
      for (const row of classes.rows) {
        const missing = [
          row.grade_level === null ? "tingkat kelas" : null,
          row.subject_slug === null ? "mata pelajaran" : null,
        ]
          .filter((item): item is string => item !== null)
          .join(" dan ");
        console.log(
          `  - ${row.name} (belum ada ${missing}; kode ${row.join_code}, ${row.students} siswa) → /guru/kelas/${row.id}`,
        );
      }
    }

    if (missions.rows.length === 0 && classes.rows.length === 0) {
      console.log("\nSemua konten sudah dikategorikan.");
      return;
    }

    console.log(
      "\nCatatan: misi/kelas di atas tidak dilengkapi otomatis oleh migrasi. " +
        "Lengkapi tingkat dan mata pelajaran agar misi dapat tersedia bagi kelas yang sesuai.",
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

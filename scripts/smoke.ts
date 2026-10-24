/**
 * Smoke test HTTP. Bisa dijalankan lokal maupun terhadap hasil deployment:
 *
 *   npm run test:http                        # memakai APP_URL atau http://localhost:3000
 *   APP_URL=https://misi-pintar.vercel.app npm run test:http
 *
 * Sesi dibuat langsung di database (tanpa form login) agar script tidak menyimpan
 * password siapa pun. Yang diuji: routing, guard autentikasi, render halaman inti.
 */
import { createHash, randomBytes } from "node:crypto";
import { Client } from "pg";
import { loadEnv, requireEnv } from "./lib/env";

const checks: { name: string; ok: boolean; detail: string }[] = [];

function record(name: string, ok: boolean, detail = "") {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "  ok  " : " GAGAL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  loadEnv();
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const admin = new Client({ connectionString: requireEnv("ADMIN_DATABASE_URL") });
  await admin.connect();

  const createdTokens: string[] = [];

  async function sessionFor(role: "student" | "teacher"): Promise<{ token: string; name: string } | null> {
    const { rows } = await admin.query<{ id: string; display_name: string }>(
      "select id, display_name from profiles where role = $1 order by created_at limit 1",
      [role],
    );
    const profile = rows[0];
    if (!profile) return null;

    const token = randomBytes(32).toString("base64url");
    const hash = createHash("sha256").update(token).digest("hex");
    await admin.query("select public.app_create_session($1, $2, $3)", [
      profile.id,
      hash,
      new Date(Date.now() + 60 * 60 * 1000),
    ]);
    createdTokens.push(hash);
    return { token, name: profile.display_name };
  }

  async function get(path: string, token?: string) {
    const response = await fetch(`${base}${path}`, {
      redirect: "manual",
      headers: token ? { cookie: `misi_session=${token}` } : {},
    });
    const body = response.status === 200 ? await response.text() : "";
    return { status: response.status, location: response.headers.get("location") ?? "", body };
  }

  try {
    const home = await get("/");
    record("GET / mengembalikan 200", home.status === 200, `status ${home.status}`);
    record("Landing memuat nama produk", home.body.includes("Misi Pintar"));

    const login = await get("/masuk");
    record("GET /masuk 200", login.status === 200, `status ${login.status}`);

    const guardStudent = await get("/belajar");
    record(
      "GET /belajar tanpa sesi dialihkan",
      [302, 307, 308].includes(guardStudent.status) && guardStudent.location.includes("/masuk"),
      `${guardStudent.status} -> ${guardStudent.location}`,
    );

    const guardTeacher = await get("/guru/dashboard");
    record(
      "GET /guru/dashboard tanpa sesi dialihkan",
      [302, 307, 308].includes(guardTeacher.status) && guardTeacher.location.includes("/guru/login"),
      `${guardTeacher.status} -> ${guardTeacher.location}`,
    );

    const missing = await get("/halaman-tidak-ada");
    record("Halaman tidak dikenal mengembalikan 404", missing.status === 404, `status ${missing.status}`);

    const student = await sessionFor("student");
    if (student) {
      const dashboard = await get("/belajar", student.token);
      record("Siswa dapat membuka /belajar", dashboard.status === 200, `status ${dashboard.status}`);
      record("Dashboard memuat nama siswa", dashboard.body.includes(student.name));

      const progress = await get("/progres", student.token);
      record("Siswa dapat membuka /progres", progress.status === 200, `status ${progress.status}`);

      const profile = await get("/profil", student.token);
      record("Siswa dapat membuka /profil", profile.status === 200, `status ${profile.status}`);

      const noTeacher = await get("/guru/dashboard", student.token);
      record(
        "Siswa tidak menerima data dasbor guru",
        !noTeacher.body.includes("Ringkasan belajar") && !noTeacher.body.includes("Siswa terdaftar"),
        `status ${noTeacher.status}`,
      );
    } else {
      record("Ada akun siswa untuk diuji", false, "jalankan npm run db:seed");
    }

    const teacher = await sessionFor("teacher");
    if (teacher) {
      const dashboard = await get("/guru/dashboard", teacher.token);
      record("Guru dapat membuka dasbor", dashboard.status === 200, `status ${dashboard.status}`);
      record("Dasbor guru memuat ringkasan", dashboard.body.includes("Ringkasan belajar"));

      const missions = await get("/guru/misi", teacher.token);
      record("Guru dapat membuka /guru/misi", missions.status === 200, `status ${missions.status}`);

      const noStudent = await get("/belajar", teacher.token);
      record(
        "Guru tidak menerima data area siswa",
        !noStudent.body.includes("Peta petualangan") && !noStudent.body.includes("Kartu siswa"),
        `status ${noStudent.status}`,
      );
    } else {
      record("Ada akun guru untuk diuji", false, "jalankan npm run db:seed");
    }
  } finally {
    if (createdTokens.length > 0) {
      await admin.query("delete from sessions where token_hash = any($1::text[])", [createdTokens]);
    }
    await admin.end();
  }

  const failed = checks.filter((check) => !check.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} pemeriksaan lulus.`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

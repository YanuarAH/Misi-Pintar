# Misi Pintar

> Belajar seru, selesaikan misi!

Platform pembelajaran interaktif Matematika untuk siswa kelas 5–6 SD. Siswa belajar lewat tiga misi
bertema (berbelanja di pasar, menakar bahan di dapur, merancang taman), menjawab soal satu per satu,
dan langsung mendapat umpan balik beserta pembahasan. Guru punya dasbor untuk mengelola misi, soal,
kelas, serta melihat laporan hasil belajar.

Aplikasi ini **berfungsi penuh** — bukan mockup: autentikasi, database relasional dengan Row Level
Security, penilaian di server, XP dan lencana, penguncian misi, riwayat percobaan, dan CRUD konten
lewat UI. Tidak ada model AI, tidak ada layanan berbayar, tidak ada iklan atau pelacakan.

---

## 1. Fitur yang sudah berfungsi

### Siswa

| Halaman | Isi |
| --- | --- |
| `/` | Landing: hero peta petualangan, pratinjau 3 misi dari database, cara belajar, panel guru |
| `/masuk` | Masuk dengan kode siswa + PIN (tanpa email) |
| `/daftar` | Pendaftaran mandiri memakai kode kelas dari guru, pilih nama panggilan + avatar |
| `/belajar` | Sapaan, XP, peta misi dengan status (terkunci/siap/selesai), lencana, aktivitas terakhir, kartu kode siswa |
| `/misi/[slug]` | Ringkasan misi: cerita, tujuan pembelajaran, jumlah soal, estimasi durasi, hadiah XP |
| `/misi/[slug]/main` | Pengerjaan soal satu per satu, petunjuk, pemeriksaan jawaban, pembahasan, progres tersimpan otomatis |
| `/hasil/[attemptId]` | Skor, XP, lencana yang didapat, soal yang sudah dikuasai, materi yang perlu diulang, pembahasan per soal |
| `/progres` | Total XP, misi selesai, lencana, nilai terakhir/terbaik per misi, riwayat 30 percobaan terakhir |

### Guru

| Halaman | Isi |
| --- | --- |
| `/guru/login` | Autentikasi guru (email + password) |
| `/guru/dashboard` | Jumlah siswa, penyelesaian misi, rata-rata akurasi, siswa aktif 7 hari, aktivitas terbaru, soal dengan tingkat kesalahan tertinggi |
| `/guru/misi` | Daftar misi + status validasi, buat misi baru |
| `/guru/misi/[id]` | Editor misi: pengaturan, terbitkan/tarik, arsipkan, CRUD soal (tambah, ubah, hapus dengan konfirmasi) |
| `/guru/kelas` | Daftar kelas, kode kelas, buat kelas |
| `/guru/kelas/[id]` | Roster siswa (kode siswa, akurasi, aktivitas), atur ulang PIN, keluarkan siswa, hasil per misi, soal tersulit |
| `/guru/siswa/[id]` | Laporan per siswa: riwayat percobaan (bisa dibuka detailnya), materi untuk diulang, lencana |

Aturan main yang diterapkan:

- 10 XP per jawaban benar, bonus 20 XP saat misi selesai — dihitung **server**, bukan dari browser.
- Jawaban salah tidak mengurangi XP dan tidak memblokir apa pun.
- Misi 2 terbuka setelah misi 1 selesai, misi 3 setelah misi 2 — tanpa syarat nilai sempurna.
- Mengulang misi membuat percobaan baru; riwayat lama tidak dihapus.
- Lencana: Penjelajah, Bintang Misi (≥80%), Sempurna (100%), Pembelajar Tekun (3 misi), unik per siswa.

---

## 2. Teknologi

| Lapisan | Pilihan | Alasan |
| --- | --- | --- |
| Frontend + backend | Next.js 16 (App Router) + React 19 + TypeScript | Satu proses untuk UI dan server action; tidak perlu API terpisah untuk skala MVP |
| Styling | Tailwind CSS v4 | Token warna terpusat di `globals.css`, tanpa runtime CSS-in-JS |
| Database | PostgreSQL 18 | Skema relasional + Row Level Security; kompatibel dengan Supabase |
| Akses data | `pg` + SQL langsung | Transparan, tidak ada ORM yang menyembunyikan RLS; query di `src/server/*` |
| Validasi | Zod v4 | Skema dipakai bersama oleh form dan server action |
| Autentikasi | Sendiri: scrypt + sesi opaque di database | Tidak bergantung pada email anak; tidak ada vendor auth yang menyimpan data anak |
| Ikon | Lucide | Ringan, konsisten |
| Testing | Vitest | Unit + integrasi langsung ke database uji |

Tidak ada dependensi AI/LLM, tidak ada layanan berbayar pada alur utama.

### Keputusan yang menyimpang dari usulan awal (dan alasannya)

1. **Supabase tidak dipakai di lingkungan pengembangan ini.** Tidak ada proyek Supabase/kredensial
   pada mesin ini, sedangkan PostgreSQL 18 tersedia. Skema, RLS, dan fungsi SQL ditulis agar
   **portabel ke Supabase** (lihat `docs/DEPLOYMENT.md`). Semua migrasi berjalan di Postgres biasa.
2. **Autentikasi ditulis sendiri**, bukan Supabase Auth. Alasan: siswa tidak boleh diminta email, dan
   pola "kode kelas → akun siswa dengan kode akses + PIN" memerlukan pembuatan sesi non-email.
   Implementasinya tetap standar: hash scrypt bersalt, token sesi acak 256-bit yang disimpan sebagai
   hash SHA-256, cookie `httpOnly` + `SameSite=Lax` + `Secure` di produksi, dan masa berlaku 30 hari.
3. **Klaster PostgreSQL lokal di `.pgdata` (port 5433).** Service PostgreSQL 5432 di mesin ini
   memakai password yang tidak diketahui. `npm run db:start` membuat klaster khusus proyek agar
   siapa pun bisa menjalankan tanpa mengubah instalasi sistem.
4. **Tidak ada ESLint.** Gate kualitas yang dipakai: `npm run typecheck`, `npm test`, `npm run build`.
   Menambah ESLint tanpa waktu menstabilkan aturannya akan menghasilkan gate yang berisik.

---

## 3. Struktur proyek

```
db/
  migrations/        001_schema, 002_access_helpers, 003_policies, 004_auth_functions, 005_grants
  seed/content.ts    3 misi x 10 soal (sumber kebenaran konten)
scripts/             migrate.ts, seed.ts, dev-db.ts, lib/*
src/
  app/
    (siswa)/         layout + halaman siswa (belajar, misi, progres)
    hasil/[id]/      halaman hasil (bisa diakses siswa pemilik & guru pengampu)
    guru/(app)/      dasbor guru (guard di layout)
    guru/login/      login guru (di luar guard)
    actions/         server action: auth.ts, student.ts, teacher.ts
    page.tsx         landing
  components/        ui/, layout/, student/, teacher/, auth/, marketing/
  lib/               db, session, auth, password, normalize, scoring, achievements,
                     validation, rateLimit, format, avatars, cn
  server/            student.ts, teacher.ts, types.ts (lapisan data + aturan bisnis)
tests/               unit, validasi, RLS, alur misi, batas akses guru
docs/                DEPLOYMENT.md, TESTING.md
```

---

## 4. Menjalankan di lokal

Prasyarat: Node.js 22+, PostgreSQL 18 (atau Docker/Supabase).

```bash
npm install

# 1) Siapkan database
cp .env.example .env.local        # lalu sesuaikan kredensial
npm run db:start                  # khusus Windows + PostgreSQL lokal di folder .pgdata (port 5433)
#    Atau, bila sudah punya PostgreSQL sendiri:
#    createdb misi_pintar
#    create role misi_app login password '...' nosuperuser nobypassrls;

# 2) Migrasi + data awal (3 misi, 30 soal, akun demo)
npm run db:migrate
npm run db:seed

# 3) Jalankan
npm run dev          # http://localhost:3000
```

Perintah lain:

| Perintah | Fungsi |
| --- | --- |
| `npm run db:migrate` | Menerapkan migrasi yang belum jalan (`--reset` untuk drop & buat ulang) |
| `npm run db:seed` | Mengisi data yang belum ada; `-- --force` menimpa teks misi/soal dengan versi seed |
| `npm run db:reset` | Reset total + seed ulang |
| `npm run typecheck` | TypeScript strict tanpa emisi |
| `npm test` | 80 test Vitest (butuh database uji, lihat `docs/TESTING.md`) |
| `npm run build` / `npm start` | Build & jalankan versi produksi |

### Variabel environment

Lihat `.env.example`. Ringkasnya:

| Variabel | Wajib | Dipakai oleh |
| --- | --- | --- |
| `DATABASE_URL` | ya | Runtime aplikasi (role terbatas, RLS berlaku) |
| `ADMIN_DATABASE_URL` | ya | Hanya `db:migrate` & `db:seed` (role owner) |
| `APP_URL` | tidak | Metadata/tautan absolut |
| `SEED_TEACHER_EMAIL`, `SEED_TEACHER_PASSWORD` | tidak | Akun guru hasil seed |
| `SEED_DEMO_ACCOUNTS` | tidak | Harus `true` untuk membuat akun demo saat `NODE_ENV=production` |

Tidak ada secret yang ditanam di kode. `.env.local` masuk `.gitignore`; `.env.example` hanya berisi placeholder.

### Akun demo (hasil `npm run db:seed`)

| Peran | Kredensial |
| --- | --- |
| Guru | `guru@misipintar.test` / `GuruMisi2026!` |
| Siswa | kode `DEMO1234`, PIN `1234` |
| Kode kelas untuk pendaftaran | `MISI5A` |

Seed juga membuat satu percobaan Rani (80%) agar dasbor guru tidak kosong. **Ganti password guru
sebelum deploy** dan jangan aktifkan akun demo di produksi.

---

## 5. Keamanan dan privasi anak

- Tidak meminta nama lengkap, email, tanggal lahir, alamat, atau nomor telepon siswa. Identitas
  siswa = nama tampilan + avatar, ditambah kode akses dan PIN.
- PIN dan password disimpan sebagai hash scrypt (`scrypt$N$r$p$salt$hash`) dengan perbandingan
  `timingSafeEqual`. Login yang gagal tetap menjalankan verifikasi dummy agar waktu respons seragam.
- Sesi: token acak 32 byte; yang disimpan di database hanya hash SHA-256. Cookie `httpOnly`,
  `SameSite=Lax`, `Secure` saat produksi. Logout menghapus baris sesi.
- Otorisasi berlapis:
  1. guard di layout/halaman (`requireStudent`, `requireTeacher`);
  2. pengecekan kepemilikan di `src/server/*` (mis. misi hanya untuk `author_id` guru tersebut);
  3. **Row Level Security** di semua tabel, dengan identitas per transaksi (`app.user_id`, `app.role`).
- Role database aplikasi tidak memiliki tabel dan tidak bisa melewati RLS. Kolom `pin_hash`,
  `password_hash`, dan `email` **tidak** diberikan hak SELECT — sudah diuji menghasilkan
  `permission denied` bila query mencoba membacanya.
- Kunci jawaban & pembahasan tidak pernah dikirim ke browser sebelum siswa menjawab. Payload
  permainan hanya memuat `id, type, prompt, options, hint, difficulty, answerUnit, orderIndex`
  (ada test yang memastikan tidak ada `correctAnswer`/`explanation` di payload).
- Penilaian, skor, dan XP dihitung di server dari `attempt_answers` yang tersimpan; klien tidak
  mengirim skor. Unik `(attempt_id, question_id)` mencegah penggandaan jawaban.
- Riwayat tidak bisa diubah: role aplikasi hanya punya SELECT/INSERT pada `attempt_answers`.
- Rate limit login/pendaftaran 8–12 percobaan per 10 menit per kode (in-memory, per instance —
  lihat batasan).
- Tidak ada analytics, iklan, atau leaderboard publik.

### Yang perlu diketahui sebelum produksi

- **Kunci jawaban dilindungi di lapisan aplikasi, bukan kolom database.** Guru memerlukan
  `correct_answer` untuk mengedit soal, sehingga role aplikasi tetap punya akses baca ke kolom itu.
  Yang dijamin: kunci tidak pernah masuk ke HTML/RSC payload siswa sebelum menjawab.
- Rate limit in-memory hanya efektif pada satu instance; untuk multi-instance gunakan Redis/Upstash
  atau rate limit di edge.
- Belum ada alur "lupa PIN" mandiri; pemulihan dilakukan guru (kode siswa terlihat, PIN diatur ulang).
- Belum ada pembatasan percobaan per menit pada pengiriman jawaban (hanya validasi kepemilikan).

---

## 6. Skema database

`db/migrations/001_schema.sql`:

- `profiles` — `id, role, display_name, avatar_key, email, password_hash, pin_hash, access_code, timestamps`;
  CHECK memastikan guru punya email+password dan siswa punya PIN+kode akses.
- `classes` — `id, teacher_id, name, join_code (unik, 6 karakter), created_at`.
- `class_members` — unik `(class_id, student_id)`.
- `missions` — `slug` unik, cerita, `learning_objectives text[]`, `order_index`, `is_published`, `author_id`, `archived_at`.
- `questions` — tipe (`multiple_choice`/`numeric`), `options jsonb`, `correct_answer`, `explanation`, `hint`,
  `difficulty`, `answer_unit`, `order_index`, `archived_at`.
- `attempts` — skor, jumlah benar/total, XP, `question_ids uuid[]` (soal dibekukan saat mulai), waktu mulai/selesai;
  indeks unik parsial memastikan **satu percobaan berjalan per siswa per misi**.
- `attempt_answers` — unik per `(attempt_id, question_id)`, `is_correct`, `submitted_answer`.
- `user_achievements` — unik `(student_id, achievement_key)`.
- `sessions` — hash token, kedaluwarsa.

Tambahan di luar daftar minimal: `answer_unit` (label satuan input), `question_ids` (agar perubahan
materi tidak mengubah percobaan yang sedang berjalan), `archived_at` (soft delete), `author_id`
(kepemilikan misi), `schema_migrations`.

Penghapusan: kelas → anggota ikut terhapus; misi → soal ikut terhapus tetapi percobaan lama
dipertahankan (FK `attempts.mission_id` cascade, `attempt_answers.question_id` restrict). Karena itu
UI guru memakai **soft delete** (`archived_at`) untuk soal dan misi.

---

## 7. Hasil pengujian

Dijalankan pada mesin ini (lihat `docs/TESTING.md` untuk matriks lengkap 15 skenario wajib):

- `npx tsc --noEmit` — bersih.
- `npx vitest run` — **80 test lulus** (7 file): normalisasi angka, skor/XP, lencana, verifikasi
  aritmetika 30 soal, validasi soal & misi, RLS anonim/siswa/guru, siklus misi lengkap, batas akses guru.
- `npm run build` — sukses, 16 route.
- Uji manual browser (production build):
  - daftar siswa baru → dapat kode akses → dashboard menampilkan hanya misi 1 terbuka;
  - mengerjakan 10 soal Pasar Pintar → semua benar → skor 100, 120 XP, 3 lencana, pembahasan tampil;
  - `/progres` menampilkan 120 XP dan misi 2 terbuka;
  - keluar-masuk kembali, progres tetap ada; percobaan berjalan dilanjutkan dari soal yang belum dijawab;
  - siswa membuka `/guru/dashboard` → dialihkan ke `/belajar`;
  - guru login → dasbor berisi 2 siswa, 2 penyelesaian, rata-rata 90%, soal tersulit;
  - guru menambah soal lewat editor ("Soal ditambahkan", 10 → 11), lalu menghapusnya lewat konfirmasi;
  - guru membuka kelas, melihat kode siswa, membuka laporan siswa dan detail percobaannya;
  - tidak ada overflow horizontal pada lebar 375px di `/`, `/belajar`, `/misi/[slug]`, `/progres`.

---

## 8. Keterbatasan & rencana pengembangan

Belum dikerjakan:

- **Deployment produksi** (butuh akun Vercel/Supabase Anda) — langkahnya ada di `docs/DEPLOYMENT.md`.
- Ilustrasi soal (mis. denah taman) masih mengandalkan teks + emoji; belum ada SVG per soal.
- Belum ada mode gelap, pengaturan font besar, atau terjemahan.
- Belum ada ekspor CSV laporan kelas; belum ada cetak laporan.
- Hanya Matematika, 3 misi, 30 soal (sesuai cakupan MVP).
- Belum ada pengaturan profil siswa di UI (avatar/nama bisa diubah lewat action, form belum dipasang).
- Belum ada test E2E otomatis (Playwright); verifikasi browser dilakukan manual.
- Belum ada ESLint.

Rencana lanjutan yang masuk akal: modul IPA/Bahasa Indonesia, soal bergambar, ekspor laporan,
rate limit terdistribusi, dan test E2E.

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
| `/daftar` | Pendaftaran mandiri: nama panggilan + avatar + PIN; **kode kelas dan tingkat kelas opsional** |
| `/belajar` | Sapaan, XP, peta misi dengan status (terkunci/siap/selesai), lencana, aktivitas terakhir, kartu kode siswa |
| `/misi/[slug]` | Ringkasan misi: cerita, tujuan pembelajaran, jumlah soal, estimasi durasi, hadiah XP |
| `/misi/[slug]/main` | Pengerjaan soal satu per satu, petunjuk, pemeriksaan jawaban, pembahasan, progres tersimpan otomatis |
| `/hasil/[attemptId]` | Skor, XP, lencana yang didapat, soal yang sudah dikuasai, materi yang perlu diulang, pembahasan per soal |
| `/progres` | Total XP, misi selesai, lencana, **peta kemampuan per topik**, nilai terakhir/terbaik per misi, riwayat 30 percobaan terakhir (misi & latihan), tombol lanjutkan/batalkan |
| `/latihan/[attemptId]` | Latihan ulang **hanya soal yang salah** dari satu percobaan; tanpa XP, tanpa membuka misi |
| `/kelas-saya` | **Pilih/ubah tingkat kelas**, gabung kelas dengan kode undangan, daftar kelas + guru + tugasnya, keluar kelas |
| `/profil` | Ubah nama tampilan dan avatar; menampilkan kode siswa; tautan ke Kelas saya |

### Guru

| Halaman | Isi |
| --- | --- |
| `/guru/login` | Autentikasi guru (email + password) |
| `/guru/dashboard` | Jumlah siswa, penyelesaian misi, rata-rata akurasi, siswa aktif 7 hari, aktivitas terbaru, soal dengan tingkat kesalahan tertinggi |
| `/guru/misi` | Daftar misi + **filter tingkat kelas/mata pelajaran**, penanda "belum dikategorikan", status validasi, buat misi baru |
| `/guru/misi/[id]` | Editor misi: metadata kurikulum, **penugasan ke kelas belajar**, terbitkan/tarik, arsipkan, CRUD soal (tambah, ubah, hapus dengan konfirmasi) |
| `/guru/kelas` | Daftar kelas + tingkatnya, kode kelas, buat kelas (tingkat wajib), atur tingkat kelas lama |
| `/guru/kelas/[id]` | Roster siswa (kode siswa, akurasi, aktivitas), atur ulang PIN, keluarkan siswa, hasil per misi (sesuai tingkat), soal tersulit |
| `/guru/siswa/[id]` | Laporan per siswa: riwayat percobaan (bisa dibuka detailnya), materi untuk diulang, lencana |

Aturan main yang diterapkan:

- 10 XP per jawaban benar, bonus 20 XP saat misi selesai — dihitung **server**, bukan dari browser.
- **XP hanya bertambah bila skor percobaan baru melampaui rekor misi itu.** Total XP per misi
  karena itu maksimal 120, sehingga mengulang misi untuk mengumpulkan XP tidak mungkin.
  Percobaan ulang tetap dicatat di riwayat dan tetap bisa memperbaiki skor/nilai terbaik.
- Misi hanya bisa diselesaikan setelah semua soal dijawab.
- Jawaban salah tidak mengurangi XP dan tidak memblokir apa pun.
- Misi 2 terbuka setelah misi 1 selesai, misi 3 setelah misi 2 — tanpa syarat nilai sempurna.
- Mengulang misi membuat percobaan baru; riwayat lama tidak dihapus.
- Lencana: Penjelajah, Bintang Misi (≥80%), Sempurna (100%), Pembelajar Tekun (3 misi), unik per siswa.
- **Latihan soal salah** (`/latihan/...`) tidak memberi XP, tidak memberi lencana, dan tidak membuka
  misi baru; jawabannya tetap tercatat untuk peta kemampuan.
- **Bank soal varian**: satu misi punya 10 slot; setiap slot boleh punya beberapa varian dan satu
  varian dipilih acak saat percobaan dimulai, sehingga soal tidak selalu sama persis.
- **Peta kemampuan** menghitung akurasi per topik (penjumlahan, pecahan, keliling, dst.) dari jawaban
  yang benar-benar dikirim siswa, dengan label "Sudah kuat / Berkembang / Perlu latihan tambahan".

### Belajar mandiri dan keanggotaan kelas

- **Tingkat kelas siswa disimpan di profil** (`profiles.grade_level`). Ini sumber utama konten
  mandiri: siswa yang belum pernah bergabung ke kelas mana pun tetap melihat misi terbit sesuai
  tingkatnya. Tanpa tingkat, peta misi kosong dan halaman Kelas saya meminta memilih tingkat.
- **Kelas belajar opsional.** Siswa bergabung dengan kode undangan di `/kelas-saya`, tanpa membuat
  akun baru. Satu siswa boleh ikut beberapa kelas (`class_members`, unik per `(class_id, student_id)`),
  dan bisa keluar kapan saja tanpa kehilangan akun, progres, atau riwayat.
- **Tugas kelas bersifat privat.** Bila misi ditugaskan ke kelas tertentu (`mission_classes`), hanya
  anggota kelas itu yang melihatnya; siswa bertingkat sama dari kelas lain tidak.
- **Kompatibilitas tingkat ditegakkan**: bergabung ditolak bila tingkat siswa ≠ tingkat kelas. Siswa
  yang belum memilih tingkat mengikuti tingkat kelas yang ia masuki. Guru tidak bisa mengubah tingkat
  kelas bila masih ada anggota bertingkat lain (trigger database).
- **Kode undangan tidak memberi akses lebih**: kode salah tidak membuat keanggotaan, guru tidak bisa
  memakai jalur siswa, dan 8 percobaan kode salah per 10 menit per siswa dibatasi
  (`class_join_attempts`, hanya lewat fungsi `SECURITY DEFINER`).
- **Login tidak lagi membutuhkan kelas**: kode siswa + PIN dicari dari profil, bukan dari keanggotaan
  kelas, sehingga akun mandiri bisa masuk.

### Tingkat kelas vs kelas belajar

Dua konsep ini sengaja dipisahkan:

| Konsep | Contoh | Disimpan di |
| --- | --- | --- |
| **Tingkat kelas** | Kelas 1–6 SD | `missions.grade_level`, `classes.grade_level`, `profiles.grade_level` (smallint 1–6) |
| **Kelas belajar** | "5A - Matematika", "5B - Matematika" | tabel `classes` (dikelola guru per kelompok) |

Setiap misi wajib punya **tingkat kelas + mata pelajaran + topik** sebelum boleh terbit
(`subjects` dan `mission_topics` adalah tabel referensi). Soal tidak menyimpan tingkat kelas —
kategorinya diturunkan dari misi, sehingga tidak ada duplikasi data.

Aturan akses siswa:

- Misi hanya tampil bila **terbit**, **sudah punya tingkat kelas**, dan tingkat itu sama dengan
  tingkat profil siswa **atau** tingkat salah satu kelas belajarnya.
- **Penugasan opsional** (`mission_classes`, many-to-many, tanpa menyalin misi): bila misi ditugaskan
  ke kelas tertentu, hanya kelas itu yang melihatnya; bila belum ditugaskan, semua kelas pada tingkat
  yang sama melihatnya. Tingkat misi dan kelas penerima wajib sama — dijaga trigger database,
  bukan hanya UI.
- Misi **draf** tidak pernah tampil ke siswa.
- Urutan pembukaan misi dihitung **per (tingkat kelas, mata pelajaran)**, jadi misi Kelas 2 tidak
  mengunci misi Kelas 5.
- Misi lama tanpa tingkat kelas **tidak** diberi kategori otomatis; guru mengategorikannya lewat
  `/guru/misi` (filter "Belum dikategorikan") atau `npm run db:audit-kurikulum` untuk melihat daftarnya.
- Riwayat percobaan tetap terbaca walau misi kemudian dipindah tingkat (soal misi yang pernah
  dikerjakan siswa tetap boleh dibaca oleh siswa itu).

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
| `npm run db:cleanup` | Hapus percobaan terbengkalai (belum selesai, tanpa jawaban, > 7 hari); `-- --days=30` untuk ambang lain |
| `npm run db:audit-kurikulum` | Daftar misi & kelas yang belum punya tingkat kelas (perlu kategorisasi manual) |
| `npm run typecheck` | TypeScript strict tanpa emisi |
| `npm run test:http` | Smoke test HTTP (routing, guard anonim, akses per peran); arahkan `APP_URL` ke hasil deployment |
| `npm test` | 153 test Vitest (butuh database uji, lihat `docs/TESTING.md`) |
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

Seed juga membuat satu percobaan Rani (80%) agar dasbor guru tidak kosong. **Di produksi seed
menolak berjalan** bila `SEED_TEACHER_EMAIL`/`SEED_TEACHER_PASSWORD` belum diisi atau passwordnya
masih password demo (kurang dari 12 karakter). Jangan aktifkan akun demo siswa di produksi.

---

## 5. Keamanan dan privasi anak

- Tidak meminta nama lengkap, email, tanggal lahir, alamat, atau nomor telepon siswa. Identitas
  siswa = nama tampilan + avatar, ditambah kode akses dan PIN. Data tambahan satu-satunya adalah
  **tingkat kelas** (1–6) karena dibutuhkan untuk memilihkan misi; boleh dikosongkan saat mendaftar.
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
  lihat batasan). Gabung kelas dibatasi dua lapis: in-memory per siswa dan **8 kegagalan kode per
  10 menit** di database (`class_join_attempts`, ditulis hanya lewat fungsi `SECURITY DEFINER`).
- Siswa hanya bisa membaca profilnya sendiri dan profil **guru kelasnya**. Daftar anggota kelas,
  tugas kelas lain, dan profil siswa lain tidak terbaca lewat RLS.
- Tidak ada analytics, iklan, atau leaderboard publik.
- Header keamanan: `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`,
  dan `Content-Security-Policy` (produksi, `default-src 'self'`). Middleware hanya memeriksa
  keberadaan cookie sesi; keabsahan sesi dan hak akses tetap diverifikasi di server + RLS.

### Tinjauan risiko: tingkat kelas & kode undangan

Ditinjau pada tahap validasi, tanpa mengubah fitur:

| Area | Temuan yang diverifikasi | Risiko sisa | Rekomendasi |
| --- | --- | --- | --- |
| Ubah tingkat sendiri | Tugas privat terikat pada keanggotaan + tingkat **kelas**, bukan tingkat profil; ubah tingkat tidak membuka tugas kelas lain (test 36–37); RLS menolak ubah tingkat siswa lain (test 39) | Siswa bisa menyatakan tingkat lain untuk membuka **misi publik** tingkat itu | Kunci tingkat bila sudah punya kelas, atau tampilkan perubahannya di roster guru |
| Kode undangan | 6 karakter × 32 simbol ≈ 30 bit; rotasi oleh guru membatalkan kode lama (test 40–41); 8 kegagalan/10 menit per siswa disimpan di database + rate limit sesi | Belum ada batas per IP/edge, belum kedaluwarsa, `class_join_attempts` belum dibersihkan | Rate limit di edge → masa berlaku kode → job pembersihan |

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

- `profiles` — `id, role, display_name, avatar_key, grade_level, email, password_hash, pin_hash,
  access_code, timestamps`; CHECK memastikan guru punya email+password dan siswa punya PIN+kode akses
  (guru tidak boleh punya `grade_level`).
- `classes` — `id, teacher_id, name, join_code (unik, 6 karakter), grade_level (1-6, NULL = belum diatur), created_at`.
- `class_members` — unik `(class_id, student_id)`.
- `missions` — `slug` unik, cerita, `learning_objectives text[]`, `order_index`, `is_published`, `author_id`,
  `archived_at`, `grade_level` (1-6, NULL = belum dikategorikan), `subject_slug` → `subjects`,
  `topic_slug` + `subject_slug` → `mission_topics` (FK komposit memastikan topik milik mapel yang sama).
- `subjects` — referensi mata pelajaran (`slug`, `label`, `order_index`); `mission_topics` — referensi
  topik per mapel. Keduanya hanya diubah lewat migrasi, dibaca semua pengguna aplikasi.
- `mission_classes` — penugasan misi → kelas belajar (`mission_id`, `class_id`, `assigned_by`, `assigned_at`;
  PK gabungan). Trigger `mission_classes_grade_guard` menolak penugasan bila tingkat misi ≠ tingkat kelas
  atau salah satunya belum diatur.
- `questions` — tipe (`multiple_choice`/`numeric`), `options jsonb`, `correct_answer`, `explanation`, `hint`,
  `difficulty`, `answer_unit`, `topic`, `slot_index`, `variant_index`, `order_index`, `archived_at`.
  Indeks unik parsial `(mission_id, slot_index, variant_index)` mencegah varian kembar.
- `attempts` — skor, jumlah benar/total, XP, `question_ids uuid[]` (soal dibekukan saat mulai),
  `mode` (`mission`/`practice`), `source_attempt_id`, waktu mulai/selesai;
  indeks unik parsial memastikan **satu percobaan misi berjalan per siswa per misi** (latihan bebas).
- `attempt_answers` — unik per `(attempt_id, question_id)`, `is_correct`, `submitted_answer`.
- `user_achievements` — unik `(student_id, achievement_key)`.
- `sessions` — hash token, kedaluwarsa.

Tambahan di luar daftar minimal: `answer_unit` (label satuan input), `question_ids` (agar perubahan
materi tidak mengubah percobaan yang sedang berjalan), `archived_at` (soft delete), `author_id`
(kepemilikan misi), `topic`/`slot_index`/`variant_index` (peta kemampuan + bank varian),
`mode`/`source_attempt_id` (latihan tanpa XP), `grade_level`/`subject_slug`/`topic_slug` +
`mission_classes` (pemisahan konten per tingkat), `profiles.grade_level` (tingkat siswa untuk belajar
mandiri), `class_join_attempts` (pembatas penebakan kode undangan; hanya lewat fungsi definer),
`schema_migrations`.

Penghapusan: kelas → anggota ikut terhapus; misi → soal ikut terhapus tetapi percobaan lama
dipertahankan (FK `attempts.mission_id` cascade, `attempt_answers.question_id` restrict). Karena itu
UI guru memakai **soft delete** (`archived_at`) untuk soal dan misi.

---

## 7. Hasil pengujian

Dijalankan pada mesin ini (lihat `docs/TESTING.md` untuk matriks lengkap skenario wajib):

- `npm run typecheck` — bersih (0 error).
- `npm test` (vitest) — **153 test lulus, 0 gagal** (11 file): normalisasi angka, skor/XP, lencana, verifikasi
  aritmetika 30 soal, keseimbangan posisi jawaban, validasi soal & misi, RLS anonim/siswa/guru,
  siklus misi lengkap, aturan XP anti-farming, syarat penyelesaian, pembatalan percobaan,
  resume setelah semua soal dijawab, bank soal varian, latihan tanpa XP, peta kemampuan per topik,
  validasi terbit per slot, pemisahan konten per tingkat kelas (filter guru, isolasi soal, penugasan
  kelas, akses siswa, riwayat lama, RLS), pendaftaran tanpa kelas, konten mandiri per tingkat, gabung
  kelas via kode (ganda, lintas tingkat, pembatasan percobaan), isolasi data antar anggota, kewenangan
  guru, perubahan tingkat siswa vs tugas privat, rotasi kode undangan, dan konfigurasi seed.
- `npm run test:http` — **20/20 pemeriksaan HTTP lulus** terhadap `next start` lokal (port 3100):
  4 guard anonim (`/belajar`, `/latihan`, `/kelas-saya`, `/guru/dashboard`), 404 halaman tak dikenal,
  akses siswa (`/belajar`, `/progres`, `/profil`, `/kelas-saya`, isi halaman Kelas saya), akses guru
  (dasbor + `/guru/misi`), dan penolakan lintas peran.
- `npm run build` — sukses, 18 route aplikasi (+ `_not-found`).
- Uji manual browser (production build):
  - daftar siswa baru tanpa kode kelas → diarahkan ke `/kelas-saya`, kode akses tampil di banner,
    daftar kelas kosong, tingkat "belum dipilih";
  - memilih Kelas 4 SD → `/belajar` menampilkan "Belum ada misi terbit untuk Kelas 4 SD";
  - mencoba gabung "Kelas 5A - Matematika" saat tingkat 4 → ditolak dengan pesan tingkat berbeda;
  - menaikkan tingkat ke 5 → gabung MISI5A → tampil "Kamu bergabung ke Kelas 5A - Matematika
    (guru: Bu Sari)", daftar kelas berisi guru, tingkat, dan tugas "Pasar Pintar";
  - peta misi menampilkan 3 misi Kelas 5 walau belum punya kelas (sebelum bergabung);
  - gabung ulang kode yang sama → "Kamu sudah menjadi anggota kelas ini." (tanpa baris ganda);
  - keluar kelas → tetap tingkat 5 SD, daftar kelas kosong, progres dan riwayat tidak berubah;
  - roster guru menampilkan "Kelas 5 SD" di bawah nama siswa;
  - daftar siswa baru → dapat kode akses → dashboard menampilkan hanya misi 1 terbuka;
  - mengerjakan 10 soal Pasar Pintar → semua benar → skor 100, 120 XP, 3 lencana, pembahasan tampil;
  - `/progres` menampilkan 120 XP dan misi 2 terbuka;
  - keluar-masuk kembali, progres tetap ada; percobaan berjalan dilanjutkan dari soal yang belum dijawab;
  - siswa membuka `/guru/dashboard` → dialihkan ke `/belajar`;
  - guru login → dasbor berisi 2 siswa, 2 penyelesaian, rata-rata 90%, soal tersulit;
  - guru menambah soal lewat editor ("Soal ditambahkan", 10 → 11), lalu menghapusnya lewat konfirmasi;
  - guru membuka kelas, melihat kode siswa, membuka laporan siswa dan detail percobaannya;
  - percobaan yang ditinggalkan tampil sebagai "Sedang dikerjakan" di `/progres` dengan tombol
    "Lanjutkan" dan "Batalkan" (konfirmasi dua langkah);
  - siswa dapat mengganti nama tampilan/avatar di `/profil` dan header langsung berubah;
  - `npm run test:http` lulus 17/17 pemeriksaan (guard anonim 307, data lintas peran tidak bocor);
  - `/progres` menampilkan peta kemampuan per topik dari jawaban nyata (mis. "Penjumlahan &
    pengurangan 7/8 · 88% · Sudah kuat");
  - menyelesaikan misi dengan 8 jawaban salah menawarkan "Latih 8 soal ini saja" → halaman latihan
    hanya berisi 8 soal itu → halaman hasil berlabel "Latihan selesai" tanpa kartu XP, XP total
    tetap 240, dan riwayat menandai baris itu sebagai "Latihan" dengan XP "—";
  - editor misi guru menampilkan "10 soal per percobaan · 12 soal tersimpan" dengan badge
    "Slot 1 · varian 2", serta field Topik dan Slot pada formulir soal;
  - guru melihat banner "1 misi belum punya tingkat kelas" (data lama), memfilter daftar misi
    Kelas 5 SD (3 misi) dan Kelas 2 SD (0 misi sebelum dikategorikan);
  - misi lama "Jalanan Ramai" dikategorikan lewat form menjadi Kelas 2 SD · Matematika ·
    Operasi bilangan bulat; setelah itu muncul di filter Kelas 2 dan hanya kelas tingkat 2 yang
    bisa ditugaskan (2A - Matematika);
  - siswa baru "Bayu" yang mendaftar dengan kode kelas 2A hanya melihat 1 misi (Jalanan Ramai),
    sedangkan Rani (Kelas 5) melihat 3 misi Kelas 5 dan tidak melihat kartu Jalanan Ramai;
  - akses langsung `/misi/jalanan-ramai` oleh Rani menghasilkan halaman "tidak ditemukan";
  - tidak ada overflow horizontal pada lebar 375px di `/`, `/belajar`, `/misi/[slug]`, `/progres`;
  - mengulang misi yang sudah 100% (10/10) hanya menambah 20 XP — dari 100 ke 120, batas maksimal
    misi itu — dan halaman hasil menjelaskan alasannya secara eksplisit.

Catatan: seluruh angka di atas adalah **hasil eksekusi aktual** pada commit ini, bukan target. Bila
dijalankan di mesin lain, jalankan keempat gate (`typecheck`, `test`, `build`, `test:http`) dan
bandingkan hasilnya; lulusnya build/smoke tidak dengan sendirinya berarti aplikasi "aman".

---

## 8. Keterbatasan & rencana pengembangan

Belum dikerjakan:

- **Deployment produksi** (butuh akun Vercel/Supabase Anda) — langkahnya ada di `docs/DEPLOYMENT.md`.
- Ilustrasi soal (mis. denah taman) masih mengandalkan teks + emoji; belum ada SVG per soal.
- Belum ada mode gelap, pengaturan font besar, atau terjemahan.
- Belum ada ekspor CSV laporan kelas; belum ada cetak laporan.
- Hanya Matematika, 3 misi, 30 soal inti + 6 varian (2 varian di 2 slot per misi). Menambah varian
  untuk semua slot adalah pekerjaan konten, bukan perubahan kode.
- Peta kemampuan memakai akurasi mentah per topik; belum memperhitungkan tingkat kesulitan soal.
- Kategori kurikulum (mata pelajaran/topik) masih statis lewat migrasi; belum ada CRUD referensi di UI.
- **Perubahan tingkat kelas oleh siswa** belum dibatasi atau memerlukan persetujuan guru. Yang sudah
  diverifikasi: mengubah tingkat sendiri **tidak** membuka tugas privat kelas lain (tugas privat terikat
  pada keanggotaan + tingkat kelas, bukan tingkat profil), dan siswa tidak bisa mengubah tingkat siswa
  lain (RLS). Risiko yang tersisa: siswa dapat menyatakan tingkat lebih tinggi/rendah untuk membuka
  **misi publik** tingkat lain. Rekomendasi: kunci tingkat bila siswa sudah tergabung di kelas, atau
  tampilkan perubahan tingkat di roster guru.
- **Kode undangan** 6 karakter dari 32 simbol (≈30 bit) dan tidak kedaluwarsa. Yang sudah ada: rotasi
  oleh guru (kode lama langsung tidak berlaku — diuji), pembatasan 8 kegagalan per 10 menit per siswa
  di database, dan rate limit in-memory per sesi. Belum ada: pembatasan per IP/edge, masa berlaku, dan
  pembersihan berkala `class_join_attempts`. Rekomendasi prioritas: rate limit kode di lapisan edge,
  lalu masa berlaku kode, lalu job pembersihan.
- Misi/kelas yang belum dikategorikan harus dirapikan manual — lihat `npm run db:audit-kurikulum`.
  Selama belum dirapikan, misi tersebut tidak tampil ke siswa (pilihan aman).
- Belum ada test E2E otomatis (Playwright); verifikasi browser dilakukan manual.
- Belum ada ESLint.

Rencana lanjutan yang masuk akal: modul IPA/Bahasa Indonesia, soal bergambar, ekspor laporan,
rate limit terdistribusi, dan test E2E.

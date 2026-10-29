# Deployment (Supabase + Vercel)

Dokumen ini menjelaskan cara menaikkan Misi Pintar ke produksi. Semua langkah sudah diuji di
lingkungan lokal dengan PostgreSQL 18; bagian yang belum dijalankan adalah pendaftaran akun
Supabase/Vercel (butuh akun pemilik proyek).

Prinsip penting:

- Runtime aplikasi memakai role database **terbatas** (`misi_app`) agar Row Level Security berlaku.
- `ADMIN_DATABASE_URL` (owner/service) **hanya** untuk migrasi & seed, tidak pernah dipasang di Vercel.
- Tidak ada service-role key Supabase yang dipakai aplikasi, karena autentikasi ditangani sendiri.

---

## 1. Siapkan Supabase

1. Buat proyek baru di [supabase.com](https://supabase.com) (region terdekat, mis. Singapore).
2. Catat dua connection string dari **Project Settings → Database**:
   - **Direct connection** (`db.<ref>.supabase.co:5432`) → untuk migrasi/seed.
   - **Connection pooling / Transaction mode** (`aws-0-<region>.pooler.supabase.com:6543`) →
     untuk runtime aplikasi.
3. Buat role aplikasi (jalankan di SQL Editor, ganti password):

```sql
create role misi_app login password 'GANTI-DENGAN-PASSWORD-PANJANG' nosuperuser nobypassrls;
```

Role ini sengaja **bukan** owner dan tidak punya `bypassrls`, sehingga policy RLS berlaku penuh.

## 2. Jalankan migrasi

Dari mesin yang punya akses jaringan ke database:

```bash
export ADMIN_DATABASE_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres"
export DATABASE_URL="postgresql://misi_app.<ref>:<password-role>@aws-0-<region>.pooler.supabase.com:6543/postgres"
npm run db:migrate
```

Urutan file penting: `005_grants.sql` memberi hak ke `misi_app`, jadi role harus sudah dibuat
sebelum migrasi dijalankan.

> Catatan: `pgcrypto` tidak dibutuhkan — `gen_random_uuid()` tersedia bawaan di PostgreSQL 13+.

## 3. Seed konten

```bash
export ADMIN_DATABASE_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres"
export SEED_TEACHER_EMAIL="guru@sekolahanda.sch.id"
export SEED_TEACHER_PASSWORD="<password-kuat>"
export SEED_DEMO_ACCOUNTS=false     # jangan buat akun demo di produksi
npm run db:seed
```

`SEED_TEACHER_EMAIL` dan `SEED_TEACHER_PASSWORD` **wajib** diisi saat `NODE_ENV=production`;
seed akan berhenti dengan pesan jelas bila masih memakai password demo (kurang dari 12 karakter).
Alternatif yang lebih aman: buat akun guru langsung di SQL Editor dengan hash dari `hashSecret`
di `src/lib/password.ts`, lalu jalankan seed tanpa akun guru.

## 4. Deploy ke Vercel

1. Push repository ke GitHub, lalu **Import Project** di Vercel (framework: Next.js, tanpa konfigurasi tambahan).
2. Tambahkan environment variables berikut untuk Production (dan Preview bila perlu):

| Name | Value |
| --- | --- |
| `DATABASE_URL` | connection string pooler + role `misi_app` |
| `APP_URL` | `https://<domain-anda>` |
| `DATABASE_POOL_SIZE` | `3` (serverless: koneksi per instance harus kecil) |

**Jangan** menambahkan `ADMIN_DATABASE_URL`, `SEED_TEACHER_PASSWORD`, atau service-role key.

3. Deploy. Build command bawaan (`npm run build`) sudah cukup; tidak ada step migrasi otomatis —
   jalankan migrasi dari langkah 2 setiap kali ada file baru di `db/migrations`.

### Catatan kompatibilitas

- `withViewer()` selalu membungkus query dalam satu transaksi dan memakai
  `set_config('app.user_id', ..., true)` (transaction-local), sehingga tetap benar pada pooler
  mode *transaction*.
- Pool `pg` dibuat sekali per instance (`globalThis.__misiPool`), cocok untuk serverless.

## 5. Smoke test setelah deploy

Lakukan berurutan dan bandingkan dengan hasil lokal:

1. Buka `/` — semua misi demo tampil (30 misi), tanpa error konsol.
2. Daftar siswa baru di `/daftar` (kode kelas opsional; tanpa kode → pilih tingkat di `/kelas-saya`)
   → kode siswa muncul di dashboard. Kode kelas bisa dimasukkan belakangan lewat "Gabung kelas".
3. Kerjakan satu misi sampai selesai → skor, XP, lencana, dan pembahasan muncul.
4. Muat ulang `/progres` → XP dan riwayat tetap ada.
5. Buka `/guru/login`, masuk → dasbor menampilkan siswa tadi.
6. Sebagai siswa (browser lain/incognito), buka `/guru/dashboard` → dialihkan ke `/belajar`.
7. Buat soal baru di editor misi, lalu terbitkan/tarik misi.
8. Cek log Vercel: tidak ada `permission denied` pada tabel yang seharusnya boleh diakses.

## 6. Rollback

- Kode: gunakan **Instant Rollback** di Vercel.
- Database: migrasi bersifat aditif. Bila perlu mundur, pulihkan dari backup Supabase
  (Project Settings → Database → Backups) sebelum menghapus kolom apa pun.

---

## Alternatif: Docker/PostgreSQL mandiri

```bash
docker run --name misi-pg -e POSTGRES_PASSWORD=postgres -p 5433:5432 -d postgres:18
psql "postgresql://postgres:postgres@127.0.0.1:5433/postgres" \
  -c "create database misi_pintar;" \
  -c "create database misi_pintar_test;" \
  -c "create role misi_app login password 'misi_app_dev' nosuperuser nobypassrls;"
```

Lalu `ADMIN_DATABASE_URL`/`DATABASE_URL` diarahkan ke port 5433 dan `npm run db:migrate && npm run db:seed`.

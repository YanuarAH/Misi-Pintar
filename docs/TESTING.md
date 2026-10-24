# Pengujian

## Cara menjalankan

```bash
# 1) Database uji (dibuat sekali)
psql "postgresql://postgres@127.0.0.1:5433/postgres" \
  -c "create database misi_pintar_test;"
# role misi_app harus sudah ada (lihat README)

# 2) Jalankan
npm test          # vitest, termasuk migrasi bersih ke database uji
npm run typecheck
npm run build
```

Default koneksi uji ada di `vitest.config.mts`:

```
postgres://misi_app:misi_app_dev@127.0.0.1:5433/misi_pintar_test
postgres://postgres@127.0.0.1:5433/misi_pintar_test
```

Bisa dioverride dengan `TEST_DATABASE_URL` dan `TEST_ADMIN_DATABASE_URL`.

`tests/globalSetup.ts` melakukan `drop schema public cascade` lalu menjalankan semua migrasi, dan
setiap file uji memanggil `resetData()` sehingga tidak saling mengganggu. **Jangan arahkan variabel
uji ke database pengembangan atau produksi.**

## Hasil terakhir

```
npx vitest run
Test Files  9 passed (9)
Tests       106 passed (106)
```

## Matriks 15 skenario wajib

| # | Skenario | Diuji oleh |
| --- | --- | --- |
| 1 | Siswa bisa masuk dengan mekanisme akun | Manual browser (kode `DEMO1234`/PIN) + `tests/mission-flow.test.ts` (alur sesi memakai viewer siswa); login scrypt diuji lewat `verifySecret` |
| 2 | Siswa tidak bisa membuka halaman guru | Manual browser: `/guru/dashboard` → redirect `/belajar`; guard `requireTeacher` + `tests/rls.test.ts` (tanpa policy guru, data 0) |
| 3 | Guru tidak bisa mengakses kelas guru lain | `tests/teacher-access.test.ts`: `getClassDetail`, `getStudentReport`, `getAttemptResult`, `getMissionForEdit`, `resetStudentPin` semuanya menolak; `tests/rls.test.ts`: kelas & attempt tidak terlihat |
| 4 | Siswa dapat memulai & menyelesaikan misi | `tests/mission-flow.test.ts` (start → jawab → complete) + uji browser 10 soal |
| 5 | Jawaban benar dihitung benar | `tests/mission-flow.test.ts` (`isCorrect`, `correct_count`, `score`) |
| 6 | Jawaban salah tidak memberi XP jawaban benar | `tests/mission-flow.test.ts` (salah → `xp_earned` tetap 0; benar 2 dari 3 → 40 XP) |
| 7 | Normalisasi jawaban angka tepat | `tests/normalize.test.ts` (25.500 / Rp 25.500 / 1,5 / 3/4 / penolakan "25rb") + uji browser mengetik `25.500` |
| 8 | Bonus misi hanya sekali per percobaan; XP tidak bisa difarming dengan mengulang | `tests/mission-flow.test.ts` ("penyelesaian ganda tidak menambah XP lagi", "XP hanya bertambah ketika rekor skor membaik", "percobaan ulang dengan skor lebih rendah tidak mengurangi XP") |
| 8b | Misi tidak bisa diselesaikan sebelum semua soal dijawab | `tests/mission-flow.test.ts` ("menolak menyelesaikan misi bila masih ada soal yang belum dijawab") |
| 8c | Seed produksi menolak kredensial default | `tests/seed-config.test.ts` |
| 8d | Percobaan terbengkalai bisa dibatalkan, percobaan selesai tidak | `tests/mission-flow.test.ts` (describe "pembatalan percobaan") |
| 8e | Refresh setelah semua soal dijawab langsung menawarkan hasil | `tests/mission-flow.test.ts` ("resume setelah semua soal dijawab ditandai allAnswered") |
| 9 | Pengulangan misi tidak menghapus histori | `tests/mission-flow.test.ts` ("mengulang misi membuat percobaan baru…", dua baris attempts) |
| 10 | Misi kedua terbuka setelah misi pertama selesai | `tests/mission-flow.test.ts` (terkunci → selesai → terbuka) + `/progres` di browser |
| 11 | Perubahan materi tidak merusak riwayat | `tests/mission-flow.test.ts` (soal diarsipkan, hasil lama tetap 3 jawaban) + `teacher-access.test.ts` (soft delete) |
| 12 | Soal tidak bisa terbit bila tidak valid | `tests/teacher-access.test.ts` (misi tanpa soal, jawaban di luar pilihan) + `tests/validation.test.ts` |
| 13 | Siswa tidak bisa membaca jawaban sebelum menjawab | `tests/mission-flow.test.ts` (payload tanpa `correctAnswer`/`explanation`) |
| 14 | Progres bertahan setelah sesi ditutup | Uji browser: logout → login → `/progres` tetap 120 XP; percobaan berjalan dilanjutkan (`startIndex` dari jawaban tersimpan) |
| 15 | Tidak ada kebocoran kredensial/data pribadi | `tests/rls.test.ts` (`pin_hash`/`email` → `permission denied`), `sessions` tidak bisa dibaca role aplikasi, payload tanpa data siswa lain |
| 16 | Bank soal varian: satu soal per slot, varian dipilih acak | `tests/topics-practice.test.ts` (describe "bank soal varian") |
| 17 | Latihan soal salah tanpa XP/lencana dan tidak menambah penyelesaian | `tests/topics-practice.test.ts` (describe "latihan soal yang salah") |
| 18 | Peta kemampuan per topik akurat dan hanya untuk siswa berhak | `tests/topics-practice.test.ts` (describe "peta kemampuan per topik") |
| 19 | Guru bisa menambah varian/memindahkan slot; terbit butuh tiap slot valid | `tests/topics-practice.test.ts` (describe "guru mengelola slot dan topik", "validasi terbit per slot") |

## Cakupan per file

| File | Isi |
| --- | --- |
| `tests/normalize.test.ts` | Normalisasi angka Indonesia, pecahan, penolakan input ambigu, perbandingan pilihan ganda |
| `tests/scoring.test.ts` | Skor, XP (10/benar + 20 bonus), label akurasi, aturan lencana |
| `tests/content.test.ts` | 3 misi × 10 soal; struktur, pilihan unik, jawaban ∈ pilihan; **menghitung ulang ekspresi aritmetika dengan rasional eksak**; keseimbangan posisi jawaban PG; 6 soal varian (slot, topik, aritmetika) |
| `tests/seed-config.test.ts` | Aturan kredensial seed: default hanya untuk non-produksi, tolak password demo/pendek |
| `tests/validation.test.ts` | Skema Zod soal/misi/pendaftaran + `questionIssues()` |
| `tests/rls.test.ts` | RLS untuk anonim, siswa, guru; larangan menulis lintas pengguna; kolom sensitif tidak terbaca |
| `tests/mission-flow.test.ts` | Siklus hidup percobaan, grading, XP, lencana, unlock, resume, idempotensi, imutabilitas |
| `tests/teacher-access.test.ts` | Batas antar guru, validasi terbit, soft delete, ringkasan dasbor |
| `tests/topics-practice.test.ts` | Pemilihan satu varian per slot, latihan dari soal salah (tanpa XP/lencana), isolasi latihan antarsiswa, peta kemampuan per topik, CRUD slot/topik guru, validasi terbit per slot |

## Uji manual yang sudah dijalankan

Production build (`npm run build && npm start`, port 3100), browser sungguhan:

1. Landing menampilkan 3 misi dari database.
2. Pendaftaran siswa baru (kode kelas `MISI5A`) → kode akses tampil di dashboard.
3. Misi 1: 10 soal dijawab benar → 100 skor, 120 XP, lencana Penjelajah/Bintang Misi/Sempurna.
4. `/progres`: 120 XP, misi 2 terbuka, riwayat tercatat.
5. Keluar → masuk lagi → progres tetap.
6. Menjawab satu soal lalu keluar dan kembali: muncul "1 soal sudah dijawab" dan melanjutkan dari soal berikutnya.
7. Siswa membuka `/guru/dashboard` → dialihkan.
8. Guru: login, dasbor (2 siswa, 2 penyelesaian, 90% rata-rata, soal tersulit), tambah soal ("Soal ditambahkan", 10 → 11), hapus dengan konfirmasi (kembali 10), buka kelas, buka laporan siswa, buka detail percobaan siswa.
9. Cek responsif 375 px pada `/`, `/belajar`, `/misi/[slug]`, `/progres`: tidak ada scroll horizontal.
10. Render GET pada `/misi/[slug]/main` tidak lagi membuat percobaan kosong (diverifikasi lewat hitungan baris `attempts` sebelum/sesudah).

## Smoke test HTTP

```bash
npm run build && npm start          # terminal lain
npm run test:http                   # default http://localhost:3000
APP_URL=https://domain-anda npm run test:http
```

Script `scripts/smoke.ts` membuat sesi sementara langsung di database (tanpa menyimpan password),
lalu memeriksa: halaman publik 200, guard anonim mengembalikan 307, area siswa/guru dapat dibuka
oleh peran yang tepat, dan data peran lain tidak ikut terkirim. Hasil terakhir: **17/17 lulus** (termasuk guard `/latihan` untuk pengguna anonim dan 404 untuk
latihan milik siswa lain).

## Belum tercakup otomatis

- Login/logout lewat HTTP (butuh driver browser): saat ini diverifikasi manual.
- Test E2E Playwright belum ada.
- Rate limit hanya diuji secara manual/logika, belum ada test waktu.

-- Kolom tingkat kelas siswa dibaca aplikasi (roster guru, profil sendiri), jadi perlu
-- grant kolom. Hash PIN/password tetap tidak pernah bisa dibaca lewat koneksi aplikasi.

grant select (grade_level) on public.profiles to misi_app;

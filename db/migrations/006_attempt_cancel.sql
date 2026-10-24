-- Siswa boleh membatalkan percobaannya sendiri yang belum selesai.
-- Percobaan yang sudah selesai tetap permanen (tidak ada policy delete untuk itu),
-- sehingga riwayat belajar dan hasil guru tidak bisa dihapus dari aplikasi.

create policy attempts_delete_own_open on public.attempts for delete
  using (student_id = public.app_user_id() and completed_at is null);

comment on policy attempts_delete_own_open on public.attempts is
  'Siswa hanya dapat menghapus percobaannya yang masih berjalan (belum selesai).';

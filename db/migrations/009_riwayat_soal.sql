-- Riwayat belajar harus tetap terbaca walau kategori misi berubah.
--
-- Sebelumnya, memindahkan misi ke tingkat kelas lain membuat siswa lama kehilangan
-- pembahasan soal pada hasil percobaannya, karena soal misi itu tidak lagi "readable"
-- untuknya. Sekarang soal tetap terbaca bila siswa pernah mengerjakan misi tersebut
-- (hanya untuk misi yang ia kerjakan sendiri), sehingga laporan lama tidak hilang.
--
-- Ini tidak membuka misi baru: `app_mission_available` (dipakai untuk daftar misi dan
-- memulai percobaan) tetap mensyaratkan tingkat kelas yang cocok dan penugasan kelas.

create or replace function public.app_mission_readable(p_mission uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from missions m
    where m.id = p_mission
      and m.archived_at is null
      and (
        m.author_id = public.app_user_id()
        or (
          m.is_published
          and (public.app_role_name() <> 'student' or public.app_mission_available(m.id))
        )
        or exists (
          select 1 from attempts a
          where a.mission_id = m.id and a.student_id = public.app_user_id()
        )
      )
  )
$$;

comment on function public.app_mission_readable(uuid) is
  'Guru: misi miliknya. Siswa: misi yang boleh dilihat, atau misi yang pernah ia kerjakan (riwayat).';

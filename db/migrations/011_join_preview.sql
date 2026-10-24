-- Pratinjau kelas dari kode undangan untuk formulir pendaftaran (sebelum akun dibuat).
-- Dipakai agar siswa melihat nama/tingkat kelas dan pesan kesalahannya jelas; tidak
-- membuka daftar anggota atau data lain.

create or replace function public.app_class_join_preview(p_code text)
returns table (id uuid, name text, grade_level smallint, teacher_name text)
language sql stable security definer set search_path = public, pg_temp
as $$
  select c.id, c.name, c.grade_level, t.display_name
  from classes c
  join profiles t on t.id = c.teacher_id
  where c.join_code = upper(btrim(p_code))
  limit 1
$$;

grant execute on function public.app_class_join_preview(text) to misi_app;

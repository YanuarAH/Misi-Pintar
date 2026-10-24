-- Perbaikan hasil uji:
--  1. `on conflict (class_id, student_id)` bentrok dengan nama kolom keluaran fungsi
--     (`class_id`), sehingga gabung kelas gagal dengan "column reference is ambiguous".
--     Diganti memakai nama constraint.
--  2. Siswa perlu melihat nama guru dari kelas yang ia ikuti di halaman "Kelas saya".
--     Policy lama hanya mengizinkan diri sendiri atau guru yang mengelola siswa.

create or replace function public.app_join_class(p_code text)
returns table (
  status       text,
  class_id     uuid,
  class_name   text,
  teacher_name text,
  grade_level  smallint
)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_code      text := upper(btrim(coalesce(p_code, '')));
  v_student   uuid := public.app_user_id();
  v_student_grade smallint;
  v_failures  integer;
  v_class     record;
begin
  if v_student is null or public.app_role_name() <> 'student' then
    return query select 'BUKAN_SISWA'::text, null::uuid, null::text, null::text, null::smallint;
    return;
  end if;

  select count(*) into v_failures
  from class_join_attempts a
  where a.student_id = v_student
    and a.status <> 'BERHASIL'
    and a.attempted_at > now() - interval '10 minutes';

  if v_failures >= 8 then
    insert into class_join_attempts (student_id, code, status)
    values (v_student, v_code, 'DIBATASI');
    return query select 'TERLALU_BANYAK_PERCOBAAN'::text, null::uuid, null::text, null::text, null::smallint;
    return;
  end if;

  select c.id, c.name, c.grade_level, t.display_name as teacher_name
    into v_class
  from classes c
  join profiles t on t.id = c.teacher_id
  where c.join_code = v_code;

  if v_class.id is null then
    insert into class_join_attempts (student_id, code, status)
    values (v_student, v_code, 'KODE_TIDAK_DITEMUKAN');
    return query select 'KODE_TIDAK_DITEMUKAN'::text, null::uuid, null::text, null::text, null::smallint;
    return;
  end if;

  if exists (
    select 1 from class_members cm
    where cm.class_id = v_class.id and cm.student_id = v_student
  ) then
    return query select 'SUDAH_TERGABUNG'::text, v_class.id, v_class.name,
                        v_class.teacher_name, v_class.grade_level;
    return;
  end if;

  select p.grade_level into v_student_grade from profiles p where p.id = v_student;

  if v_student_grade is not null and v_class.grade_level is not null
     and v_student_grade <> v_class.grade_level then
    insert into class_join_attempts (student_id, code, status)
    values (v_student, v_code, 'TINGKAT_TIDAK_COCOK');
    return query select 'TINGKAT_TIDAK_COCOK'::text, v_class.id, v_class.name,
                        v_class.teacher_name, v_class.grade_level;
    return;
  end if;

  if v_student_grade is null and v_class.grade_level is not null then
    update profiles set grade_level = v_class.grade_level where id = v_student;
  end if;

  insert into class_members (class_id, student_id) values (v_class.id, v_student)
  on conflict on constraint class_members_unique do nothing;

  insert into class_join_attempts (student_id, code, status)
  values (v_student, v_code, 'BERHASIL');

  return query select 'BERHASIL'::text, v_class.id, v_class.name,
                      v_class.teacher_name, v_class.grade_level;
end;
$$;

drop policy if exists profiles_select_teacher_of_my_class on public.profiles;
create policy profiles_select_teacher_of_my_class on public.profiles for select
  using (
    role = 'teacher'
    and exists (
      select 1
      from class_members cm
      join classes c on c.id = cm.class_id
      where c.teacher_id = profiles.id and cm.student_id = public.app_user_id()
    )
  );

-- Arsip kelas belajar (soft delete) + penjagaan integritas keanggotaan/tugas.
--
-- Aturan yang ditegakkan:
--   * Guru boleh mengarsipkan kelasnya kapan saja; data anggota & riwayat tetap ada.
--   * Kelas yang diarsipkan tidak menerima anggota baru dan tidak menerima tugas baru.
--   * Kelas yang diarsipkan tidak lagi memberi akses konten (tingkat maupun tugas kelas);
--     siswa tetap belajar mandiri sesuai tingkat profil atau lewat kelas lain yang aktif.
--   * Penghapusan permanen hanya untuk kelas tanpa anggota dan tanpa tugas (dijaga di server),
--     sehingga riwayat tidak pernah kehilangan konteks secara diam-diam.

alter table public.classes
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.profiles (id) on delete set null;

create index if not exists classes_teacher_active_idx
  on public.classes (teacher_id, created_at) where archived_at is null;

comment on column public.classes.archived_at is
  'Waktu kelas diarsipkan. NULL = aktif. Kelas arsip tidak menerima anggota/tugas baru.';

/* ------------------------- penjagaan keanggotaan ------------------------ */

create or replace function public.app_class_archived_guard() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1 from classes c where c.id = new.class_id and c.archived_at is not null
  ) then
    raise exception 'Kelas ini sudah diarsipkan dan tidak menerima anggota atau tugas baru.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists class_members_archive_guard on public.class_members;
create trigger class_members_archive_guard
  before insert on public.class_members
  for each row execute function public.app_class_archived_guard();

drop trigger if exists mission_classes_archive_guard on public.mission_classes;
create trigger mission_classes_archive_guard
  before insert or update on public.mission_classes
  for each row execute function public.app_class_archived_guard();

/* --------------------------- akses dari siswa -------------------------- */

-- Kelas arsip tidak memberi akses konten; tingkat profil & kelas aktif tetap berlaku.
create or replace function public.app_mission_available(p_mission uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from missions m
    where m.id = p_mission
      and m.is_published
      and m.archived_at is null
      and m.grade_level is not null
      and (
        exists (
          select 1 from profiles p
          where p.id = public.app_user_id() and p.grade_level = m.grade_level
        )
        or exists (
          select 1
          from class_members cm
          join classes c on c.id = cm.class_id
          where cm.student_id = public.app_user_id()
            and c.archived_at is null
            and c.grade_level = m.grade_level
        )
      )
      and (
        not exists (select 1 from mission_classes mc where mc.mission_id = m.id)
        or exists (
          select 1
          from mission_classes mc
          join classes c on c.id = mc.class_id
          join class_members cm on cm.class_id = mc.class_id
          where mc.mission_id = m.id
            and cm.student_id = public.app_user_id()
            and c.archived_at is null
        )
      )
  )
$$;

-- Siswa hanya melihat kelas aktifnya; guru tetap melihat kelasnya yang diarsipkan.
drop policy if exists classes_select on public.classes;
create policy classes_select on public.classes for select
  using (
    teacher_id = public.app_user_id()
    or (
      public.app_role_name() = 'student'
      and archived_at is null
      and public.app_student_in_class(id)
    )
  );

/* -------------------------- gabung kelas via kode ---------------------- */

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

  select c.id, c.name, c.grade_level, c.archived_at, t.display_name as teacher_name
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

  if v_class.archived_at is not null then
    insert into class_join_attempts (student_id, code, status)
    values (v_student, v_code, 'KELAS_DIARSIPKAN');
    return query select 'KELAS_DIARSIPKAN'::text, v_class.id, v_class.name,
                        v_class.teacher_name, v_class.grade_level;
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

/* -------------------------------- indeks ------------------------------- */

-- Roster & laporan menghitung anggota per kelas.
create index if not exists class_members_class_idx on public.class_members (class_id);
-- Daftar misi per kelas (laporan kelas).
create index if not exists attempts_mission_student_idx on public.attempts (mission_id, student_id);

grant execute on function public.app_class_archived_guard() to misi_app;

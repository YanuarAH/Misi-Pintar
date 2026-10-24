-- Belajar mandiri tanpa kelas + keanggotaan kelas yang opsional.
--
-- Perubahan konsep:
--   * Tingkat kelas siswa sekarang milik profil (profiles.grade_level), bukan hanya warisan
--     kelas belajar. Siswa bisa belajar mandiri tanpa kode kelas.
--   * Keanggotaan kelas belajar (class_members) bersifat opsional dan tetap many-to-many:
--     satu siswa boleh ikut beberapa kelas dengan satu akun, tanpa duplikat per kelas.
--   * Kelas belajar tetap menyimpan tingkatnya sendiri; kompatibilitas tingkat ditegakkan
--     saat bergabung dan saat guru mengubah tingkat kelas.
--
-- Semua data lama dipertahankan: kelas, keanggotaan, misi, soal, percobaan, progres.

/* ----------------------- tingkat kelas pada siswa ----------------------- */

alter table public.profiles add column if not exists grade_level smallint;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass and conname = 'profiles_grade_level_check'
  ) then
    alter table public.profiles
      add constraint profiles_grade_level_check check (grade_level between 1 and 6);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass and conname = 'profiles_grade_level_student_only'
  ) then
    alter table public.profiles
      add constraint profiles_grade_level_student_only
      check (role <> 'teacher' or grade_level is null);
  end if;
end
$$;

comment on column public.profiles.grade_level is
  'Tingkat kelas SD siswa (1-6). NULL = belum dipilih; dipakai untuk belajar mandiri.';

-- Backfill hati-hati: hanya siswa yang seluruh kelasnya sepakat pada satu tingkat.
-- Bila kelasnya belum punya tingkat atau berbeda-beda, dibiarkan NULL (tidak menebak).
update public.profiles p
   set grade_level = known.grade
  from (
    select cm.student_id, min(c.grade_level) as grade
      from public.class_members cm
      join public.classes c on c.id = cm.class_id
     where c.grade_level is not null
     group by cm.student_id
    having count(distinct c.grade_level) = 1
  ) known
 where p.id = known.student_id
   and p.role = 'student'
   and p.grade_level is null;

-- Siswa boleh mengatur tingkatnya sendiri (kolom lain tetap tidak bisa diubah lewat jalur aplikasi).
grant update (grade_level) on public.profiles to misi_app;

/* --------------------------- autentikasi ------------------------------- */

-- Login siswa tidak lagi bergantung pada keanggotaan kelas.
create or replace function public.app_login_lookup_student(p_access_code text)
returns table (id uuid, secret_hash text, display_name text, avatar_key text, class_name text)
language sql stable security definer set search_path = public, pg_temp
as $$
  select p.id, p.pin_hash, p.display_name, p.avatar_key,
         (select c.name
            from class_members cm
            join classes c on c.id = cm.class_id
           where cm.student_id = p.id
           order by cm.joined_at asc
           limit 1)
  from profiles p
  where p.access_code = upper(btrim(p_access_code))
    and p.role = 'student'
  limit 1
$$;

-- Pendaftaran: kode kelas opsional, tingkat kelas boleh dipilih sekarang atau nanti.
drop function if exists public.app_register_student(text, text, text, text, text);

create or replace function public.app_register_student(
  p_display_name text,
  p_avatar_key   text,
  p_pin_hash     text,
  p_access_code  text,
  p_join_code    text default null,
  p_grade_level  smallint default null
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_code      text := nullif(upper(btrim(coalesce(p_join_code, ''))), '');
  v_class_id  uuid;
  v_class_grade smallint;
  v_grade     smallint := p_grade_level;
  v_student_id uuid;
  v_name      text := btrim(p_display_name);
begin
  if length(v_name) < 2 or length(v_name) > 40 then
    raise exception 'NAMA_TIDAK_VALID' using errcode = '22023';
  end if;

  if v_grade is not null and (v_grade < 1 or v_grade > 6) then
    raise exception 'TINGKAT_TIDAK_VALID' using errcode = '22023';
  end if;

  if v_code is not null then
    select c.id, c.grade_level into v_class_id, v_class_grade
    from classes c
    where c.join_code = v_code;

    if v_class_id is null then
      raise exception 'KODE_KELAS_TIDAK_DITEMUKAN' using errcode = '22023';
    end if;

    -- Tingkat kelas belajar menjadi acuan bila siswa belum memilih tingkatnya sendiri.
    if v_class_grade is not null then
      if v_grade is null then
        v_grade := v_class_grade;
      elsif v_grade <> v_class_grade then
        raise exception 'TINGKAT_TIDAK_COCOK' using errcode = '22023';
      end if;
    end if;

    if exists (
      select 1
      from class_members cm
      join profiles pr on pr.id = cm.student_id
      where cm.class_id = v_class_id and lower(pr.display_name) = lower(v_name)
    ) then
      raise exception 'NAMA_SUDAH_DIPAKAI' using errcode = '23505';
    end if;
  end if;

  insert into profiles (role, display_name, avatar_key, pin_hash, access_code, grade_level)
  values ('student', v_name, coalesce(nullif(p_avatar_key, ''), 'rubah'), p_pin_hash,
          upper(p_access_code), v_grade)
  returning id into v_student_id;

  if v_class_id is not null then
    insert into class_members (class_id, student_id) values (v_class_id, v_student_id);
  end if;

  return v_student_id;
end;
$$;

/* ------------------------ gabung kelas dengan kode --------------------- */

create table if not exists public.class_join_attempts (
  id           bigserial primary key,
  student_id   uuid not null references public.profiles (id) on delete cascade,
  code         text not null,
  status       text not null,
  attempted_at timestamptz not null default now()
);

create index if not exists class_join_attempts_student_idx
  on public.class_join_attempts (student_id, attempted_at desc);

alter table public.class_join_attempts enable row level security;

-- Tidak ada policy: tabel ini hanya ditulis/dibaca lewat fungsi SECURITY DEFINER.
comment on table public.class_join_attempts is
  'Jejak percobaan gabung kelas untuk membatasi penebakan kode undangan.';

create or replace function public.app_student_grade() returns smallint
language sql stable security definer set search_path = public, pg_temp
as $$
  select grade_level from profiles where id = public.app_user_id()
$$;

-- Batas percobaan kode yang salah: 8 kegagalan per 10 menit per siswa.
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

  -- Kompatibilitas tingkat: jangan mencampur siswa lintas jenjang tanpa sengaja.
  if v_student_grade is not null and v_class.grade_level is not null
     and v_student_grade <> v_class.grade_level then
    insert into class_join_attempts (student_id, code, status)
    values (v_student, v_code, 'TINGKAT_TIDAK_COCOK');
    return query select 'TINGKAT_TIDAK_COCOK'::text, v_class.id, v_class.name,
                        v_class.teacher_name, v_class.grade_level;
    return;
  end if;

  -- Siswa tanpa tingkat mengikuti tingkat kelas yang ia pilih untuk dimasuki.
  if v_student_grade is null and v_class.grade_level is not null then
    update profiles set grade_level = v_class.grade_level where id = v_student;
  end if;

  insert into class_members (class_id, student_id) values (v_class.id, v_student)
  on conflict (class_id, student_id) do nothing;

  insert into class_join_attempts (student_id, code, status)
  values (v_student, v_code, 'BERHASIL');

  return query select 'BERHASIL'::text, v_class.id, v_class.name,
                      v_class.teacher_name, v_class.grade_level;
end;
$$;

/* ---------------------- akses konten (mandiri + kelas) ----------------- */

-- Misi tersedia bila:
--   * terbit, tidak diarsipkan, dan sudah punya tingkat kelas;
--   * tingkatnya cocok dengan tingkat profil siswa ATAU salah satu kelas belajarnya;
--   * bila misi ditugaskan ke kelas tertentu, siswa anggota salah satu kelas itu
--     (tugas kelas tidak otomatis terbuka untuk semua siswa bertingkat sama).
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
          where cm.student_id = public.app_user_id() and c.grade_level = m.grade_level
        )
      )
      and (
        not exists (select 1 from mission_classes mc where mc.mission_id = m.id)
        or exists (
          select 1
          from mission_classes mc
          join class_members cm on cm.class_id = mc.class_id
          where mc.mission_id = m.id and cm.student_id = public.app_user_id()
        )
      )
  )
$$;

/* ------------------ konsistensi tingkat kelas belajar ------------------ */

-- Siswa perlu melihat tugas kelasnya sendiri (judul misi), tanpa membuka penugasan kelas lain.
drop policy if exists mission_classes_select on public.mission_classes;
create policy mission_classes_select on public.mission_classes for select
  using (
    public.app_mission_editable(mission_id)
    or public.app_teacher_owns_class(class_id)
    or (public.app_role_name() = 'student' and public.app_student_in_class(class_id))
  );

-- Mengubah tingkat kelas tidak boleh membuat anggota yang sudah ada jadi tidak cocok.
create or replace function public.app_class_grade_guard() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_conflict integer;
begin
  if new.grade_level is not distinct from old.grade_level then
    return new;
  end if;

  select count(*) into v_conflict
  from class_members cm
  join profiles p on p.id = cm.student_id
  where cm.class_id = new.id
    and p.grade_level is not null
    and p.grade_level <> new.grade_level;

  if v_conflict > 0 then
    raise exception 'Ada % anggota dengan tingkat kelas berbeda. Keluarkan atau sesuaikan dulu.', v_conflict
      using errcode = 'check_violation';
  end if;

  if new.grade_level is not null then
    update profiles p
       set grade_level = new.grade_level
      from class_members cm
     where cm.class_id = new.id and cm.student_id = p.id and p.grade_level is null;
  end if;

  return new;
end;
$$;

drop trigger if exists classes_grade_guard on public.classes;
create trigger classes_grade_guard
  before update of grade_level on public.classes
  for each row execute function public.app_class_grade_guard();

/* ------------------------------- grant -------------------------------- */

-- class_join_attempts sengaja tanpa grant & tanpa policy: hanya lewat fungsi definer.
grant execute on function
  public.app_register_student(text, text, text, text, text, smallint),
  public.app_join_class(text),
  public.app_student_grade(),
  public.app_class_grade_guard()
  to misi_app;

-- Pemisahan tiga konsep: tingkat kelas (grade), kelas belajar (manual), dan penugasan misi.
--
-- Sebelumnya misi tanpa penugasan otomatis terbuka untuk semua siswa dengan tingkat
-- kelas yang sama, sehingga siswa dalam sebuah kelas melihat seluruh misi, bukan hanya
-- yang ditetapkan gurunya. Sekarang visibilitas misi dinyatakan eksplisit:
--
--   * audience = 'public'     -> misi belajar mandiri: tampil untuk siswa dengan tingkat
--                                kelas yang sama (profil), tanpa perlu menjadi anggota kelas.
--   * audience = 'class_only' -> misi kelas: hanya tampil bagi anggota kelas aktif tempat
--                                misi itu ditugaskan. Tanpa penugasan, tidak tampil ke siapa pun.
--
-- `classes` tetap menyimpan tingkat kelas (grade_level) sebagai syarat kompatibilitas:
-- misi kelas hanya bisa ditugaskan ke kelas dengan tingkat yang sama.

alter table public.missions
  add column if not exists audience text not null default 'public';

alter table public.missions
  drop constraint if exists missions_audience_check;

alter table public.missions
  add constraint missions_audience_check check (audience in ('public', 'class_only'));

comment on column public.missions.audience is
  'public = belajar mandiri untuk semua siswa setingkat; class_only = hanya kelas yang ditugaskan.';

create index if not exists missions_audience_idx
  on public.missions (audience) where archived_at is null;

/* ------------------------- akses siswa ke misi -------------------------- */

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
        case
          -- Belajar mandiri: tingkat profil siswa, atau tingkat kelas aktif yang diikuti
          -- (untuk siswa yang belum memilih tingkat sendiri).
          when m.audience = 'public' then (
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
          -- Misi kelas: wajib anggota kelas aktif tempat misi ditugaskan, dengan
          -- tingkat kelas yang sama. Penugasan ke kelas arsip tidak memberi akses.
          else exists (
            select 1
            from mission_classes mc
            join classes c on c.id = mc.class_id
            join class_members cm on cm.class_id = c.id
            where mc.mission_id = m.id
              and cm.student_id = public.app_user_id()
              and c.archived_at is null
              and c.grade_level = m.grade_level
          )
        end
      )
  )
$$;

/* -------------------- validasi terbit untuk misi kelas ------------------ */

create or replace function public.app_mission_audience_guard() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if new.audience = 'class_only' and new.is_published and not exists (
    select 1 from mission_classes mc where mc.mission_id = new.id
  ) then
    raise exception 'Misi khusus kelas harus ditugaskan ke minimal satu kelas sebelum diterbitkan.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- Hanya pada UPDATE: misi baru selalu dibuat sebagai draf, dan seed/uji boleh
-- menyisipkan baris terbit sebelum penugasan kelas dibuat.
drop trigger if exists missions_audience_guard on public.missions;
create trigger missions_audience_guard
  before update on public.missions
  for each row execute function public.app_mission_audience_guard();

/* ------------- penugasan harus ke kelas aktif dengan tingkat sama -------- */

create or replace function public.app_mission_classes_grade_guard() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  mission_grade smallint;
  class_grade smallint;
begin
  select grade_level into mission_grade from missions where id = new.mission_id;
  select grade_level into class_grade from classes where id = new.class_id;

  if mission_grade is null then
    raise exception 'Pilih tingkat kelas misi sebelum menugaskan ke kelas.'
      using errcode = 'check_violation';
  end if;

  if class_grade is distinct from mission_grade then
    raise exception 'Kelas ini bukan kelas dengan tingkat kelas misi yang sama.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists mission_classes_grade_guard on public.mission_classes;
create trigger mission_classes_grade_guard
  before insert or update on public.mission_classes
  for each row execute function public.app_mission_classes_grade_guard();

-- Kelas belajar menjadi ruang belajar per mata pelajaran.
alter table public.classes
  add column if not exists subject_slug text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.classes'::regclass and conname = 'classes_subject_fk'
  ) then
    alter table public.classes
      add constraint classes_subject_fk foreign key (subject_slug)
      references public.subjects (slug) on update cascade on delete restrict;
  end if;
end;
$$;

create index if not exists classes_subject_grade_active_idx
  on public.classes (subject_slug, grade_level) where archived_at is null;

comment on column public.classes.subject_slug is
  'Mata pelajaran kelas belajar. NULL hanya untuk kelas lama yang belum dikonfigurasi.';

-- Kelas dengan mata pelajaran hanya membuka misi untuk mata pelajaran dan tingkat
-- yang sama. Siswa tanpa kelas aktif tetap dapat belajar mandiri sesuai tingkatnya.
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
          select 1
          from class_members cm
          join classes c on c.id = cm.class_id
          where cm.student_id = public.app_user_id()
            and c.archived_at is null
            and c.grade_level = m.grade_level
            and c.subject_slug = m.subject_slug
        )
        or (
          m.audience = 'public'
          and not exists (
            select 1
            from class_members cm
            join classes c on c.id = cm.class_id
            where cm.student_id = public.app_user_id()
              and c.archived_at is null
          )
          and exists (
            select 1 from profiles p
            where p.id = public.app_user_id() and p.grade_level = m.grade_level
          )
        )
      )
  )
$$;

-- Penugasan per-misi tidak lagi menjadi prasyarat publikasi; akses kelas dihitung
-- otomatis dari mata pelajaran dan tingkat kelas.
drop trigger if exists missions_audience_guard on public.missions;

-- Relasi penugasan lama tidak lagi menentukan akses dan tidak boleh menghalangi
-- penghapusan kelas atau misi kosong; foreign key membersihkan relasi tersebut.
create or replace function public.app_mission_delete_guard() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from attempts a where a.mission_id = old.id) then
    raise exception 'Misi "%" punya riwayat pengerjaan siswa. Arsipkan saja, jangan dihapus.', old.title
      using errcode = 'check_violation';
  end if;

  return old;
end;
$$;

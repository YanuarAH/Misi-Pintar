-- Penjagaan arsip & hapus permanen misi di tingkat database.
--
-- Aturan yang ditegakkan:
--   * Misi yang diarsipkan tidak mungkin tetap berstatus terbit (tidak tampil ke siswa).
--   * Misi yang diarsipkan tidak menerima penugasan kelas baru.
--   * Misi dengan riwayat pengerjaan atau penugasan kelas tidak boleh dihapus permanen;
--     guru harus mengarsipkannya agar riwayat belajar tetap utuh.
-- Trigger berjalan sebagai definer supaya pemeriksaan tidak bergantung pada RLS guru.

/* ---------------------------- arsip ⇄ terbit ---------------------------- */

create or replace function public.app_mission_archive_guard() returns trigger
language plpgsql
as $$
begin
  if new.archived_at is not null then
    new.is_published := false;
  end if;
  return new;
end;
$$;

drop trigger if exists missions_archive_guard on public.missions;
create trigger missions_archive_guard
  before insert or update on public.missions
  for each row execute function public.app_mission_archive_guard();

/* --------------------- penugasan ke misi yang arsip --------------------- */

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

  -- Trigger ini dipakai `class_members` dan `mission_classes`; kolom mission_id
  -- hanya ada di tabel kedua, jadi dibaca lewat jsonb agar aman untuk keduanya.
  if coalesce(to_jsonb(new) ->> 'mission_id', '') <> '' and exists (
    select 1 from missions m
     where m.id = (to_jsonb(new) ->> 'mission_id')::uuid
       and m.archived_at is not null
  ) then
    raise exception 'Misi ini sudah diarsipkan dan tidak bisa ditugaskan ke kelas.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

/* ---------------------- hitungan riwayat untuk guru --------------------- */

-- RLS `attempts` membatasi guru pada siswa kelasnya; keputusan hapus misi butuh
-- angka yang sebenarnya (sudah ada riwayat atau belum) lintas kelas.
create or replace function public.app_mission_attempt_count(p_mission uuid)
returns bigint
language sql stable security definer set search_path = public, pg_temp
as $$
  select count(*) from attempts a where a.mission_id = p_mission;
$$;

revoke all on function public.app_mission_attempt_count(uuid) from public;
grant execute on function public.app_mission_attempt_count(uuid) to misi_app;

/* -------------------------- hapus permanen misi ------------------------- */

create or replace function public.app_mission_delete_guard() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from attempts a where a.mission_id = old.id) then
    raise exception 'Misi "%" punya riwayat pengerjaan siswa. Arsipkan saja, jangan dihapus.', old.title
      using errcode = 'check_violation';
  end if;

  if exists (select 1 from mission_classes mc where mc.mission_id = old.id) then
    raise exception 'Misi "%" masih ditugaskan ke kelas belajar. Lepas penugasannya dulu.', old.title
      using errcode = 'check_violation';
  end if;

  return old;
end;
$$;

drop trigger if exists missions_delete_guard on public.missions;
create trigger missions_delete_guard
  before delete on public.missions
  for each row execute function public.app_mission_delete_guard();

-- Pemisahan konten berdasarkan tingkat kelas + penugasan ke kelas belajar.
--
-- Konsep yang dipisahkan:
--   * tingkat kelas (1..6 SD)  -> missions.grade_level, classes.grade_level
--   * kelas belajar (5A, 5B)  -> tabel classes (tidak berubah)
--
-- Misi lama TIDAK diberi tingkat kelas secara otomatis: data lama tidak cukup untuk
-- menentukannya, jadi dibiarkan NULL ("belum dikategorikan") sampai guru meninjaunya.
-- Misi tanpa tingkat kelas tidak pernah tampil ke siswa, sehingga tidak ada siswa yang
-- salah menerima materi.

/* ------------------------------ referensi ------------------------------ */

create table public.subjects (
  slug        text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  label       text not null check (char_length(btrim(label)) between 2 and 60),
  order_index integer not null default 0
);

insert into public.subjects (slug, label, order_index) values
  ('matematika', 'Matematika', 1),
  ('ipa', 'Ilmu Pengetahuan Alam', 2),
  ('bahasa-indonesia', 'Bahasa Indonesia', 3)
on conflict (slug) do nothing;

create table public.mission_topics (
  slug         text primary key check (slug ~ '^[a-z0-9-]{2,60}$'),
  subject_slug text not null references public.subjects (slug) on update cascade on delete restrict,
  label        text not null check (char_length(btrim(label)) between 2 and 80),
  order_index  integer not null default 0,
  constraint mission_topics_slug_subject_unique unique (slug, subject_slug)
);

create index mission_topics_subject_idx on public.mission_topics (subject_slug, order_index);

insert into public.mission_topics (slug, subject_slug, label, order_index) values
  ('bilangan-bulat', 'matematika', 'Operasi bilangan bulat', 1),
  ('uang-belanja', 'matematika', 'Uang & belanja', 2),
  ('pecahan', 'matematika', 'Pecahan', 3),
  ('desimal-persen', 'matematika', 'Desimal & persen', 4),
  ('geometri-dasar', 'matematika', 'Bangun datar & ruang', 5),
  ('pengukuran', 'matematika', 'Pengukuran & satuan', 6)
on conflict (slug) do nothing;

/* --------------------------- metadata misi ---------------------------- */

alter table public.missions
  add column if not exists grade_level smallint,
  add column if not exists subject_slug text,
  add column if not exists topic_slug text;

alter table public.missions
  add constraint missions_grade_level_check check (grade_level between 1 and 6),
  add constraint missions_subject_fk foreign key (subject_slug)
    references public.subjects (slug) on update cascade on delete restrict,
  add constraint missions_topic_subject_fk foreign key (topic_slug, subject_slug)
    references public.mission_topics (slug, subject_slug) on update cascade on delete restrict,
  -- Topik wajib punya mata pelajaran; FK komposit tidak memeriksa bila salah satu NULL.
  add constraint missions_topic_needs_subject check (topic_slug is null or subject_slug is not null);

create index missions_curriculum_idx
  on public.missions (grade_level, subject_slug, order_index) where archived_at is null;

comment on column public.missions.grade_level is
  'Tingkat kelas SD (1-6). NULL = belum dikategorikan; misi seperti ini tidak tampil ke siswa.';
comment on column public.missions.subject_slug is 'Mata pelajaran (public.subjects.slug).';
comment on column public.missions.topic_slug is 'Materi/topik (public.mission_topics.slug).';

/* ---------------------------- kelas belajar ---------------------------- */

alter table public.classes add column if not exists grade_level smallint;
alter table public.classes
  add constraint classes_grade_level_check check (grade_level between 1 and 6);

comment on column public.classes.grade_level is
  'Tingkat kelas SD dari kelompok belajar ini. NULL = belum diatur oleh guru.';

/* -------------------------- penugasan misi ---------------------------- */

create table public.mission_classes (
  mission_id  uuid not null references public.missions (id) on delete cascade,
  class_id    uuid not null references public.classes (id) on delete cascade,
  assigned_by uuid references public.profiles (id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (mission_id, class_id)
);

create index mission_classes_class_idx on public.mission_classes (class_id);

-- Tingkat kelas misi dan kelas penerima wajib sama. Dijaga di database agar tidak
-- bisa dilewati lewat jalur mana pun, bukan hanya di UI.
create or replace function public.app_mission_class_grade_guard() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_mission_grade smallint;
  v_class_grade   smallint;
begin
  select grade_level into v_mission_grade from missions where id = new.mission_id;
  select grade_level into v_class_grade from classes where id = new.class_id;

  if v_mission_grade is null then
    raise exception 'Misi belum punya tingkat kelas; kategorikan dulu sebelum ditugaskan.'
      using errcode = 'check_violation';
  end if;
  if v_class_grade is null then
    raise exception 'Kelas belum punya tingkat kelas; atur dulu sebelum menerima misi.'
      using errcode = 'check_violation';
  end if;
  if v_mission_grade <> v_class_grade then
    raise exception 'Tingkat kelas misi (%) tidak sama dengan kelas penerima (%).',
      v_mission_grade, v_class_grade using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger mission_classes_grade_guard
  before insert or update on public.mission_classes
  for each row execute function public.app_mission_class_grade_guard();

/* ------------------------- akses siswa ke misi ------------------------ */

-- Apakah siswa yang sedang login berhak melihat misi ini?
-- Syarat: misi terbit, sudah punya tingkat kelas, siswa punya kelas dengan tingkat yang sama,
-- dan bila misi ditugaskan ke kelas tertentu, salah satu kelas siswa termasuk di dalamnya.
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
      and exists (
        select 1
        from class_members cm
        join classes c on c.id = cm.class_id
        where cm.student_id = public.app_user_id()
          and c.grade_level = m.grade_level
          and (
            not exists (select 1 from mission_classes mc where mc.mission_id = m.id)
            or exists (
              select 1 from mission_classes mc
              where mc.mission_id = m.id and mc.class_id = cm.class_id
            )
          )
      )
  )
$$;

-- Siswa hanya boleh membaca soal dari misi yang boleh ia lihat. Guru tetap bisa membaca
-- misi miliknya (termasuk draf dan misi yang belum dikategorikan).
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
      )
  )
$$;

/* ------------------------------- RLS ---------------------------------- */

alter table public.subjects        enable row level security;
alter table public.mission_topics  enable row level security;
alter table public.mission_classes enable row level security;

-- Referensi kurikulum: boleh dibaca semua pengguna aplikasi, hanya diubah lewat migrasi.
create policy subjects_select on public.subjects for select using (true);
create policy mission_topics_select on public.mission_topics for select using (true);

-- Penugasan: penulis misi dan pemilik kelas boleh melihat; hanya penulis misi yang mengubah.
create policy mission_classes_select on public.mission_classes for select
  using (public.app_mission_editable(mission_id) or public.app_teacher_owns_class(class_id));
create policy mission_classes_insert on public.mission_classes for insert
  with check (public.app_mission_editable(mission_id) and public.app_teacher_owns_class(class_id));
create policy mission_classes_delete on public.mission_classes for delete
  using (public.app_mission_editable(mission_id) and public.app_teacher_owns_class(class_id));

grant select on public.subjects, public.mission_topics to misi_app;
grant select, insert, update, delete on public.mission_classes to misi_app;
grant execute on function
  public.app_mission_available(uuid),
  public.app_mission_class_grade_guard()
  to misi_app;

-- Catatan migrasi data:
--   missions.grade_level / subject_slug / topic_slug sengaja dibiarkan NULL untuk data lama.
--   classes.grade_level juga NULL. Guru mengategorikan lewat /guru/misi (filter "Belum
--   dikategorikan") dan /guru/kelas. Seed mengisi tingkat 5 untuk tiga misi bawaan karena
--   kontennya memang disusun untuk kelas 5.

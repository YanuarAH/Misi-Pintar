-- Misi Pintar - skema inti (PostgreSQL / Supabase compatible)
-- Semua waktu memakai timestamptz (UTC di database, ditampilkan WIB di UI).

create table public.profiles (
  id            uuid primary key default gen_random_uuid(),
  role          text not null default 'student' check (role in ('student', 'teacher')),
  display_name  text not null check (char_length(btrim(display_name)) between 2 and 40),
  avatar_key    text not null default 'rubah',
  email         text,
  password_hash text,
  pin_hash      text,
  access_code   text unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint profiles_credentials_by_role check (
    (role = 'teacher' and email is not null and password_hash is not null
      and pin_hash is null and access_code is null)
    or
    (role = 'student' and email is null and password_hash is null
      and pin_hash is not null and access_code is not null)
  )
);

create unique index profiles_email_unique on public.profiles (lower(email)) where email is not null;

create table public.classes (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 2 and 60),
  join_code  text not null unique check (join_code ~ '^[A-Z0-9]{6}$'),
  created_at timestamptz not null default now()
);

create index classes_teacher_idx on public.classes (teacher_id);

create table public.class_members (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  joined_at  timestamptz not null default now(),
  constraint class_members_unique unique (class_id, student_id)
);

create index class_members_student_idx on public.class_members (student_id);

create table public.missions (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  title               text not null check (char_length(btrim(title)) between 3 and 80),
  description         text not null default '',
  story               text not null default '',
  learning_objectives text[] not null default '{}',
  order_index         integer not null check (order_index > 0),
  is_published        boolean not null default false,
  author_id           uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  archived_at         timestamptz
);

create index missions_order_idx on public.missions (order_index) where archived_at is null;

create table public.questions (
  id             uuid primary key default gen_random_uuid(),
  mission_id     uuid not null references public.missions (id) on delete cascade,
  question_type  text not null check (question_type in ('multiple_choice', 'numeric')),
  prompt         text not null check (char_length(btrim(prompt)) between 5 and 1000),
  options        jsonb,
  correct_answer text not null check (char_length(btrim(correct_answer)) > 0),
  explanation    text not null default '',
  hint           text not null default '',
  difficulty     text not null default 'sedang' check (difficulty in ('mudah', 'sedang', 'tantangan')),
  answer_unit    text not null default '' check (char_length(answer_unit) <= 24),
  order_index    integer not null check (order_index > 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  archived_at    timestamptz,
  constraint questions_options_shape check (
    (question_type = 'multiple_choice'
      and options is not null
      and jsonb_typeof(options) = 'array'
      and jsonb_array_length(options) >= 2)
    or
    (question_type = 'numeric' and (options is null or jsonb_typeof(options) = 'array'))
  )
);

create index questions_mission_idx on public.questions (mission_id, order_index) where archived_at is null;

create table public.attempts (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.profiles (id) on delete cascade,
  mission_id      uuid not null references public.missions (id) on delete cascade,
  score           integer not null default 0 check (score between 0 and 100),
  correct_count   integer not null default 0 check (correct_count >= 0),
  total_questions integer not null default 0 check (total_questions >= 0),
  xp_earned       integer not null default 0 check (xp_earned >= 0),
  -- Daftar soal yang disajikan saat percobaan dimulai. Dibekukan agar perubahan
  -- materi oleh guru tidak mengubah hasil percobaan yang sudah berjalan.
  question_ids    uuid[] not null default '{}',
  started_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index attempts_student_idx on public.attempts (student_id, started_at desc);
create index attempts_mission_idx on public.attempts (mission_id, completed_at desc);
-- Satu percobaan berjalan per siswa per misi.
create unique index attempts_one_open_per_mission
  on public.attempts (student_id, mission_id) where completed_at is null;

create table public.attempt_answers (
  id               uuid primary key default gen_random_uuid(),
  attempt_id       uuid not null references public.attempts (id) on delete cascade,
  question_id      uuid not null references public.questions (id) on delete restrict,
  submitted_answer text not null,
  is_correct       boolean not null,
  answered_at      timestamptz not null default now(),
  constraint attempt_answers_unique_question unique (attempt_id, question_id)
);

create index attempt_answers_question_idx on public.attempt_answers (question_id);

create table public.user_achievements (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.profiles (id) on delete cascade,
  achievement_key text not null check (achievement_key in
    ('penjelajah', 'bintang_misi', 'sempurna', 'pembelajar_tekun')),
  earned_at       timestamptz not null default now(),
  constraint user_achievements_unique unique (student_id, achievement_key)
);

create table public.sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index sessions_user_idx on public.sessions (user_id);

create table public.schema_migrations (
  filename   text primary key,
  applied_at timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger missions_set_updated_at before update on public.missions
  for each row execute function public.set_updated_at();
create trigger questions_set_updated_at before update on public.questions
  for each row execute function public.set_updated_at();

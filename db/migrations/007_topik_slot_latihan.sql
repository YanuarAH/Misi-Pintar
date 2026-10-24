-- Topik soal (peta kemampuan), bank soal varian (slot), dan mode latihan.
--
-- * topic          : topik pembelajaran untuk agregasi kemampuan siswa.
-- * slot_index     : nomor soal dalam misi (1..10). Beberapa soal boleh berbagi slot;
--                    satu soal dipilih acak per slot saat percobaan dimulai.
-- * variant_index  : 0 = soal utama, 1.. = varian untuk slot yang sama.
-- * attempts.mode  : 'mission' = pengerjaan misi (berhitung XP, lencana, pembukaan misi),
--                    'practice' = latihan ulang soal yang salah (tanpa XP, tidak membuka misi).

alter table public.questions
  add column if not exists topic text not null default 'umum',
  add column if not exists slot_index integer,
  add column if not exists variant_index integer not null default 0;

-- Soal lama: satu soal per urutan, jadi slot = order_index.
update public.questions set slot_index = order_index where slot_index is null;

alter table public.questions alter column slot_index set not null;
alter table public.questions alter column slot_index set default 1;

alter table public.questions
  add constraint questions_slot_index_check check (slot_index between 1 and 99),
  add constraint questions_variant_index_check check (variant_index between 0 and 99),
  add constraint questions_topic_check check (btrim(topic) <> '');

-- Satu varian tidak boleh dobel dalam satu slot (soal terarsip dikecualikan agar
-- guru bisa membuat varian pengganti).
create unique index if not exists questions_slot_variant_unique
  on public.questions (mission_id, slot_index, variant_index) where archived_at is null;

create index if not exists questions_topic_idx
  on public.questions (topic) where archived_at is null;

alter table public.attempts
  add column if not exists mode text not null default 'mission',
  add column if not exists source_attempt_id uuid references public.attempts (id) on delete set null;

alter table public.attempts
  add constraint attempts_mode_check check (mode in ('mission', 'practice'));

create index if not exists attempts_source_idx on public.attempts (source_attempt_id);
create index if not exists attempts_mode_idx on public.attempts (student_id, mode, completed_at desc);

-- Satu percobaan misi berjalan per siswa per misi. Latihan tidak dibatasi, jadi
-- siswa tetap bisa berlatih walau ada misi yang belum selesai.
drop index if exists public.attempts_one_open_per_mission;
create unique index attempts_one_open_per_mission
  on public.attempts (student_id, mission_id) where completed_at is null and mode = 'mission';

comment on column public.questions.topic is
  'Topik pembelajaran (slug) untuk peta kemampuan siswa.';
comment on column public.questions.slot_index is
  'Nomor soal dalam misi; satu soal dipilih acak per slot saat percobaan dimulai.';
comment on column public.attempts.mode is
  'mission = misi resmi (XP/lencana/pembukaan), practice = latihan soal salah tanpa XP.';

-- Gambar opsional pada soal.
--
-- Model data: satu tabel `media_assets` (metadata file) + kolom `questions.image_id`.
-- Alasannya: satu soal hanya butuh satu gambar, tetapi metadata file dipisah agar
--   * file tidak disimpan sebagai Base64 di kolom teks,
--   * satu file yang dipakai beberapa soal tidak terhapus saat salah satunya diganti,
--   * tipe/ukuran file tervalidasi di database, bukan hanya di browser.
--
-- File fisiknya disimpan di disk server (MEDIA_ROOT, default `storage/media`) dan diakses
-- lewat route `/media/[id]` yang memeriksa hak akses; kolom `storage_key` tidak pernah
-- dikirim ke browser.

create table if not exists public.media_assets (
  id          uuid primary key default gen_random_uuid(),
  storage_key text not null unique check (storage_key ~ '^[a-f0-9-]{36}\.(jpg|png|webp)$'),
  mime_type   text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size   integer not null check (byte_size > 0 and byte_size <= 3145728),
  sha256      text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists media_assets_sha_idx on public.media_assets (sha256);

alter table public.questions
  add column if not exists image_id uuid references public.media_assets (id) on delete set null;

create index if not exists questions_image_idx
  on public.questions (image_id) where image_id is not null;

comment on column public.questions.image_id is
  'Gambar soal (public.media_assets). NULL = soal tanpa gambar.';

alter table public.media_assets enable row level security;

-- Guru pembuat misi boleh membaca gambar soal misinya; siswa hanya untuk misi yang boleh
-- ia lihat (aturan yang sama dengan soal). Pengunggah boleh melihat unggahannya sendiri.
create policy media_assets_select on public.media_assets for select
  using (
    uploaded_by = public.app_user_id()
    or exists (
      select 1
      from questions q
      where q.image_id = media_assets.id
        and public.app_mission_readable(q.mission_id)
    )
  );

create policy media_assets_insert on public.media_assets for insert
  with check (uploaded_by = public.app_user_id() and public.app_role_name() = 'teacher');

-- Hapus hanya bila tidak ada soal yang masih memakai file ini.
create policy media_assets_delete on public.media_assets for delete
  using (
    uploaded_by = public.app_user_id()
    and not exists (select 1 from questions q where q.image_id = media_assets.id)
  );

grant select, insert, delete on public.media_assets to misi_app;
grant execute on function public.app_mission_readable(uuid) to misi_app;

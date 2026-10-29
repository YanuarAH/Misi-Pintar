-- Mata pelajaran & topik demo tambahan: IPAS (IPA), Bahasa Indonesia, Bahasa Inggris.
--
-- Hanya menambah baris referensi. Tidak mengubah misi/soal yang sudah ada, dan
-- tidak menyentuh data siswa. Misi demo untuk topik ini diisi oleh `npm run db:seed`.

insert into public.subjects (slug, label, order_index) values
  ('bahasa-inggris', 'Bahasa Inggris', 4)
on conflict (slug) do nothing;

insert into public.mission_topics (slug, subject_slug, label, order_index) values
  ('makhluk-hidup', 'ipa', 'Makhluk hidup & lingkungan', 1),
  ('wujud-zat', 'ipa', 'Wujud zat & perubahannya', 2),
  ('membaca-teks', 'bahasa-indonesia', 'Membaca & memahami teks', 1),
  ('kosa-kata-inggris', 'bahasa-inggris', 'Kosakata sehari-hari', 1)
on conflict (slug) do update
  set subject_slug = excluded.subject_slug,
      label = excluded.label,
      order_index = excluded.order_index;

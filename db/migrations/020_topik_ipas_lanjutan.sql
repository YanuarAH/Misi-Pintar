insert into public.mission_topics (slug, subject_slug, label, order_index) values
  ('tubuh-manusia', 'ipa', 'Tubuh manusia & kesehatan', 3),
  ('energi-listrik', 'ipa', 'Energi & listrik', 4),
  ('bumi-lingkungan', 'ipa', 'Bumi & lingkungan', 5)
on conflict (slug) do update
  set subject_slug = excluded.subject_slug,
      label = excluded.label,
      order_index = excluded.order_index;

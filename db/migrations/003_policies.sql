-- Row Level Security: semua baris dilindungi, akses hanya lewat policy di bawah.

alter table public.profiles          enable row level security;
alter table public.classes           enable row level security;
alter table public.class_members     enable row level security;
alter table public.missions          enable row level security;
alter table public.questions         enable row level security;
alter table public.attempts          enable row level security;
alter table public.attempt_answers   enable row level security;
alter table public.user_achievements enable row level security;
alter table public.sessions          enable row level security;

-- profiles: diri sendiri, atau guru yang mengelola kelas siswa tersebut.
create policy profiles_select on public.profiles for select
  using (id = public.app_user_id()
         or (public.app_is_teacher() and public.app_teacher_manages_student(id)));
create policy profiles_update_self on public.profiles for update
  using (id = public.app_user_id())
  with check (id = public.app_user_id());

-- classes: milik guru, atau kelas tempat siswa terdaftar.
create policy classes_select on public.classes for select
  using (teacher_id = public.app_user_id()
         or (public.app_role_name() = 'student' and public.app_student_in_class(id)));
create policy classes_insert on public.classes for insert
  with check (public.app_is_teacher() and teacher_id = public.app_user_id());
create policy classes_update on public.classes for update
  using (public.app_is_teacher() and teacher_id = public.app_user_id())
  with check (public.app_is_teacher() and teacher_id = public.app_user_id());
create policy classes_delete on public.classes for delete
  using (public.app_is_teacher() and teacher_id = public.app_user_id());

-- class_members
create policy class_members_select on public.class_members for select
  using (student_id = public.app_user_id() or public.app_teacher_owns_class(class_id));
create policy class_members_insert on public.class_members for insert
  with check (public.app_teacher_owns_class(class_id));
create policy class_members_delete on public.class_members for delete
  using (public.app_teacher_owns_class(class_id)
         or student_id = public.app_user_id());

-- missions: yang terbit untuk semua, draf hanya untuk penulisnya.
create policy missions_select on public.missions for select
  using ((is_published and archived_at is null) or author_id = public.app_user_id());
create policy missions_insert on public.missions for insert
  with check (public.app_is_teacher() and author_id = public.app_user_id());
create policy missions_update on public.missions for update
  using (public.app_is_teacher() and author_id = public.app_user_id())
  with check (public.app_is_teacher() and author_id = public.app_user_id());
create policy missions_delete on public.missions for delete
  using (public.app_is_teacher() and author_id = public.app_user_id());

-- questions: mengikuti status misi induknya.
create policy questions_select on public.questions for select
  using (public.app_mission_readable(mission_id));
create policy questions_insert on public.questions for insert
  with check (public.app_mission_editable(mission_id));
create policy questions_update on public.questions for update
  using (public.app_mission_editable(mission_id))
  with check (public.app_mission_editable(mission_id));
create policy questions_delete on public.questions for delete
  using (public.app_mission_editable(mission_id));

-- attempts: siswa hanya percobaannya sendiri; guru hanya siswa di kelasnya.
create policy attempts_select on public.attempts for select
  using (student_id = public.app_user_id()
         or (public.app_is_teacher() and public.app_teacher_manages_student(student_id)));
create policy attempts_insert on public.attempts for insert
  with check (student_id = public.app_user_id());
create policy attempts_update on public.attempts for update
  using (student_id = public.app_user_id())
  with check (student_id = public.app_user_id());

-- attempt_answers: riwayat jawaban tidak bisa diubah atau dihapus.
create policy attempt_answers_select on public.attempt_answers for select
  using (public.app_attempt_visible(attempt_id));
create policy attempt_answers_insert on public.attempt_answers for insert
  with check (public.app_attempt_owned(attempt_id));

-- user_achievements
create policy user_achievements_select on public.user_achievements for select
  using (student_id = public.app_user_id()
         or (public.app_is_teacher() and public.app_teacher_manages_student(student_id)));
create policy user_achievements_insert on public.user_achievements for insert
  with check (student_id = public.app_user_id());

-- sessions: tanpa policy => tidak ada akses langsung; hanya lewat fungsi di 004.

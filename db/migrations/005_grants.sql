-- Hak akses role aplikasi (misi_app): tidak memiliki tabel, tidak melewati RLS.

grant usage on schema public to misi_app;

grant select, insert, update, delete on
  public.classes, public.class_members, public.missions, public.questions,
  public.attempts, public.user_achievements
  to misi_app;

grant select on public.attempt_answers to misi_app;
grant insert on public.attempt_answers to misi_app;

-- profiles: hash & email tidak pernah bisa dibaca lewat koneksi aplikasi biasa.
grant select (id, role, display_name, avatar_key, access_code, created_at, updated_at)
  on public.profiles to misi_app;
grant update (display_name, avatar_key, updated_at) on public.profiles to misi_app;

grant execute on function
  public.app_user_id(),
  public.app_role_name(),
  public.app_is_teacher(),
  public.app_teacher_owns_class(uuid),
  public.app_teacher_manages_student(uuid),
  public.app_student_in_class(uuid),
  public.app_mission_readable(uuid),
  public.app_mission_editable(uuid),
  public.app_attempt_owned(uuid),
  public.app_attempt_visible(uuid),
  public.app_class_by_join_code(text),
  public.app_register_student(text, text, text, text, text),
  public.app_login_lookup_student(text),
  public.app_login_lookup_teacher(text),
  public.app_create_session(uuid, text, timestamptz),
  public.app_session_user(text),
  public.app_delete_session(text),
  public.app_teacher_reset_student_pin(uuid, text)
  to misi_app;

-- Helper otorisasi. Semua fungsi SECURITY DEFINER agar tidak memicu rekursi RLS,
-- dan selalu memakai search_path yang tetap.

create or replace function public.app_user_id() returns uuid
language sql stable
as $$ select nullif(current_setting('app.user_id', true), '')::uuid $$;

create or replace function public.app_role_name() returns text
language sql stable
as $$ select coalesce(nullif(current_setting('app.role', true), ''), 'anon') $$;

create or replace function public.app_is_teacher() returns boolean
language sql stable
as $$ select public.app_role_name() = 'teacher' $$;

create or replace function public.app_teacher_owns_class(p_class uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from classes c
    where c.id = p_class and c.teacher_id = public.app_user_id()
  )
$$;

create or replace function public.app_teacher_manages_student(p_student uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from class_members cm
    join classes c on c.id = cm.class_id
    where cm.student_id = p_student and c.teacher_id = public.app_user_id()
  )
$$;

create or replace function public.app_student_in_class(p_class uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from class_members cm
    where cm.class_id = p_class and cm.student_id = public.app_user_id()
  )
$$;

create or replace function public.app_mission_readable(p_mission uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from missions m
    where m.id = p_mission
      and m.archived_at is null
      and (m.is_published or m.author_id = public.app_user_id())
  )
$$;

create or replace function public.app_mission_editable(p_mission uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from missions m
    where m.id = p_mission
      and m.archived_at is null
      and m.author_id = public.app_user_id()
      and public.app_is_teacher()
  )
$$;

create or replace function public.app_attempt_owned(p_attempt uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from attempts a
    where a.id = p_attempt and a.student_id = public.app_user_id()
  )
$$;

create or replace function public.app_attempt_visible(p_attempt uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from attempts a
    where a.id = p_attempt
      and (a.student_id = public.app_user_id()
           or (public.app_is_teacher() and public.app_teacher_manages_student(a.student_id)))
  )
$$;

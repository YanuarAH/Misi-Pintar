-- Fungsi autentikasi. Hash PIN/password dibuat di Node (scrypt); fungsi ini hanya
-- menyimpan / membaca hash, tidak pernah mengembalikannya ke klien.

create or replace function public.app_class_by_join_code(p_code text)
returns table (id uuid, name text, teacher_name text)
language sql stable security definer set search_path = public, pg_temp
as $$
  select c.id, c.name, p.display_name
  from classes c
  join profiles p on p.id = c.teacher_id
  where c.join_code = upper(btrim(p_code))
  limit 1
$$;

create or replace function public.app_register_student(
  p_join_code text,
  p_display_name text,
  p_pin_hash text,
  p_avatar_key text,
  p_access_code text
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_class_id uuid;
  v_student_id uuid;
  v_name text := btrim(p_display_name);
begin
  if length(v_name) < 2 or length(v_name) > 40 then
    raise exception 'NAMA_TIDAK_VALID' using errcode = '22023';
  end if;

  select c.id into v_class_id
  from classes c
  where c.join_code = upper(btrim(p_join_code));

  if v_class_id is null then
    raise exception 'KODE_KELAS_TIDAK_DITEMUKAN' using errcode = '22023';
  end if;

  if exists (
    select 1
    from class_members cm
    join profiles pr on pr.id = cm.student_id
    where cm.class_id = v_class_id and lower(pr.display_name) = lower(v_name)
  ) then
    raise exception 'NAMA_SUDAH_DIPAKAI' using errcode = '23505';
  end if;

  insert into profiles (role, display_name, avatar_key, pin_hash, access_code)
  values ('student', v_name, coalesce(nullif(p_avatar_key, ''), 'rubah'), p_pin_hash, upper(p_access_code))
  returning id into v_student_id;

  insert into class_members (class_id, student_id) values (v_class_id, v_student_id);
  return v_student_id;
end;
$$;

create or replace function public.app_login_lookup_student(p_access_code text)
returns table (id uuid, secret_hash text, display_name text, avatar_key text, class_name text)
language sql stable security definer set search_path = public, pg_temp
as $$
  select p.id, p.pin_hash, p.display_name, p.avatar_key, c.name
  from profiles p
  join class_members cm on cm.student_id = p.id
  join classes c on c.id = cm.class_id
  where p.access_code = upper(btrim(p_access_code))
    and p.role = 'student'
  limit 1
$$;

create or replace function public.app_login_lookup_teacher(p_email text)
returns table (id uuid, secret_hash text, display_name text)
language sql stable security definer set search_path = public, pg_temp
as $$
  select p.id, p.password_hash, p.display_name
  from profiles p
  where lower(p.email) = lower(btrim(p_email))
    and p.role = 'teacher'
  limit 1
$$;

create or replace function public.app_create_session(p_user_id uuid, p_token_hash text, p_expires_at timestamptz)
returns void
language sql security definer set search_path = public, pg_temp
as $$
  insert into sessions (user_id, token_hash, expires_at)
  values (p_user_id, p_token_hash, p_expires_at)
$$;

create or replace function public.app_session_user(p_token_hash text)
returns table (id uuid, role text, display_name text, avatar_key text, expires_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  delete from sessions s where s.expires_at < now();

  return query
    select p.id, p.role, p.display_name, p.avatar_key, s.expires_at
    from sessions s
    join profiles p on p.id = s.user_id
    where s.token_hash = p_token_hash and s.expires_at > now()
    limit 1;
end;
$$;

create or replace function public.app_delete_session(p_token_hash text)
returns void
language sql security definer set search_path = public, pg_temp
as $$
  delete from sessions s where s.token_hash = p_token_hash
$$;

create or replace function public.app_teacher_reset_student_pin(p_student_id uuid, p_pin_hash text)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.app_teacher_manages_student(p_student_id) then
    raise exception 'TIDAK_BERWENANG' using errcode = '42501';
  end if;

  update profiles set pin_hash = p_pin_hash where id = p_student_id and role = 'student';
  delete from sessions where user_id = p_student_id;
end;
$$;

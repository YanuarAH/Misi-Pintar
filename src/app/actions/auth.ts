"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { one } from "@/lib/db";
import { hashSecret, verifySecret } from "@/lib/password";
import { rateLimit, resetRateLimit } from "@/lib/rateLimit";
import { createSession, destroySession } from "@/lib/session";
import {
  firstIssue,
  studentLoginSchema,
  studentRegisterSchema,
  teacherLoginSchema,
} from "@/lib/validation";

export type AuthState = { error?: string; success?: string } | null;

// Hash dummy agar waktu proses login tetap mirip ketika akun tidak ditemukan.
const DUMMY_HASH =
  "scrypt$16384$8$1$YWJjZGVmZ2hpamtsbW5vcA==$" +
  "Z2VuZXJhdGVkZHVtbXloYXNodmFsdWVmb3J0aW1pbmdvbmx5cGFkZGluZ3BhZGRpbmc=";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateAccessCode(): string {
  let code = "";
  for (let index = 0; index < 8; index += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

export async function loginStudentAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = studentLoginSchema.safeParse({
    accessCode: formData.get("accessCode") ?? "",
    pin: formData.get("pin") ?? "",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const limited = rateLimit(`student-login:${parsed.data.accessCode}`, 8, 10 * 60 * 1000);
  if (!limited.ok) {
    return { error: `Terlalu banyak percobaan. Coba lagi dalam ${limited.retryAfterSeconds} detik.` };
  }

  const account = await one<{ id: string; secret_hash: string; display_name: string }>(
    null,
    "select * from public.app_login_lookup_student($1)",
    [parsed.data.accessCode],
  );

  if (!account) {
    await verifySecret(parsed.data.pin, DUMMY_HASH);
    return { error: "Kode siswa atau PIN belum cocok. Periksa lagi, atau tanya gurumu." };
  }

  const valid = await verifySecret(parsed.data.pin, account.secret_hash);
  if (!valid) return { error: "Kode siswa atau PIN belum cocok. Periksa lagi, atau tanya gurumu." };

  resetRateLimit(`student-login:${parsed.data.accessCode}`);
  await createSession(account.id);
  redirect("/belajar");
}

export async function loginTeacherAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = teacherLoginSchema.safeParse({
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const limited = rateLimit(`teacher-login:${parsed.data.email}`, 8, 10 * 60 * 1000);
  if (!limited.ok) {
    return { error: `Terlalu banyak percobaan. Coba lagi dalam ${limited.retryAfterSeconds} detik.` };
  }

  const account = await one<{ id: string; secret_hash: string }>(
    null,
    "select * from public.app_login_lookup_teacher($1)",
    [parsed.data.email],
  );

  if (!account) {
    await verifySecret(parsed.data.password, DUMMY_HASH);
    return { error: "Email atau password belum cocok." };
  }

  const valid = await verifySecret(parsed.data.password, account.secret_hash);
  if (!valid) return { error: "Email atau password belum cocok." };

  resetRateLimit(`teacher-login:${parsed.data.email}`);
  await createSession(account.id);
  redirect("/guru/dashboard");
}

export async function registerStudentAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = studentRegisterSchema.safeParse({
    joinCode: formData.get("joinCode") ?? "",
    displayName: formData.get("displayName") ?? "",
    pin: formData.get("pin") ?? "",
    avatarKey: formData.get("avatarKey") ?? "rubah",
    gradeLevel: formData.get("gradeLevel") ?? "",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const confirmPin = String(formData.get("confirmPin") ?? "");
  if (confirmPin !== parsed.data.pin) return { error: "PIN dan ulangi PIN belum sama." };

  const { joinCode, gradeLevel } = parsed.data;

  const limited = rateLimit(`register:${joinCode ?? "mandiri"}`, 12, 10 * 60 * 1000);
  if (!limited.ok) {
    return { error: `Terlalu banyak pendaftaran. Coba lagi dalam ${limited.retryAfterSeconds} detik.` };
  }

  // Kode kelas opsional: hanya diperiksa bila diisi.
  if (joinCode) {
    const classroom = await one<{ id: string; name: string; grade_level: number | null }>(
      null,
      "select id, name, grade_level from public.app_class_join_preview($1)",
      [joinCode],
    );
    if (!classroom) return { error: "Kode kelas tidak ditemukan. Kosongkan bila ingin belajar mandiri." };
    if (gradeLevel !== null && classroom.grade_level !== null && gradeLevel !== classroom.grade_level) {
      return {
        error: `Kelas "${classroom.name}" untuk Kelas ${classroom.grade_level} SD. Samakan tingkat kelasmu atau kosongkan kode kelas.`,
      };
    }
  }

  const pinHash = await hashSecret(parsed.data.pin);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const accessCode = generateAccessCode();
    try {
      const created = await one<{ app_register_student: string }>(
        null,
        "select public.app_register_student($1, $2, $3, $4, $5, $6)",
        [parsed.data.displayName, parsed.data.avatarKey, pinHash, accessCode, joinCode, gradeLevel],
      );
      if (created) {
        await createSession(created.app_register_student);
        // Tanpa tingkat kelas, arahkan ke pemilihan tingkat agar misi bisa ditampilkan.
        redirect(gradeLevel === null ? "/kelas-saya?baru=1" : "/belajar?baru=1");
      }
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "23505") continue;
      if ((error as Error).message.includes("NAMA_SUDAH_DIPAKAI")) {
        return { error: "Nama itu sudah dipakai teman sekelas. Pilih nama tampilan lain." };
      }
      if ((error as Error).message.includes("KODE_KELAS_TIDAK_DITEMUKAN")) {
        return { error: "Kode kelas tidak ditemukan." };
      }
      if ((error as Error).message.includes("TINGKAT_TIDAK_COCOK")) {
        return { error: "Tingkat kelasmu tidak sama dengan tingkat kelas itu." };
      }
      throw error;
    }
  }

  return { error: "Gagal membuat akun. Coba lagi beberapa saat lagi." };
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

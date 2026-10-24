/**
 * Penentuan kredensial guru untuk `npm run db:seed`.
 *
 * Di produksi, memakai akun default adalah kesalahan konfigurasi yang berbahaya
 * (password publik di README). Karena itu seed menolak berjalan tanpa env eksplisit.
 */

export const DEFAULT_SEED_TEACHER_EMAIL = "guru@misipintar.test";
export const DEFAULT_SEED_TEACHER_PASSWORD = "GuruMisi2026!";

export type SeedCredentials = {
  email: string;
  password: string;
  usingDefaults: boolean;
};

export class SeedConfigError extends Error {}

export function resolveTeacherSeedCredentials(env: Record<string, string | undefined>): SeedCredentials {
  const email = env.SEED_TEACHER_EMAIL?.trim().toLowerCase();
  const password = env.SEED_TEACHER_PASSWORD;
  const isProduction = env.NODE_ENV === "production";

  if (!isProduction) {
    return {
      email: email || DEFAULT_SEED_TEACHER_EMAIL,
      password: password || DEFAULT_SEED_TEACHER_PASSWORD,
      usingDefaults: !email || !password,
    };
  }

  if (!email || !password) {
    throw new SeedConfigError(
      "Seed dihentikan: di produksi SEED_TEACHER_EMAIL dan SEED_TEACHER_PASSWORD wajib diisi. " +
        "Tanpa itu seed akan membuat akun guru dengan password default yang bisa ditebak.",
    );
  }
  if (password === DEFAULT_SEED_TEACHER_PASSWORD) {
    throw new SeedConfigError(
      "Seed dihentikan: SEED_TEACHER_PASSWORD masih memakai password demo. Gunakan password lain di produksi.",
    );
  }
  if (password.length < 12) {
    throw new SeedConfigError("Seed dihentikan: SEED_TEACHER_PASSWORD di produksi minimal 12 karakter.");
  }

  return { email, password, usingDefaults: false };
}

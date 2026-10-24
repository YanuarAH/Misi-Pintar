import { describe, expect, it } from "vitest";
import {
  DEFAULT_SEED_TEACHER_EMAIL,
  DEFAULT_SEED_TEACHER_PASSWORD,
  SeedConfigError,
  resolveTeacherSeedCredentials,
} from "../scripts/lib/seed-config";

describe("kredensial seed guru", () => {
  it("memakai default hanya di lingkungan non-produksi", () => {
    const credentials = resolveTeacherSeedCredentials({ NODE_ENV: "development" });
    expect(credentials.email).toBe(DEFAULT_SEED_TEACHER_EMAIL);
    expect(credentials.password).toBe(DEFAULT_SEED_TEACHER_PASSWORD);
    expect(credentials.usingDefaults).toBe(true);
  });

  it("menolak seed produksi tanpa email/password eksplisit", () => {
    expect(() => resolveTeacherSeedCredentials({ NODE_ENV: "production" })).toThrow(SeedConfigError);
    expect(() =>
      resolveTeacherSeedCredentials({ NODE_ENV: "production", SEED_TEACHER_EMAIL: "guru@sekolah.id" }),
    ).toThrow(/SEED_TEACHER_PASSWORD wajib diisi/);
  });

  it("menolak password demo dan password pendek di produksi", () => {
    expect(() =>
      resolveTeacherSeedCredentials({
        NODE_ENV: "production",
        SEED_TEACHER_EMAIL: "guru@sekolah.id",
        SEED_TEACHER_PASSWORD: DEFAULT_SEED_TEACHER_PASSWORD,
      }),
    ).toThrow(/password demo/);

    expect(() =>
      resolveTeacherSeedCredentials({
        NODE_ENV: "production",
        SEED_TEACHER_EMAIL: "guru@sekolah.id",
        SEED_TEACHER_PASSWORD: "pendek12",
      }),
    ).toThrow(/minimal 12 karakter/);
  });

  it("menerima kredensial produksi yang valid", () => {
    const credentials = resolveTeacherSeedCredentials({
      NODE_ENV: "production",
      SEED_TEACHER_EMAIL: "Guru@Sekolah.id",
      SEED_TEACHER_PASSWORD: "KataSandiPanjang123",
    });
    expect(credentials).toEqual({
      email: "guru@sekolah.id",
      password: "KataSandiPanjang123",
      usingDefaults: false,
    });
  });
});

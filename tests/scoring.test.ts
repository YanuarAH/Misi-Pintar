import { describe, expect, it } from "vitest";
import { computeScore, computeXp, accuracyLabel, XP_MISSION_BONUS, XP_PER_CORRECT } from "@/lib/scoring";
import { evaluateAchievements } from "@/lib/achievements";

describe("skor dan XP", () => {
  it("menghitung skor persen dengan pembulatan", () => {
    expect(computeScore(10, 10)).toBe(100);
    expect(computeScore(8, 10)).toBe(80);
    expect(computeScore(7, 10)).toBe(70);
    expect(computeScore(1, 3)).toBe(33);
    expect(computeScore(0, 10)).toBe(0);
    expect(computeScore(5, 0)).toBe(0);
  });

  it("10 XP per jawaban benar dan bonus 20 XP saat misi selesai", () => {
    expect(XP_PER_CORRECT).toBe(10);
    expect(XP_MISSION_BONUS).toBe(20);
    expect(computeXp(0, false)).toBe(0);
    expect(computeXp(0, true)).toBe(20);
    expect(computeXp(8, true)).toBe(100);
    expect(computeXp(10, true)).toBe(120);
    expect(computeXp(-3, false)).toBe(0);
  });

  it("jawaban salah tidak mengurangi XP", () => {
    expect(computeXp(3, false)).toBeGreaterThanOrEqual(0);
    expect(computeXp(3, true) - computeXp(2, true)).toBe(10);
  });

  it("memberi label akurasi yang tidak menghakimi", () => {
    expect(accuracyLabel(100)).toBe("Sangat baik");
    expect(accuracyLabel(80)).toBe("Baik");
    expect(accuracyLabel(60)).toBe("Cukup");
    expect(accuracyLabel(30)).toBe("Perlu latihan tambahan");
  });
});

describe("lencana", () => {
  const base = { correctCount: 8, totalQuestions: 10, accuracy: 80, completedMissionCount: 1 };

  it("memberi Penjelajah pada misi pertama dan Bintang Misi saat akurasi 80%", () => {
    expect(evaluateAchievements({ ...base, hadCompletedMissionBefore: false })).toEqual([
      "penjelajah",
      "bintang_misi",
    ]);
  });

  it("tidak memberi Penjelajah lagi setelah ada misi selesai sebelumnya", () => {
    expect(evaluateAchievements({ ...base, hadCompletedMissionBefore: true })).toEqual(["bintang_misi"]);
  });

  it("memberi Sempurna hanya bila semua benar", () => {
    expect(
      evaluateAchievements({
        correctCount: 10,
        totalQuestions: 10,
        accuracy: 100,
        completedMissionCount: 1,
        hadCompletedMissionBefore: false,
      }),
    ).toContain("sempurna");
    expect(evaluateAchievements({ ...base, hadCompletedMissionBefore: true })).not.toContain("sempurna");
  });

  it("memberi Pembelajar Tekun setelah tiga misi selesai", () => {
    const result = evaluateAchievements({ ...base, completedMissionCount: 3, hadCompletedMissionBefore: true });
    expect(result).toContain("pembelajar_tekun");
  });

  it("tidak memberi lencana akurasi bila misi tanpa soal", () => {
    const result = evaluateAchievements({
      correctCount: 0,
      totalQuestions: 0,
      accuracy: 0,
      completedMissionCount: 1,
      hadCompletedMissionBefore: true,
    });
    expect(result).toEqual([]);
  });
});

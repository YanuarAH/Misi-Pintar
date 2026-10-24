import { describe, expect, it } from "vitest";
import { missionSchema, questionSchema, studentRegisterSchema } from "@/lib/validation";
import { questionIssues } from "@/server/teacher";

const validChoice = {
  questionType: "multiple_choice" as const,
  prompt: "Berapa 2 + 2?",
  options: ["3", "4", "5"],
  correctAnswer: "4",
  explanation: "2 + 2 = 4.",
  hint: "Hitung jari.",
  difficulty: "mudah" as const,
  orderIndex: 1,
};

const validNumeric = {
  questionType: "numeric" as const,
  prompt: "Berapa uang kembalian Rp10.000 - Rp8.500?",
  options: [],
  correctAnswer: "1500",
  explanation: "10.000 - 8.500 = 1.500.",
  hint: "Kurangkan.",
  difficulty: "sedang" as const,
  orderIndex: 2,
};

describe("validasi soal", () => {
  it("menerima soal pilihan ganda yang valid", () => {
    expect(questionSchema.safeParse(validChoice).success).toBe(true);
  });

  it("menerima soal angka yang valid", () => {
    expect(questionSchema.safeParse(validNumeric).success).toBe(true);
  });

  it("menolak pertanyaan kosong", () => {
    expect(questionSchema.safeParse({ ...validChoice, prompt: "   " }).success).toBe(false);
  });

  it("menolak pilihan ganda dengan kurang dari 2 pilihan", () => {
    expect(questionSchema.safeParse({ ...validChoice, options: ["4"] }).success).toBe(false);
    expect(questionSchema.safeParse({ ...validChoice, options: [] }).success).toBe(false);
  });

  it("menolak pilihan jawaban duplikat", () => {
    expect(questionSchema.safeParse({ ...validChoice, options: ["4", "4", "5"] }).success).toBe(false);
  });

  it("menolak jawaban yang tidak ada di daftar pilihan", () => {
    expect(questionSchema.safeParse({ ...validChoice, correctAnswer: "7" }).success).toBe(false);
  });

  it("menolak jawaban angka yang bukan angka", () => {
    expect(questionSchema.safeParse({ ...validNumeric, correctAnswer: "seribu lima ratus" }).success).toBe(false);
  });

  it("menolak soal angka yang membawa pilihan jawaban", () => {
    expect(questionSchema.safeParse({ ...validNumeric, options: ["1000", "1500"] }).success).toBe(false);
  });

  it("menolak penjelasan kosong", () => {
    expect(questionSchema.safeParse({ ...validChoice, explanation: "" }).success).toBe(false);
  });

  it("menandai masalah pada data soal yang tersimpan (dipakai sebelum terbit)", () => {
    expect(questionIssues({ ...validChoice, options: validChoice.options, question_type: "multiple_choice", correct_answer: "4", prompt: validChoice.prompt, explanation: validChoice.explanation })).toEqual([]);

    const issues = questionIssues({
      question_type: "multiple_choice",
      options: ["4", "5"],
      correct_answer: "9",
      prompt: "Berapa 2 + 2?",
      explanation: "2 + 2 = 4.",
    });
    expect(issues).toContain("Jawaban benar tidak ada di daftar pilihan.");

    const numericIssues = questionIssues({
      question_type: "numeric",
      options: null,
      correct_answer: "abc",
      prompt: "Berapa hasilnya?",
      explanation: "Penjelasan.",
    });
    expect(numericIssues).toContain("Jawaban angka tidak valid.");
  });
});

describe("validasi misi & pendaftaran", () => {
  it("menolak slug dengan huruf besar atau spasi", () => {
    const base = {
      title: "Misi Baru",
      description: "Deskripsi",
      story: "Cerita",
      learningObjectives: ["Tujuan satu"],
      orderIndex: 1,
      gradeLevel: 5,
      subject: "matematika",
      topic: "pecahan",
    };
    expect(missionSchema.safeParse({ ...base, slug: "Misi Baru" }).success).toBe(false);
    expect(missionSchema.safeParse({ ...base, slug: "misi-baru" }).success).toBe(true);
  });

  it("menolak pendaftaran dengan PIN bukan angka", () => {
    expect(
      studentRegisterSchema.safeParse({
        joinCode: "MISI5A",
        displayName: "Rani",
        pin: "abcd",
        avatarKey: "rubah",
      }).success,
    ).toBe(false);
    expect(
      studentRegisterSchema.safeParse({
        joinCode: "MISI5A",
        displayName: "Rani",
        pin: "1234",
        avatarKey: "rubah",
      }).success,
    ).toBe(true);
  });
});

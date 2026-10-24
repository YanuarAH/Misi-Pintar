import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  adminQuery,
  closePools,
  createClassroom,
  createMission,
  createStudent,
  createTeacher,
  resetData,
} from "./helpers/db";
import {
  cancelAttempt,
  completeAttempt,
  getPracticeState,
  getProgress,
  getTopicMastery,
  listMissionCards,
  startOrResumeAttempt,
  startPracticeAttempt,
  submitAnswer,
} from "@/server/student";
import {
  createQuestion,
  getMissionForEdit,
  getStudentReport,
  setMissionPublished,
  TeacherError,
  updateQuestion,
} from "@/server/teacher";

const viewer = (id: string) => ({ userId: id, role: "student" as const });
const teacherViewer = (id: string) => ({ userId: id, role: "teacher" as const });

let teacherId: string;
let classId: string;
let missionSlug: string;
let mission2Slug: string;
let questionIds: { slot1: string; slot1Variant: string; slot2: string; slot3: string };

beforeAll(async () => {
  await resetData();
  const teacher = await createTeacher();
  teacherId = teacher.id;
  const classroom = await createClassroom(teacher.id);
  classId = classroom.id;

  const mission = await createMission({
    authorId: teacher.id,
    slug: `pasar-uji-${Date.now()}`,
    orderIndex: 1,
    questions: [
      { questionType: "numeric", prompt: "Berapa 4 + 6?", correctAnswer: "10", explanation: "4 + 6 = 10.", topic: "penjumlahan-pengurangan", slot: 1 },
      { questionType: "numeric", prompt: "Berapa 8 + 12?", correctAnswer: "20", explanation: "8 + 12 = 20.", topic: "penjumlahan-pengurangan", slot: 1 },
      {
        questionType: "multiple_choice",
        prompt: "Mana hasil 3 x 4?",
        options: ["7", "12", "34"],
        correctAnswer: "12",
        explanation: "3 x 4 = 12.",
        topic: "perkalian-pembagian",
        slot: 2,
      },
      { questionType: "numeric", prompt: "Berapa 15 : 3?", correctAnswer: "5", explanation: "15 : 3 = 5.", topic: "desimal", slot: 3 },
    ],
  });
  missionSlug = mission.slug;

  const second = await createMission({
    authorId: teacher.id,
    slug: `koki-uji-${Date.now()}`,
    orderIndex: 2,
    questions: [
      { questionType: "numeric", prompt: "Berapa 1 + 1?", correctAnswer: "2", explanation: "1 + 1 = 2.", slot: 1 },
    ],
  });
  mission2Slug = second.slug;

  const rows = await adminQuery<{ id: string; slot_index: number; variant_index: number }>(
    "select id, slot_index, variant_index from questions where mission_id = $1 order by slot_index, variant_index",
    [mission.id],
  );
  questionIds = {
    slot1: rows.find((row) => row.slot_index === 1 && row.variant_index === 0)!.id,
    slot1Variant: rows.find((row) => row.slot_index === 1 && row.variant_index === 1)!.id,
    slot2: rows.find((row) => row.slot_index === 2)!.id,
    slot3: rows.find((row) => row.slot_index === 3)!.id,
  };
});

afterAll(async () => {
  await closePools();
});

/**
 * Menjawab seluruh soal satu percobaan: benar semua, kecuali slot yang diminta salah.
 * Jawaban benar diambil dari database agar tidak bergantung pada varian yang terpilih.
 */
async function playMission(
  studentId: string,
  options: { wrongSlots?: number[] } = {},
): Promise<{ attemptId: string; ids: Record<string, string> }> {
  const started = await startOrResumeAttempt(viewer(studentId), studentId, missionSlug);
  expect(started.ok).toBe(true);
  if (!started.ok) throw new Error("gagal memulai misi");

  // Soal disajikan urut slot, jadi indeks + 1 sama dengan nomor slot.
  const bySlot = new Map<number, string>();
  for (const [index, question] of started.state.questions.entries()) {
    bySlot.set(index + 1, question.id);
  }

  const ids = { slot1: bySlot.get(1)!, slot2: bySlot.get(2)!, slot3: bySlot.get(3)! };
  const wrongSlots = new Set(options.wrongSlots ?? []);
  const details = await adminQuery<{ id: string; question_type: string; options: string[] | null; correct_answer: string }>(
    "select id, question_type, options, correct_answer from questions where id = any($1::uuid[])",
    [started.state.questions.map((question) => question.id)],
  );

  for (const [index, question] of started.state.questions.entries()) {
    const detail = details.find((row) => row.id === question.id)!;
    const shouldBeWrong = wrongSlots.has(index + 1);
    let answer = detail.correct_answer;
    if (shouldBeWrong) {
      answer =
        detail.question_type === "multiple_choice"
          ? (detail.options ?? []).find((option) => option !== detail.correct_answer) ?? "salah"
          : String(Number(detail.correct_answer) + 3);
    }
    const submitted = await submitAnswer(viewer(studentId), studentId, {
      attemptId: started.state.attemptId,
      questionId: question.id,
      answer,
    });
    expect(submitted.ok).toBe(true);
  }

  const done = await completeAttempt(viewer(studentId), studentId, started.state.attemptId);
  expect(done.ok).toBe(true);
  return { attemptId: started.state.attemptId, ids };
}

describe("bank soal varian", () => {
  it("menyajikan tepat satu soal per slot dan menghitung soal per percobaan dari slot", async () => {
    const student = await createStudent({ classId });
    const cards = await listMissionCards(viewer(student.id), student.id);
    const card = cards.find((item) => item.slug === missionSlug);
    expect(card?.questionCount).toBe(3);

    const started = await startOrResumeAttempt(viewer(student.id), student.id, missionSlug);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    expect(started.state.questions).toHaveLength(3);
    expect(new Set(started.state.questions.map((question) => question.id)).size).toBe(3);

    const slots = await adminQuery<{ id: string; slot_index: number }>(
      "select id, slot_index from questions where id = any($1::uuid[])",
      [started.state.questions.map((question) => question.id)],
    );
    expect(new Set(slots.map((row) => row.slot_index)).size).toBe(3);
    expect(slots.some((row) => row.id === questionIds.slot1Variant || row.id === questionIds.slot1)).toBe(true);
  });

  it("memilih varian secara acak antarpercobaan", async () => {
    const student = await createStudent({ classId });
    const seen = new Set<string>();

    for (let attempt = 0; attempt < 14; attempt += 1) {
      const started = await startOrResumeAttempt(viewer(student.id), student.id, missionSlug);
      expect(started.ok).toBe(true);
      if (!started.ok) return;
      const slot1 = started.state.questions[0].id;
      expect([questionIds.slot1, questionIds.slot1Variant]).toContain(slot1);
      seen.add(slot1);
      await cancelAttempt(viewer(student.id), student.id, started.state.attemptId);
    }

    expect(seen.size).toBe(2);
  });
});

describe("latihan soal yang salah", () => {
  it("membuat latihan hanya dari soal yang salah, tanpa XP dan tanpa lencana", async () => {
    const student = await createStudent({ classId });
    const played = await playMission(student.id, { wrongSlots: [2] });

    const progressAfterMission = await getProgress(viewer(student.id), student.id);
    expect(progressAfterMission.xp).toBe(40);

    const practice = await startPracticeAttempt(viewer(student.id), student.id, played.attemptId);
    expect(practice.ok).toBe(true);
    if (!practice.ok) return;

    const state = await getPracticeState(viewer(student.id), student.id, practice.attemptId);
    expect(state).not.toBeNull();
    expect(state!.mode).toBe("practice");
    expect(state!.questions).toHaveLength(1);
    expect(state!.questions[0].id).toBe(played.ids.slot2);

    const answered = await submitAnswer(viewer(student.id), student.id, {
      attemptId: practice.attemptId,
      questionId: played.ids.slot2,
      answer: "12",
    });
    expect(answered.ok && answered.feedback.isCorrect).toBe(true);

    const finished = await completeAttempt(viewer(student.id), student.id, practice.attemptId);
    expect(finished.ok).toBe(true);

    const progress = await getProgress(viewer(student.id), student.id);
    expect(progress.xp).toBe(40);
    const practiceRow = progress.history.find((row) => row.id === practice.attemptId);
    expect(practiceRow?.mode).toBe("practice");
    expect(practiceRow?.xpEarned).toBe(0);

    const cards = await listMissionCards(viewer(student.id), student.id);
    expect(cards.find((card) => card.slug === missionSlug)?.attemptCount).toBe(1);

    const achievements = await adminQuery<{ achievement_key: string }>(
      "select achievement_key from user_achievements where student_id = $1",
      [student.id],
    );
    expect(achievements.map((row) => row.achievement_key)).not.toContain("sempurna");
  });

  it("menolak latihan tanpa soal salah dan menolak latihan dari latihan", async () => {
    const student = await createStudent({ classId });
    const perfect = await playMission(student.id);

    const none = await startPracticeAttempt(viewer(student.id), student.id, perfect.attemptId);
    expect(none.ok).toBe(false);

    const partial = await createStudent({ classId });
    const played = await playMission(partial.id, { wrongSlots: [2] });
    const practice = await startPracticeAttempt(viewer(partial.id), partial.id, played.attemptId);
    expect(practice.ok).toBe(true);
    if (!practice.ok) return;

    const nested = await startPracticeAttempt(viewer(partial.id), partial.id, practice.attemptId);
    expect(nested.ok).toBe(false);
  });

  it("latihan tidak bisa dibuka siswa lain", async () => {
    const owner = await createStudent({ classId });
    const other = await createStudent({ classId });
    const played = await playMission(owner.id, { wrongSlots: [2] });
    const practice = await startPracticeAttempt(viewer(owner.id), owner.id, played.attemptId);
    expect(practice.ok).toBe(true);
    if (!practice.ok) return;

    expect(await getPracticeState(viewer(other.id), other.id, practice.attemptId)).toBeNull();
    expect(await getPracticeState(viewer(owner.id), other.id, practice.attemptId)).toBeNull();
  });
});

describe("peta kemampuan per topik", () => {
  it("mengagregasi jawaban per topik dan memberi label tingkat", async () => {
    const student = await createStudent({ classId });
    await playMission(student.id, { wrongSlots: [2] });

    const topics = await getTopicMastery(viewer(student.id), student.id);
    const sum = topics.find((topic) => topic.key === "penjumlahan-pengurangan");
    expect(sum?.answers).toBe(1);
    expect(sum?.accuracy).toBe(100);
    expect(sum?.level).toBe("kuat");

    const multiply = topics.find((topic) => topic.key === "perkalian-pembagian");
    expect(multiply?.answers).toBe(1);
    expect(multiply?.accuracy).toBe(0);
    expect(multiply?.level).toBe("perlu-latihan");

    const untouched = topics.find((topic) => topic.key === "volume");
    expect(untouched?.answers).toBe(0);
    expect(untouched?.level).toBe("belum-ada");
  });

  it("guru melihat peta topik siswa di kelasnya", async () => {
    const student = await createStudent({ classId });
    await playMission(student.id);

    const report = await getStudentReport(teacherViewer(teacherId), student.id);
    expect(report).not.toBeNull();
    const withAnswers = report!.topics.filter((topic) => topic.answers > 0);
    expect(withAnswers.length).toBeGreaterThanOrEqual(2);
  });
});

describe("guru mengelola slot dan topik", () => {
  it("soal baru pada slot yang sudah terisi menjadi varian berikutnya", async () => {
    const mission = await createMission({
      authorId: teacherId,
      slug: `slot-uji-${Date.now()}`,
      orderIndex: 6,
      questions: [
        { questionType: "numeric", prompt: "Berapa 6 + 6?", correctAnswer: "12", explanation: "6 + 6 = 12.", slot: 1 },
        { questionType: "numeric", prompt: "Berapa 7 + 7?", correctAnswer: "14", explanation: "7 + 7 = 14.", slot: 2 },
      ],
    });

    const created = await createQuestion(teacherViewer(teacherId), mission.id, {
      questionType: "numeric",
      prompt: "Berapa 5 + 5?",
      options: [],
      correctAnswer: "10",
      explanation: "5 + 5 = 10.",
      hint: "",
      difficulty: "mudah",
      orderIndex: 3,
      topic: "penjumlahan-pengurangan",
      slotIndex: 1,
    });

    expect(created.slot_index).toBe(1);
    expect(created.variant_index).toBe(1);
    expect(created.topic).toBe("penjumlahan-pengurangan");

    const edit = await getMissionForEdit(teacherViewer(teacherId), mission.id, teacherId);
    expect(edit?.slotCount).toBe(2);
    expect(edit?.questions.filter((question) => question.slot_index === 1)).toHaveLength(2);
  });

  it("guru dapat memindahkan soal ke slot lain dan mengganti topiknya", async () => {
    const mission = await createMission({
      authorId: teacherId,
      slug: `pindah-uji-${Date.now()}`,
      orderIndex: 7,
      questions: [
        { questionType: "numeric", prompt: "Berapa 9 + 1?", correctAnswer: "10", explanation: "9 + 1 = 10.", slot: 1 },
      ],
    });
    const before = await adminQuery<{ id: string }>("select id from questions where mission_id = $1", [mission.id]);

    const updated = await updateQuestion(teacherViewer(teacherId), before[0].id, {
      questionType: "numeric",
      prompt: "Berapa 9 + 1?",
      options: [],
      correctAnswer: "10",
      explanation: "9 + 1 = 10.",
      hint: "",
      difficulty: "mudah",
      orderIndex: 1,
      topic: "volume",
      slotIndex: 3,
    });

    expect(updated.slot_index).toBe(3);
    expect(updated.topic).toBe("volume");
  });
});

describe("validasi terbit per slot", () => {
  it("menolak terbit bila ada slot tanpa soal valid", async () => {
    const draft = await createMission({
      authorId: teacherId,
      slug: `draf-uji-${Date.now()}`,
      orderIndex: 5,
      published: false,
      questions: [
        { questionType: "numeric", prompt: "Berapa 2 + 2?", correctAnswer: "4", explanation: "2 + 2 = 4.", slot: 1 },
        {
          questionType: "multiple_choice",
          prompt: "Pilih hasil 5 x 5",
          options: ["10", "25"],
          correctAnswer: "30",
          explanation: "5 x 5 = 25.",
          slot: 2,
        },
      ],
    });

    await expect(setMissionPublished(teacherViewer(teacherId), draft.id, true)).rejects.toThrow(TeacherError);
    await expect(setMissionPublished(teacherViewer(teacherId), draft.id, true)).rejects.toThrow(/Slot 2/);
  });
});

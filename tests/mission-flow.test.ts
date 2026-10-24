import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closePool } from "@/lib/db";
import {
  cancelAttempt,
  completeAttempt,
  getAttemptResult,
  getOpenAttemptState,
  getProgress,
  listMissionCards,
  startOrResumeAttempt,
  submitAnswer,
} from "@/server/student";
import {
  adminQuery,
  asViewer,
  closePools,
  createClassroom,
  createMission,
  createStudent,
  createTeacher,
  getQuestionIds,
  resetData,
} from "./helpers/db";

const CORRECT_CHOICE = "Rp12.000";
const NUMERIC_ANSWER = "1500";

let teacher: { id: string };
let student: { id: string };
let otherStudent: { id: string };
let mission1: { id: string; slug: string };
let mission2: { id: string; slug: string };
let questionIds: string[] = [];
let classroomId = "";
let attemptId = "";
let firstCompletedAt: Date | null = null;

const studentViewer = () => ({ userId: student.id, role: "student" as const });

beforeAll(async () => {
  await resetData();
  teacher = await createTeacher("Pak Penguji");
  const classroom = await createClassroom(teacher.id, "Kelas Uji Alur");
  classroomId = classroom.id;
  student = await createStudent({ classId: classroom.id });
  otherStudent = await createStudent({ classId: classroom.id });

  mission1 = await createMission({
    authorId: teacher.id,
    orderIndex: 1,
    slug: `alur-satu-${Date.now()}`,
    questions: [
      {
        questionType: "multiple_choice",
        prompt: "Rani membeli buku Rp8.000 dan pensil Rp4.000. Berapa total belanja?",
        options: ["Rp10.000", "Rp12.000", "Rp14.000"],
        correctAnswer: CORRECT_CHOICE,
        explanation: "8.000 + 4.000 = 12.000.",
        hint: "Jumlahkan kedua harga.",
      },
      {
        questionType: "multiple_choice",
        prompt: "Mana pecahan yang lebih besar, 3/4 atau 2/4?",
        options: ["3/4", "2/4", "Sama besar"],
        correctAnswer: "3/4",
        explanation: "Penyebut sama, pembilang 3 lebih besar dari 2.",
        hint: "Bandingkan pembilangnya.",
      },
      {
        questionType: "numeric",
        prompt: "Berapa kembalian dari Rp10.000 untuk belanja Rp8.500?",
        correctAnswer: NUMERIC_ANSWER,
        explanation: "10.000 - 8.500 = 1.500.",
        hint: "Kurangkan harga dari uang.",
        answerUnit: "rupiah",
      },
    ],
  });

  mission2 = await createMission({
    authorId: teacher.id,
    orderIndex: 2,
    slug: `alur-dua-${Date.now()}`,
    questions: [
      {
        questionType: "numeric",
        prompt: "Berapa luas persegi dengan sisi 4 cm?",
        correctAnswer: "16",
        explanation: "4 x 4 = 16.",
      },
    ],
  });

  questionIds = await getQuestionIds(mission1.id);
});

afterAll(async () => {
  await closePool();
  await closePools();
});

describe("alur misi siswa", () => {
  it("misi kedua terkunci sebelum misi pertama selesai", async () => {
    const cards = await listMissionCards(studentViewer(), student.id);
    const first = cards.find((card) => card.id === mission1.id);
    const second = cards.find((card) => card.id === mission2.id);
    expect(first?.unlocked).toBe(true);
    expect(second?.unlocked).toBe(false);
  });

  it("membaca misi tidak membuat percobaan baru (aman untuk prefetch)", async () => {
    const count = async () =>
      Number(
        (
          await adminQuery<{ count: string }>(
            "select count(*)::text as count from attempts where student_id = $1",
            [otherStudent.id],
          )
        )[0].count,
      );

    const before = await count();
    expect(await getOpenAttemptState({ userId: otherStudent.id, role: "student" }, otherStudent.id, mission2.slug)).toBeNull();
    expect(await getOpenAttemptState({ userId: otherStudent.id, role: "student" }, otherStudent.id, mission1.slug)).toBeNull();
    expect(await count()).toBe(before);
  });

  it("memulai misi mengirim soal tanpa jawaban benar", async () => {
    const result = await startOrResumeAttempt(studentViewer(), student.id, mission1.slug);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.questions).toHaveLength(3);
    const payload = JSON.stringify(result.state);
    // Pilihan jawaban memang dikirim (termasuk yang benar), tetapi kunci jawaban
    // dan pembahasan tidak boleh ikut ke browser sebelum siswa menjawab.
    expect(payload).not.toContain("10.000 - 8.500 = 1.500");
    expect(payload).not.toContain('"correctAnswer"');
    expect(payload).not.toContain('"explanation"');
    expect(payload).not.toContain("1500");
    for (const question of result.state.questions) {
      expect(Object.keys(question).sort()).toEqual(
        ["answerUnit", "difficulty", "hint", "id", "options", "orderIndex", "prompt", "type"].sort(),
      );
      expect(question).not.toHaveProperty("correctAnswer");
      expect(question).not.toHaveProperty("explanation");
    }

    attemptId = result.state.attemptId;
  });

  it("menolak jawaban salah dan tidak memberi XP", async () => {
    const result = await submitAnswer(studentViewer(), student.id, {
      attemptId,
      questionId: questionIds[0],
      answer: "Rp10.000",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.feedback.isCorrect).toBe(false);
    expect(result.feedback.correctAnswer).toBe(CORRECT_CHOICE);
    expect(result.feedback.explanation.length).toBeGreaterThan(5);

    const [attempt] = await adminQuery<{ xp_earned: number; score: number; completed_at: Date | null }>(
      "select xp_earned, score, completed_at from attempts where id = $1",
      [attemptId],
    );
    expect(attempt.xp_earned).toBe(0);
    expect(attempt.score).toBe(0);
    expect(attempt.completed_at).toBeNull();
  });

  it("menilai jawaban benar, termasuk normalisasi angka", async () => {
    const second = await submitAnswer(studentViewer(), student.id, {
      attemptId,
      questionId: questionIds[1],
      answer: "3/4",
    });
    expect(second.ok && second.feedback.isCorrect).toBe(true);

    const third = await submitAnswer(studentViewer(), student.id, {
      attemptId,
      questionId: questionIds[2],
      answer: "Rp 1.500",
    });
    expect(third.ok && third.feedback.isCorrect).toBe(true);
  });

  it("menolak jawaban untuk soal di luar misi", async () => {
    const [otherQuestion] = await adminQuery<{ id: string }>(
      "select id from questions where mission_id = $1",
      [mission2.id],
    );
    const result = await submitAnswer(studentViewer(), student.id, {
      attemptId,
      questionId: otherQuestion.id,
      answer: "16",
    });
    expect(result.ok).toBe(false);
  });

  it("menyelesaikan misi dengan skor dan XP yang dihitung server", async () => {
    const result = await completeAttempt(studentViewer(), student.id, attemptId);
    expect(result.ok).toBe(true);

    const [attempt] = await adminQuery<{
      score: number;
      correct_count: number;
      total_questions: number;
      xp_earned: number;
      completed_at: Date;
    }>("select score, correct_count, total_questions, xp_earned, completed_at from attempts where id = $1", [
      attemptId,
    ]);

    expect(attempt.total_questions).toBe(3);
    expect(attempt.correct_count).toBe(2);
    expect(attempt.score).toBe(67);
    expect(attempt.xp_earned).toBe(2 * 10 + 20);
    expect(attempt.completed_at).not.toBeNull();
    firstCompletedAt = attempt.completed_at;
  });

  it("penyelesaian ganda tidak menambah XP lagi", async () => {
    const again = await completeAttempt(studentViewer(), student.id, attemptId);
    expect(again.ok).toBe(true);

    const [row] = await adminQuery<{ xp: string; count: string }>(
      "select coalesce(sum(xp_earned),0)::text as xp, count(*)::text as count from attempts where student_id = $1 and mission_id = $2",
      [student.id, mission1.id],
    );
    expect(row.xp).toBe("40");
    expect(row.count).toBe("1");
  });

  it("membuka misi kedua setelah misi pertama selesai", async () => {
    const cards = await listMissionCards(studentViewer(), student.id);
    const second = cards.find((card) => card.id === mission2.id);
    expect(second?.unlocked).toBe(true);
  });

  it("mengulang misi membuat percobaan baru tanpa menghapus histori", async () => {
    const second = await startOrResumeAttempt(studentViewer(), student.id, mission1.slug);
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    expect(second.state.attemptId).not.toBe(attemptId);
    expect(second.state.startIndex).toBe(0);

    const attempts = await adminQuery<{ id: string }>(
      "select id from attempts where student_id = $1 and mission_id = $2 order by started_at",
      [student.id, mission1.id],
    );
    expect(attempts).toHaveLength(2);
    expect(attempts[0].id).toBe(attemptId);
  });

  it("percobaan yang sudah selesai tidak dapat diubah lagi", async () => {
    const [open] = await adminQuery<{ id: string }>(
      "select id from attempts where student_id = $1 and mission_id = $2 and completed_at is null",
      [student.id, mission1.id],
    );
    expect(open.id).not.toBe(attemptId);

    const result = await submitAnswer(studentViewer(), student.id, {
      attemptId,
      questionId: questionIds[0],
      answer: CORRECT_CHOICE,
    });
    expect(result.ok).toBe(false);

    const answers = await adminQuery<{ count: string }>(
      "select count(*)::text as count from attempt_answers where attempt_id = $1",
      [attemptId],
    );
    expect(answers[0].count).toBe("3");
  });

  it("mengirim jawaban dua kali tidak menggandakan data", async () => {
    const [open] = await adminQuery<{ id: string }>(
      "select id from attempts where student_id = $1 and mission_id = $2 and completed_at is null",
      [student.id, mission1.id],
    );
    const first = await submitAnswer(studentViewer(), student.id, {
      attemptId: open.id,
      questionId: questionIds[0],
      answer: CORRECT_CHOICE,
    });
    const second = await submitAnswer(studentViewer(), student.id, {
      attemptId: open.id,
      questionId: questionIds[0],
      answer: "Rp14.000",
    });
    expect(first.ok && first.feedback.isCorrect).toBe(true);
    expect(second.ok && second.feedback.alreadyAnswered).toBe(true);
    expect(second.ok && second.feedback.isCorrect).toBe(true);

    const answers = await adminQuery<{ count: string }>(
      "select count(*)::text as count from attempt_answers where attempt_id = $1",
      [open.id],
    );
    expect(answers[0].count).toBe("1");
  });

  it("siswa lain tidak dapat melihat hasil percobaan ini", async () => {
    const foreign = await getAttemptResult({ userId: otherStudent.id, role: "student" }, attemptId);
    expect(foreign).toBeNull();
  });

  it("riwayat tetap utuh setelah soal diarsipkan", async () => {
    const result = await getAttemptResult(studentViewer(), attemptId);
    expect(result).not.toBeNull();
    expect(result!.answers).toHaveLength(3);

    await adminQuery("update questions set archived_at = now() where id = $1", [questionIds[2]]);
    const afterArchive = await getAttemptResult(studentViewer(), attemptId);
    expect(afterArchive!.answers).toHaveLength(3);
    expect(afterArchive!.answers.map((answer) => answer.prompt)).toContain(
      "Berapa kembalian dari Rp10.000 untuk belanja Rp8.500?",
    );
    expect(afterArchive!.answers.every((answer) => answer.explanation.length > 0)).toBe(true);

    // Kembalikan soal agar test berikutnya tetap memakai misi 3 soal.
    await adminQuery("update questions set archived_at = null where id = $1", [questionIds[2]]);
  });

  it("mencatat progres dan riwayat percobaan", async () => {
    const progress = await getProgress(studentViewer(), student.id);
    expect(progress.xp).toBe(40);
    expect(progress.completedMissions).toBeGreaterThanOrEqual(1);
    expect(progress.history.length).toBeGreaterThanOrEqual(1);
    expect(progress.history.some((item) => item.completedAt !== null)).toBe(true);
    const keys = progress.achievements.map((item) => item.key);
    expect(keys).toContain("penjelajah");
    // Akurasi 67% belum mencapai ambang Bintang Misi (80%).
    expect(keys).not.toContain("bintang_misi");
  });

  it("lencana tidak pernah terduplikasi", async () => {
    const rows = await adminQuery<{ achievement_key: string; count: string }>(
      "select achievement_key, count(*)::text as count from user_achievements where student_id = $1 group by achievement_key",
      [student.id],
    );
    for (const row of rows) expect(row.count).toBe("1");
  });
});

describe("keamanan data percobaan", () => {
  it("siswa tidak dapat menulis is_correct palsu lewat SQL langsung", async () => {
    await expect(
      asViewer(studentViewer(), (query) => query("insert into attempt_answers (attempt_id, question_id, submitted_answer, is_correct) values ($1, $2, 'x', true)", [attemptId, questionIds[0]])),
    ).rejects.toThrow(/duplicate key|unique|row-level security/i);
  });

  it("percobaan milik siswa lain tidak dapat diselesaikan", async () => {
    const result = await completeAttempt({ userId: otherStudent.id, role: "student" }, otherStudent.id, attemptId);
    expect(result.ok).toBe(false);
  });
});

describe("aturan XP dan syarat penyelesaian", () => {
  const viewerOf = (id: string) => ({ userId: id, role: "student" as const });

  async function runAttempt(studentId: string, answers: string[]): Promise<string> {
    const started = await startOrResumeAttempt(viewerOf(studentId), studentId, mission1.slug);
    expect(started.ok).toBe(true);
    if (!started.ok) throw new Error("gagal memulai misi");

    for (const [index, question] of started.state.questions.entries()) {
      const result = await submitAnswer(viewerOf(studentId), studentId, {
        attemptId: started.state.attemptId,
        questionId: question.id,
        answer: answers[index] ?? "",
      });
      expect(result.ok).toBe(true);
    }

    const completed = await completeAttempt(viewerOf(studentId), studentId, started.state.attemptId);
    expect(completed.ok).toBe(true);
    return started.state.attemptId;
  }

  it("menolak menyelesaikan misi bila masih ada soal yang belum dijawab", async () => {
    const fresh = await createStudent({ classId: classroomId });
    const started = await startOrResumeAttempt(viewerOf(fresh.id), fresh.id, mission1.slug);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const answered = await submitAnswer(viewerOf(fresh.id), fresh.id, {
      attemptId: started.state.attemptId,
      questionId: started.state.questions[0].id,
      answer: CORRECT_CHOICE,
    });
    expect(answered.ok).toBe(true);

    const completed = await completeAttempt(viewerOf(fresh.id), fresh.id, started.state.attemptId);
    expect(completed.ok).toBe(false);

    const [row] = await adminQuery<{ xp_earned: number; completed_at: Date | null }>(
      "select xp_earned, completed_at from attempts where id = $1",
      [started.state.attemptId],
    );
    expect(row.xp_earned).toBe(0);
    expect(row.completed_at).toBeNull();
  });

  it("XP hanya bertambah ketika rekor skor membaik, sehingga tidak bisa difarming", async () => {
    const fresh = await createStudent({ classId: classroomId });

    // Percobaan 1: 2 dari 3 benar -> 40 XP
    await runAttempt(fresh.id, [CORRECT_CHOICE, "3/4", "1600"]);
    // Percobaan 2: semua benar -> potensi 50, rekor sebelumnya 40, jadi +10
    await runAttempt(fresh.id, [CORRECT_CHOICE, "3/4", NUMERIC_ANSWER]);
    // Percobaan 3: sama sempurna -> tidak menambah XP
    const third = await runAttempt(fresh.id, [CORRECT_CHOICE, "3/4", NUMERIC_ANSWER]);

    const [row] = await adminQuery<{ xp: string; count: string; best: number }>(
      `select coalesce(sum(xp_earned),0)::text as xp, count(*)::text as count, max(score) as best
         from attempts where student_id = $1`,
      [fresh.id],
    );
    expect(row.count).toBe("3");
    expect(row.xp).toBe("50");
    expect(row.best).toBe(100);

    const result = await getAttemptResult(viewerOf(fresh.id), third);
    expect(result?.attempt.xp_earned).toBe(0);
    expect(result?.previousBestXp).toBe(50);
    expect(result?.xpPotential).toBe(50);
  });

  it("resume setelah semua soal dijawab ditandai allAnswered", async () => {
    const fresh = await createStudent({ classId: classroomId });
    const started = await startOrResumeAttempt(viewerOf(fresh.id), fresh.id, mission1.slug);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    for (const question of started.state.questions) {
      const correctAnswer =
        question.id === questionIds[2] ? NUMERIC_ANSWER : question.id === questionIds[1] ? "3/4" : CORRECT_CHOICE;
      await submitAnswer(viewerOf(fresh.id), fresh.id, {
        attemptId: started.state.attemptId,
        questionId: question.id,
        answer: correctAnswer,
      });
    }

    const state = await getOpenAttemptState(viewerOf(fresh.id), fresh.id, mission1.slug);
    expect(state?.allAnswered).toBe(true);
    expect(state?.answeredIndexes).toHaveLength(3);
    expect(state?.startIndex).toBe(2);
  });

  it("percobaan ulang dengan skor lebih rendah tidak mengurangi XP", async () => {
    const fresh = await createStudent({ classId: classroomId });
    await runAttempt(fresh.id, [CORRECT_CHOICE, "3/4", NUMERIC_ANSWER]); // 3/3 -> 50
    await runAttempt(fresh.id, ["Rp10.000", "2/4", "1600"]); // 0/3 -> 0

    const [row] = await adminQuery<{ xp: string }>(
      "select coalesce(sum(xp_earned),0)::text as xp from attempts where student_id = $1",
      [fresh.id],
    );
    expect(row.xp).toBe("50");

    const progress = await getProgress(viewerOf(fresh.id), fresh.id);
    expect(progress.xp).toBe(50);
  });
});

describe("pembatalan percobaan", () => {
  const viewerOf = (id: string) => ({ userId: id, role: "student" as const });

  it("siswa dapat membatalkan percobaannya yang belum selesai", async () => {
    const fresh = await createStudent({ classId: classroomId });
    const started = await startOrResumeAttempt(viewerOf(fresh.id), fresh.id, mission1.slug);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    await submitAnswer(viewerOf(fresh.id), fresh.id, {
      attemptId: started.state.attemptId,
      questionId: started.state.questions[0].id,
      answer: CORRECT_CHOICE,
    });

    const cancelled = await cancelAttempt(viewerOf(fresh.id), fresh.id, started.state.attemptId);
    expect(cancelled.ok).toBe(true);

    const remaining = await adminQuery<{ id: string }>("select id from attempts where id = $1", [
      started.state.attemptId,
    ]);
    expect(remaining).toHaveLength(0);
  });

  it("percobaan yang sudah selesai tidak dapat dibatalkan", async () => {
    const cancelled = await cancelAttempt(studentViewer(), student.id, attemptId);
    expect(cancelled.ok).toBe(false);

    const remaining = await adminQuery<{ id: string }>("select id from attempts where id = $1", [attemptId]);
    expect(remaining).toHaveLength(1);
  });

  it("siswa lain tidak dapat membatalkan percobaan orang lain", async () => {
    const fresh = await createStudent({ classId: classroomId });
    const started = await startOrResumeAttempt(viewerOf(fresh.id), fresh.id, mission1.slug);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const cancelled = await cancelAttempt(viewerOf(otherStudent.id), otherStudent.id, started.state.attemptId);
    expect(cancelled.ok).toBe(false);

    const remaining = await adminQuery<{ id: string }>("select id from attempts where id = $1", [
      started.state.attemptId,
    ]);
    expect(remaining).toHaveLength(1);
  });

  it("riwayat menandai percobaan yang masih berjalan", async () => {
    const fresh = await createStudent({ classId: classroomId });
    const started = await startOrResumeAttempt(viewerOf(fresh.id), fresh.id, mission1.slug);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const progress = await getProgress(viewerOf(fresh.id), fresh.id);
    const inProgress = progress.history.filter((item) => item.inProgress);
    expect(inProgress).toHaveLength(1);
    expect(inProgress[0].answeredCount).toBe(0);
    expect(inProgress[0].completedAt).toBeNull();
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closePool } from "@/lib/db";
import {
  TeacherError,
  archiveQuestion,
  createMission,
  createQuestion,
  getClassDetail,
  getMissionForEdit,
  getStudentReport,
  getTeacherDashboard,
  listTeacherMissions,
  resetStudentPin,
  setMissionPublished,
} from "@/server/teacher";
import { getAttemptResult } from "@/server/student";
import { missionSchema } from "@/lib/validation";
import {
  adminQuery,
  closePools,
  createClassroom,
  createMission as createMissionFixture,
  createStudent,
  createTeacher,
  getQuestionIds,
  resetData,
} from "./helpers/db";

let teacherA: { id: string };
let teacherB: { id: string };
let classA: { id: string; joinCode: string };
let classB: { id: string; joinCode: string };
let studentA: { id: string };
let studentB: { id: string };
let missionA: { id: string; slug: string };
let attemptA: string;

const viewerA = () => ({ userId: teacherA.id, role: "teacher" as const });
const viewerB = () => ({ userId: teacherB.id, role: "teacher" as const });

beforeAll(async () => {
  await resetData();
  teacherA = await createTeacher("Bu Guru A");
  teacherB = await createTeacher("Pak Guru B");
  classA = await createClassroom(teacherA.id, "Kelas A");
  classB = await createClassroom(teacherB.id, "Kelas B");
  studentA = await createStudent({ classId: classA.id });
  studentB = await createStudent({ classId: classB.id });

  missionA = await createMissionFixture({
    authorId: teacherA.id,
    orderIndex: 1,
    slug: `guru-misi-${Date.now()}`,
    questions: [
      {
        questionType: "multiple_choice",
        prompt: "Berapa 8 x 7?",
        options: ["54", "56", "64"],
        correctAnswer: "56",
        explanation: "8 x 7 = 56.",
      },
    ],
  });

  const questionIds = await getQuestionIds(missionA.id);
  const [attempt] = await adminQuery<{ id: string }>(
    `insert into attempts (student_id, mission_id, total_questions, question_ids, score, correct_count, xp_earned, completed_at)
     values ($1, $2, 1, $3, 100, 1, 30, now()) returning id`,
    [studentA.id, missionA.id, questionIds],
  );
  attemptA = attempt.id;

  await adminQuery(
    `insert into attempt_answers (attempt_id, question_id, submitted_answer, is_correct)
     values ($1, $2, '56', true)`,
    [attemptA, questionIds[0]],
  );
});

afterAll(async () => {
  await closePool();
  await closePools();
});

describe("batas akses guru", () => {
  it("guru tidak dapat membuka kelas guru lain", async () => {
    expect(await getClassDetail(viewerB(), classA.id)).toBeNull();
    expect(await getClassDetail(viewerA(), classA.id)).not.toBeNull();
  });

  it("guru tidak dapat membuka laporan siswa di kelas lain", async () => {
    expect(await getStudentReport(viewerB(), studentA.id)).toBeNull();
    expect(await getStudentReport(viewerA(), studentA.id)).not.toBeNull();
    expect(await getStudentReport(viewerA(), studentB.id)).toBeNull();
  });

  it("guru tidak dapat membuka hasil percobaan siswa kelas lain", async () => {
    expect(await getAttemptResult(viewerB(), attemptA)).toBeNull();
    expect(await getAttemptResult(viewerA(), attemptA)).not.toBeNull();
  });

  it("guru hanya melihat misi miliknya sendiri", async () => {
    const missionsOfB = await listTeacherMissions(viewerB(), teacherB.id);
    expect(missionsOfB.map((mission) => mission.id)).not.toContain(missionA.id);

    const missionsOfA = await listTeacherMissions(viewerA(), teacherA.id);
    expect(missionsOfA.map((mission) => mission.id)).toContain(missionA.id);
  });

  it("guru tidak dapat mengedit misi guru lain", async () => {
    expect(await getMissionForEdit(viewerB(), missionA.id, teacherB.id)).toBeNull();
    expect(await getMissionForEdit(viewerA(), missionA.id, teacherA.id)).not.toBeNull();
  });

  it("guru tidak dapat mengatur ulang PIN siswa kelas lain", async () => {
    await expect(resetStudentPin(viewerB(), studentA.id, "9999")).rejects.toThrow();
    await expect(resetStudentPin(viewerA(), studentA.id, "4321")).resolves.toBeUndefined();
  });

  it("ringkasan guru hanya menghitung kelasnya", async () => {
    const secondClassA = await createClassroom(teacherA.id, "Kelas A Kedua");
    await adminQuery("insert into class_members (class_id, student_id) values ($1, $2)", [
      secondClassA.id,
      studentA.id,
    ]);

    const dashboardB = await getTeacherDashboard(viewerB(), teacherB.id);
    expect(dashboardB.summary.students).toBe(1);
    expect(dashboardB.summary.completions).toBe(0);
    expect(dashboardB.recent).toHaveLength(0);

    const dashboardA = await getTeacherDashboard(viewerA(), teacherA.id);
    expect(dashboardA.summary.students).toBe(1);
    expect(dashboardA.summary.completions).toBe(1);
    expect(dashboardA.recent).toHaveLength(1);
    expect(dashboardA.recent[0].studentName).toContain("Siswa");
    expect(dashboardA.subjectProgress).toEqual([
      expect.objectContaining({
        gradeLevel: 5,
        subjectSlug: "matematika",
        enrolled: 1,
        attempted: 1,
        completions: 1,
        avgAccuracy: 100,
      }),
    ]);
  });
});

describe("pengelolaan konten oleh guru", () => {
  it("misi tanpa soal tidak bisa diterbitkan", async () => {
    const input = missionSchema.parse({
      title: "Misi Kosong",
      slug: `misi-kosong-${Date.now()}`,
      description: "Belum ada soal",
      story: "Cerita",
      learningObjectives: ["Tujuan"],
      orderIndex: 9,
      gradeLevel: 5,
      subject: "matematika",
      topic: "pecahan",
    });
    const created = await createMission(viewerA(), teacherA.id, input);
    await expect(setMissionPublished(viewerA(), created.id, true)).rejects.toThrow(/belum punya soal/i);
  });

  it("menolak soal dengan jawaban di luar pilihan", async () => {
    await expect(
      createQuestion(viewerA(), missionA.id, {
        questionType: "multiple_choice",
        prompt: "Berapa 2 + 2?",
        options: ["3", "5"],
        correctAnswer: "4",
        explanation: "2 + 2 = 4.",
        hint: "",
        difficulty: "mudah",
        orderIndex: 5,
      }),
    ).rejects.toThrow(TeacherError);
  });

  it("menyimpan soal valid lalu menerbitkan misi", async () => {
    const input = missionSchema.parse({
      title: "Misi Validasi",
      slug: `misi-validasi-${Date.now()}`,
      description: "Misi untuk uji validasi",
      story: "Cerita uji",
      learningObjectives: ["Tujuan uji"],
      orderIndex: 10,
      gradeLevel: 5,
      subject: "matematika",
      topic: "pecahan",
    });
    const created = await createMission(viewerA(), teacherA.id, input);

    await createQuestion(viewerA(), created.id, {
      questionType: "numeric",
      prompt: "Berapa hasil 12 x 12?",
      options: [],
      correctAnswer: "144",
      explanation: "12 x 12 = 144.",
      hint: "Kalikan.",
      difficulty: "sedang",
      orderIndex: 1,
    });

    const published = await setMissionPublished(viewerA(), created.id, true);
    expect(published.is_published).toBe(true);

    const detail = await getMissionForEdit(viewerA(), created.id, teacherA.id);
    expect(detail?.publishIssues).toEqual([]);
    expect(detail?.questions).toHaveLength(1);
  });

  it("guru lain tidak dapat menerbitkan misi yang bukan miliknya", async () => {
    await expect(setMissionPublished(viewerB(), missionA.id, false)).rejects.toThrow();
  });

  it("soft delete soal menjaga riwayat percobaan", async () => {
    const questionIds = await getQuestionIds(missionA.id);
    await archiveQuestion(viewerA(), questionIds[0]);

    const [row] = await adminQuery<{ archived_at: Date | null }>(
      "select archived_at from questions where id = $1",
      [questionIds[0]],
    );
    expect(row.archived_at).not.toBeNull();

    const result = await getAttemptResult(viewerA(), attemptA);
    expect(result?.answers).toHaveLength(1);
  });
});

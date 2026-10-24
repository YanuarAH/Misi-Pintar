import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  adminQuery,
  asViewer,
  closePools,
  createClassroom,
  createStudent,
  createTeacher,
  resetData,
} from "./helpers/db";
import {
  archiveMission,
  createMission,
  getClassDetail,
  getMissionForEdit,
  listTeacherMissions,
  setMissionClasses,
  setMissionPublished,
  TeacherError,
  updateMission,
} from "@/server/teacher";
import {
  getAttemptResult,
  getProgress,
  listMissionCards,
  startOrResumeAttempt,
  submitAnswer,
} from "@/server/student";

const teacherViewer = (id: string) => ({ userId: id, role: "teacher" as const });
const studentViewer = (id: string) => ({ userId: id, role: "student" as const });

let teacherA: { id: string };
let teacherB: { id: string };
let class5A: { id: string };
let class5B: { id: string };
let class2A: { id: string };
let mission5: { id: string; slug: string };
let mission5b: { id: string; slug: string };
let mission2: { id: string; slug: string };

const missionInput = (overrides: Partial<Parameters<typeof createMission>[2]> = {}) => ({
  title: `Misi ${Math.random().toString(36).slice(2, 7)}`,
  slug: `misi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  description: "Deskripsi uji",
  story: "Cerita uji",
  learningObjectives: ["Tujuan uji"],
  orderIndex: 1,
  gradeLevel: 5,
  subject: "matematika",
  topic: "pecahan",
  ...overrides,
});

beforeAll(async () => {
  await resetData();
  teacherA = await createTeacher("Guru A");
  teacherB = await createTeacher("Guru B");

  class5A = await createClassroom(teacherA.id, "5A", 5);
  class5B = await createClassroom(teacherA.id, "5B", 5);
  class2A = await createClassroom(teacherA.id, "2A", 2);

  const created5 = await createMission(teacherViewer(teacherA.id), teacherA.id, missionInput({ orderIndex: 1, gradeLevel: 5 }));
  mission5 = { id: created5.id, slug: created5.slug };

  const created5b = await createMission(
    teacherViewer(teacherA.id),
    teacherA.id,
    missionInput({ orderIndex: 2, gradeLevel: 5, topic: "pecahan" }),
  );
  mission5b = { id: created5b.id, slug: created5b.slug };

  const created2 = await createMission(
    teacherViewer(teacherA.id),
    teacherA.id,
    missionInput({ orderIndex: 1, gradeLevel: 2, title: "Misi Kelas 2" }),
  );
  mission2 = { id: created2.id, slug: created2.slug };

  // Satu soal per misi agar bisa dipakai untuk uji percobaan & isolasi soal.
  for (const mission of [mission5, mission5b, mission2]) {
    await adminQuery(
      `insert into questions
         (mission_id, question_type, prompt, options, correct_answer, explanation, hint, difficulty, order_index, slot_index, topic)
       values ($1, 'numeric', $2, null, '4', '2 + 2 = 4.', 'Jumlahkan.', 'mudah', 1, 1, 'penjumlahan-pengurangan')`,
      [mission.id, `Berapa 2 + 2? (${mission.slug})`],
    );
    await setMissionPublished(teacherViewer(teacherA.id), mission.id, true);
  }
});

afterAll(async () => {
  await closePools();
});

describe("tingkat kelas vs kelas belajar", () => {
  it("guru dapat membuat misi Kelas 2 dan Kelas 5 dalam satu akun", async () => {
    const missions = await listTeacherMissions(teacherViewer(teacherA.id), teacherA.id);
    const grades = missions.map((mission) => mission.grade_level).sort();
    expect(grades).toContain(2);
    expect(grades).toContain(5);
    expect(new Set(missions.map((mission) => mission.id)).size).toBe(missions.length);
  });

  it("daftar misi dapat difilter menurut tingkat kelas dan mata pelajaran", async () => {
    const grade2 = await listTeacherMissions(teacherViewer(teacherA.id), teacherA.id, { gradeLevel: 2 });
    expect(grade2).toHaveLength(1);
    expect(grade2[0].id).toBe(mission2.id);

    const grade5 = await listTeacherMissions(teacherViewer(teacherA.id), teacherA.id, { gradeLevel: 5 });
    expect(grade5.map((mission) => mission.id).sort()).toEqual([mission5.id, mission5b.id].sort());

    const otherSubject = await listTeacherMissions(teacherViewer(teacherA.id), teacherA.id, {
      subject: "ipa",
    });
    expect(otherSubject).toHaveLength(0);
  });

  it("kelas belajar menyimpan tingkatnya sendiri (5A, 5B, 2A)", async () => {
    const detail5 = await getClassDetail(teacherViewer(teacherA.id), class5A.id);
    const detail2 = await getClassDetail(teacherViewer(teacherA.id), class2A.id);
    expect(detail5?.classroom.grade_level).toBe(5);
    expect(detail2?.classroom.grade_level).toBe(2);
  });
});

describe("isolasi soal antar misi", () => {
  it("soal hanya terhubung ke misinya sendiri", async () => {
    const rows = await adminQuery<{ mission_id: string; prompt: string }>(
      "select mission_id, prompt from questions where mission_id = any($1::uuid[]) order by mission_id",
      [[mission5.id, mission2.id]],
    );
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.prompt.includes("Berapa 2 + 2?"))).toBe(true);
    expect(new Set(rows.map((row) => row.mission_id)).size).toBe(2);

    const detail = await getMissionForEdit(teacherViewer(teacherA.id), mission2.id, teacherA.id);
    expect(detail?.questions).toHaveLength(1);
    expect(detail?.mission.grade_level).toBe(2);
  });
});

describe("penugasan misi ke kelas belajar", () => {
  it("misi Kelas 5 tidak bisa ditugaskan ke kelas Kelas 2", async () => {
    await expect(
      setMissionClasses(teacherViewer(teacherA.id), teacherA.id, mission5.id, [class2A.id]),
    ).rejects.toThrow(/bukan kelas tingkat 5/i);

    // Trigger database menolak juga bila jalur aplikasi dilewati.
    await expect(
      adminQuery("insert into mission_classes (mission_id, class_id) values ($1, $2)", [mission5.id, class2A.id]),
    ).rejects.toThrow(/tingkat kelas misi/i);
  });

  it("satu misi dapat ditugaskan ke beberapa kelas bertingkat sama", async () => {
    const result = await setMissionClasses(teacherViewer(teacherA.id), teacherA.id, mission5.id, [
      class5A.id,
      class5B.id,
    ]);
    expect(result.assigned).toBe(2);

    const detail = await getMissionForEdit(teacherViewer(teacherA.id), mission5.id, teacherA.id);
    expect(detail?.assignedClassIds.sort()).toEqual([class5A.id, class5B.id].sort());

    const list = await listTeacherMissions(teacherViewer(teacherA.id), teacherA.id, { gradeLevel: 5 });
    const item = list.find((mission) => mission.id === mission5.id);
    expect(item?.assignedClasses).toHaveLength(2);
  });

  it("misi tanpa tingkat kelas tidak bisa ditugaskan", async () => {
    const legacy = await createMission(teacherViewer(teacherA.id), teacherA.id, missionInput());
    await adminQuery("update missions set grade_level = null, subject_slug = null, topic_slug = null where id = $1", [
      legacy.id,
    ]);

    await expect(
      setMissionClasses(teacherViewer(teacherA.id), teacherA.id, legacy.id, [class5A.id]),
    ).rejects.toThrow(/Pilih tingkat kelas misi/i);
  });
});

describe("akses siswa ke misi", () => {
  it("siswa hanya melihat misi tingkat kelasnya", async () => {
    const student5 = await createStudent({ classId: class5A.id });
    const student2 = await createStudent({ classId: class2A.id });

    const cards5 = await listMissionCards(studentViewer(student5.id), student5.id);
    expect(cards5.every((card) => card.gradeLevel === 5)).toBe(true);
    expect(cards5.map((card) => card.id)).not.toContain(mission2.id);

    const cards2 = await listMissionCards(studentViewer(student2.id), student2.id);
    expect(cards2.map((card) => card.id)).toEqual([mission2.id]);
  });

  it("misi yang ditugaskan hanya tampil untuk kelas penerimanya", async () => {
    // mission5 sudah ditugaskan ke 5A dan 5B, bukan ke kelas 5C.
    const class5C = await createClassroom(teacherA.id, "5C", 5);
    const in5A = await createStudent({ classId: class5A.id });
    const in5C = await createStudent({ classId: class5C.id });

    const cardsA = await listMissionCards(studentViewer(in5A.id), in5A.id);
    const cardsC = await listMissionCards(studentViewer(in5C.id), in5C.id);

    expect(cardsA.map((card) => card.id)).toContain(mission5.id);
    expect(cardsC.map((card) => card.id)).not.toContain(mission5.id);
    // Misi yang belum ditugaskan tetap terbuka untuk kelas bertingkat sama.
    expect(cardsC.map((card) => card.id)).toContain(mission5b.id);
  });

  it("misi draf tidak pernah tampil ke siswa", async () => {
    const draft = await createMission(
      teacherViewer(teacherA.id),
      teacherA.id,
      missionInput({ gradeLevel: 5, title: "Misi Draf" }),
    );
    const student = await createStudent({ classId: class5A.id });
    const cards = await listMissionCards(studentViewer(student.id), student.id);
    expect(cards.map((card) => card.id)).not.toContain(draft.id);
  });

  it("siswa tanpa tingkat kelas tidak menerima misi apa pun", async () => {
    const noGrade = await createClassroom(teacherA.id, "Tanpa Tingkat", null);
    const student = await createStudent({ classId: noGrade.id });
    const cards = await listMissionCards(studentViewer(student.id), student.id);
    expect(cards).toHaveLength(0);
  });
});

describe("misi lama dan riwayat belajar", () => {
  it("misi tanpa tingkat kelas tidak tampil ke siswa tetapi tetap terlihat guru", async () => {
    const legacy = await createMission(teacherViewer(teacherA.id), teacherA.id, missionInput());
    await adminQuery(
      "update missions set grade_level = null, subject_slug = null, topic_slug = null where id = $1",
      [legacy.id],
    );

    const student = await createStudent({ classId: class5A.id });
    const cards = await listMissionCards(studentViewer(student.id), student.id);
    expect(cards.map((card) => card.id)).not.toContain(legacy.id);

    const teacherList = await listTeacherMissions(teacherViewer(teacherA.id), teacherA.id, { uncategorized: true });
    const item = teacherList.find((mission) => mission.id === legacy.id);
    expect(item).toBeDefined();
    expect(item?.publishIssues.some((issue) => issue.includes("Tingkat kelas"))).toBe(true);

    await expect(setMissionPublished(teacherViewer(teacherA.id), legacy.id, true)).rejects.toThrow(TeacherError);
  });

  it("percobaan dan progres lama tetap dapat dibuka setelah misi dikategorikan ulang", async () => {
    const student = await createStudent({ classId: class5A.id });
    const started = await startOrResumeAttempt(studentViewer(student.id), student.id, mission5.slug);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const questionId = started.state.questions[0].id;
    const answered = await submitAnswer(studentViewer(student.id), student.id, {
      attemptId: started.state.attemptId,
      questionId,
      answer: "4",
    });
    expect(answered.ok, answered.ok ? "" : answered.reason).toBe(true);
    // Selesaikan misi 1 soal.
    await adminQuery("update attempts set completed_at = now(), score = 100, correct_count = 1 where id = $1", [
      started.state.attemptId,
    ]);

    // Kategorikan ulang misi ke Kelas 2 (mis. guru salah tingkat sebelumnya).
    await updateMission(teacherViewer(teacherA.id), mission5.id, missionInput({ gradeLevel: 2, orderIndex: 1 }));

    const result = await getAttemptResult(studentViewer(student.id), started.state.attemptId);
    expect(result).not.toBeNull();
    expect(result?.attempt.total_questions).toBe(1);
    expect(result?.answers).toHaveLength(1);

    const progress = await getProgress(studentViewer(student.id), student.id);
    expect(progress.history.some((row) => row.id === started.state.attemptId)).toBe(true);

    // Kembalikan ke Kelas 5 agar uji lain tetap konsisten.
    await updateMission(teacherViewer(teacherA.id), mission5.id, missionInput({ gradeLevel: 5, orderIndex: 1 }));
  });
});

describe("CRUD konten dengan metadata kurikulum", () => {
  it("filter, buat, ubah, terbitkan, dan arsipkan berfungsi", async () => {
    const created = await createMission(
      teacherViewer(teacherA.id),
      teacherA.id,
      missionInput({ gradeLevel: 3, title: "Misi Kelas 3", topic: "bilangan-bulat" }),
    );
    expect(created.grade_level).toBe(3);

    const filtered = await listTeacherMissions(teacherViewer(teacherA.id), teacherA.id, { gradeLevel: 3 });
    expect(filtered.map((mission) => mission.id)).toContain(created.id);

    const updated = await updateMission(
      teacherViewer(teacherA.id),
      created.id,
      missionInput({ gradeLevel: 4, title: "Misi Kelas 4", topic: "bilangan-bulat" }),
    );
    expect(updated.grade_level).toBe(4);

    const grade3 = await listTeacherMissions(teacherViewer(teacherA.id), teacherA.id, { gradeLevel: 3 });
    expect(grade3.map((mission) => mission.id)).not.toContain(created.id);

    await archiveMission(teacherViewer(teacherA.id), created.id);
    const afterArchive = await listTeacherMissions(teacherViewer(teacherA.id), teacherA.id, { gradeLevel: 4 });
    expect(afterArchive.map((mission) => mission.id)).not.toContain(created.id);
  });

  it("mengubah tingkat misi melepas penugasan yang tidak lagi cocok", async () => {
    const created = await createMission(
      teacherViewer(teacherA.id),
      teacherA.id,
      missionInput({ gradeLevel: 5, title: "Misi Pindah Tingkat" }),
    );
    await adminQuery(
      `insert into questions (mission_id, question_type, prompt, options, correct_answer, explanation, hint, difficulty, order_index, slot_index, topic)
       values ($1, 'numeric', 'Berapa 1 + 1?', null, '2', '1 + 1 = 2.', '', 'mudah', 1, 1, 'penjumlahan-pengurangan')`,
      [created.id],
    );
    await setMissionPublished(teacherViewer(teacherA.id), created.id, true);
    await setMissionClasses(teacherViewer(teacherA.id), teacherA.id, created.id, [class5A.id]);

    expect(
      await adminQuery<{ class_id: string }>("select class_id from mission_classes where mission_id = $1", [created.id]),
    ).toHaveLength(1);

    await updateMission(teacherViewer(teacherA.id), created.id, missionInput({ gradeLevel: 4, title: "Misi Pindah Tingkat" }));

    expect(
      await adminQuery<{ class_id: string }>("select class_id from mission_classes where mission_id = $1", [created.id]),
    ).toHaveLength(0);
  });
});

describe("keamanan akses", () => {
  it("siswa tidak dapat membaca tabel penugasan", async () => {
    const student = await createStudent({ classId: class5A.id });
    const result = await asViewer(studentViewer(student.id), async (query) =>
      query("select mission_id from mission_classes"),
    );
    expect(result).toHaveLength(0);
  });

  it("guru lain tidak melihat penugasan milik guru A", async () => {
    const result = await asViewer(teacherViewer(teacherB.id), async (query) =>
      query("select mission_id from mission_classes"),
    );
    expect(result).toHaveLength(0);

    await expect(
      setMissionClasses(teacherViewer(teacherB.id), teacherB.id, mission5.id, [class5A.id]),
    ).rejects.toThrow(TeacherError);
  });

  it("soal misi yang tidak boleh dilihat siswa tidak terbaca lewat query langsung", async () => {
    const student2 = await createStudent({ classId: class2A.id });
    const rows = await asViewer(studentViewer(student2.id), async (query) =>
      query("select id from questions where mission_id = $1", [mission5.id]),
    );
    expect(rows).toHaveLength(0);

    const student5 = await createStudent({ classId: class5A.id });
    const visible = await asViewer(studentViewer(student5.id), async (query) =>
      query("select id from questions where mission_id = $1", [mission5.id]),
    );
    expect(visible.length).toBeGreaterThan(0);
  });
});

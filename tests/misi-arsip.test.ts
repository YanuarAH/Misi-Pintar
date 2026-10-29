import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  adminQuery,
  closePools,
  createClassroom,
  createMission as createMissionRow,
  createStudent,
  createTeacher,
  resetData,
} from "./helpers/db";
import {
  archiveMission,
  createMission,
  deleteMission,
  getMissionForEdit,
  listTeacherMissions,
  restoreMission,
  setMissionClasses,
  setMissionPublished,
  TeacherError,
  updateMission,
} from "@/server/teacher";
import { listMissionCards, startOrResumeAttempt } from "@/server/student";

const teacherViewer = (id: string) => ({ userId: id, role: "teacher" as const });
const studentViewer = (id: string) => ({ userId: id, role: "student" as const });

let teacherA: { id: string };
let teacherB: { id: string };
let student: { id: string };
let classroom: { id: string };

const missionInput = (overrides: Record<string, unknown> = {}) => ({
  title: `Misi ${Math.random().toString(36).slice(2, 7)}`,
  slug: `misi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  description: "Deskripsi uji",
  story: "Cerita uji",
  learningObjectives: ["Tujuan uji"],
  orderIndex: 1,
  audience: "public",
  gradeLevel: 5,
  subject: "matematika",
  topic: "pecahan",
  ...overrides,
});

const questionFixture = [
  {
    questionType: "numeric" as const,
    prompt: "Berapa hasil 12 + 8?",
    correctAnswer: "20",
    explanation: "12 + 8 = 20.",
  },
];

/** Membuat satu baris riwayat tanpa lewat alur "misi terkunci" di UI siswa. */
async function seedAttempt(missionId: string, studentId: string) {
  await adminQuery(
    `insert into attempts (student_id, mission_id, question_ids, total_questions, score)
     values ($1, $2, '{}', 1, 100)`,
    [studentId, missionId],
  );
}

/** Misi terbit tanpa riwayat & tanpa penugasan: siap dipakai uji arsip/hapus. */
async function publishedMission(authorId = teacherA.id, overrides: Record<string, unknown> = {}) {
  const input = missionInput(overrides);
  const mission = await createMission(teacherViewer(authorId), authorId, input as never);
  await adminQuery(
    `insert into questions
       (mission_id, question_type, prompt, options, correct_answer, explanation, difficulty,
        order_index, slot_index, variant_index, topic)
     values ($1, 'numeric', 'Berapa hasil 15 + 5?', null, '20', '15 + 5 = 20.', 'mudah', 1, 1, 0, 'pecahan')`,
    [mission.id],
  );
  await setMissionPublished(teacherViewer(authorId), mission.id, true);
  return mission;
}

beforeAll(async () => {
  await resetData();
  teacherA = await createTeacher("Guru Misi A");
  teacherB = await createTeacher("Guru Misi B");
  student = await createStudent({ gradeLevel: 5 });
  classroom = await createClassroom(teacherA.id, "5A Misi", 5);
});

afterAll(async () => {
  await closePools();
});

describe("daftar dan filter misi", () => {
  it("hanya menampilkan misi milik guru dengan metadata yang dibutuhkan daftar", async () => {
    const own = await publishedMission();
    const foreign = await createMissionRow({
      authorId: teacherB.id,
      slug: `misi-asing-${Math.random().toString(36).slice(2, 7)}`,
      gradeLevel: 5,
      questions: questionFixture,
    });

    const list = await listTeacherMissions(teacherViewer(teacherA.id), teacherA.id);
    const found = list.find((mission) => mission.id === own.id);
    expect(found).toBeTruthy();
    expect(found?.title).toBe(own.title);
    expect(found?.grade_level).toBe(5);
    expect(found?.subjectLabel).toBe("Matematika");
    expect(found?.topicLabel).toBeTruthy();
    expect(found?.questionCount).toBe(1);
    expect(found?.is_published).toBe(true);
    expect(found?.updated_at).toBeTruthy();
    expect(found?.attemptCount).toBe(0);
    expect(found?.deletable).toBe(true);
    expect(list.map((mission) => mission.id)).not.toContain(foreign.id);
  });

  it("memfilter daftar berdasarkan status draf, terbit, dan arsip", async () => {
    const draft = await createMission(teacherViewer(teacherA.id), teacherA.id, missionInput() as never);
    const published = await publishedMission();

    const drafts = await listTeacherMissions(teacherViewer(teacherA.id), teacherA.id, { status: "draft" });
    expect(drafts.map((mission) => mission.id)).toContain(draft.id);
    expect(drafts.map((mission) => mission.id)).not.toContain(published.id);

    const publishes = await listTeacherMissions(teacherViewer(teacherA.id), teacherA.id, { status: "published" });
    expect(publishes.map((mission) => mission.id)).toContain(published.id);
    expect(publishes.map((mission) => mission.id)).not.toContain(draft.id);

    await archiveMission(teacherViewer(teacherA.id), published.id);
    const archived = await listTeacherMissions(teacherViewer(teacherA.id), teacherA.id, { status: "archived" });
    expect(archived.map((mission) => mission.id)).toContain(published.id);
    const active = await listTeacherMissions(teacherViewer(teacherA.id), teacherA.id);
    expect(active.map((mission) => mission.id)).not.toContain(published.id);
  });

  it("memfilter berdasarkan tingkat kelas dan mata pelajaran", async () => {
    const grade2 = await createMission(
      teacherViewer(teacherA.id),
      teacherA.id,
      missionInput({ gradeLevel: 2, subject: "matematika", topic: "pecahan" }) as never,
    );

    const grade2List = await listTeacherMissions(teacherViewer(teacherA.id), teacherA.id, { gradeLevel: 2 });
    expect(grade2List.map((mission) => mission.id)).toEqual([grade2.id]);

    const mathList = await listTeacherMissions(teacherViewer(teacherA.id), teacherA.id, { subject: "matematika" });
    expect(mathList.map((mission) => mission.id)).toContain(grade2.id);
    expect(mathList.every((mission) => mission.subject_slug === "matematika")).toBe(true);
  });
});

describe("buat, edit, dan terbitkan misi", () => {
  it("membuat misi baru sebagai draf dengan metadata lengkap", async () => {
    const mission = await createMission(teacherViewer(teacherA.id), teacherA.id, missionInput() as never);
    expect(mission.is_published).toBe(false);
    expect(mission.grade_level).toBe(5);

    const detail = await getMissionForEdit(teacherViewer(teacherA.id), mission.id, teacherA.id);
    expect(detail?.mission.title).toBe(mission.title);
    expect(detail?.publishIssues).toContain("Misi belum memiliki soal.");
  });

  it("mengedit misi dan memperbarui tanggal pembaruan", async () => {
    const mission = await createMission(teacherViewer(teacherA.id), teacherA.id, missionInput() as never);
    const before = (
      await adminQuery<{ updated_at: Date }>("select updated_at from missions where id = $1", [mission.id])
    )[0].updated_at;

    await new Promise((resolve) => setTimeout(resolve, 10));
    const updated = await updateMission(teacherViewer(teacherA.id), mission.id, {
      ...missionInput({ slug: mission.slug, title: "Judul Setelah Diedit" }),
    } as never);

    expect(updated.title).toBe("Judul Setelah Diedit");
    expect(new Date(updated.updated_at).getTime()).toBeGreaterThan(new Date(before).getTime());
  });

  it("menolak terbit bila metadata atau soal belum lengkap, lalu berhasil setelah dilengkapi", async () => {
    const mission = await createMission(teacherViewer(teacherA.id), teacherA.id, missionInput() as never);
    await expect(setMissionPublished(teacherViewer(teacherA.id), mission.id, true)).rejects.toThrow(
      /belum punya soal/i,
    );

    await adminQuery(
      `insert into questions
         (mission_id, question_type, prompt, options, correct_answer, explanation, difficulty,
          order_index, slot_index, variant_index, topic)
       values ($1, 'numeric', 'Berapa hasil 7 + 3?', null, '10', '7 + 3 = 10.', 'mudah', 1, 1, 0, 'pecahan')`,
      [mission.id],
    );
    const published = await setMissionPublished(teacherViewer(teacherA.id), mission.id, true);
    expect(published.is_published).toBe(true);

    const cards = await listMissionCards(studentViewer(student.id), student.id);
    expect(cards.map((card) => card.id)).toContain(mission.id);
  });
});

describe("arsip dan pemulihan misi", () => {
  it("mengarsipkan misi: hilang dari siswa dan daftar aktif, soal & riwayat tetap ada", async () => {
    const mission = await publishedMission();
    await seedAttempt(mission.id, student.id);

    await archiveMission(teacherViewer(teacherA.id), mission.id);

    const archived = await adminQuery<{ archived_at: Date | null; is_published: boolean }>(
      "select archived_at, is_published from missions where id = $1",
      [mission.id],
    );
    expect(archived[0].archived_at).not.toBeNull();
    expect(archived[0].is_published).toBe(false);

    const questions = await adminQuery<{ total: string }>(
      "select count(*)::text as total from questions where mission_id = $1",
      [mission.id],
    );
    expect(Number(questions[0].total)).toBe(1);

    const attempts = await adminQuery<{ total: string }>(
      "select count(*)::text as total from attempts where mission_id = $1",
      [mission.id],
    );
    expect(Number(attempts[0].total)).toBeGreaterThan(0);

    const cards = await listMissionCards(studentViewer(student.id), student.id);
    expect(cards.map((card) => card.id)).not.toContain(mission.id);
    const available = await adminQuery<{ ok: boolean }>(
      "select public.app_mission_available($1) as ok",
      [mission.id],
    );
    expect(available[0].ok).toBe(false);
    const again = await startOrResumeAttempt(studentViewer(student.id), student.id, mission.slug);
    expect(again.ok).toBe(false);
  });

  it("memulihkan misi arsip sebagai draf yang bisa diterbitkan lagi", async () => {
    const mission = await publishedMission();
    await archiveMission(teacherViewer(teacherA.id), mission.id);
    await restoreMission(teacherViewer(teacherA.id), mission.id);

    const restored = (
      await adminQuery<{ archived_at: Date | null; is_published: boolean }>(
        "select archived_at, is_published from missions where id = $1",
        [mission.id],
      )
    )[0];
    expect(restored.archived_at).toBeNull();
    expect(restored.is_published).toBe(false);

    const active = await listTeacherMissions(teacherViewer(teacherA.id), teacherA.id);
    expect(active.map((item) => item.id)).toContain(mission.id);

    // Belum terbit lagi: siswa belum bisa mengerjakan sampai guru menerbitkan ulang.
    const cards = await listMissionCards(studentViewer(student.id), student.id);
    expect(cards.map((card) => card.id)).not.toContain(mission.id);

    await setMissionPublished(teacherViewer(teacherA.id), mission.id, true);
    const afterPublish = await listMissionCards(studentViewer(student.id), student.id);
    expect(afterPublish.map((card) => card.id)).toContain(mission.id);
  });

  it("misi arsip tidak bisa dijadikan bahan tugas kelas baru", async () => {
    const mission = await publishedMission();
    await archiveMission(teacherViewer(teacherA.id), mission.id);

    await expect(
      setMissionClasses(teacherViewer(teacherA.id), teacherA.id, mission.id, [classroom.id]),
    ).rejects.toThrow(/arsip|diarsipkan/i);
  });
});

describe("hapus permanen misi", () => {
  it("menghapus misi arsip yang belum punya riwayat dan penugasan", async () => {
    const mission = await publishedMission();
    await archiveMission(teacherViewer(teacherA.id), mission.id);
    await deleteMission(teacherViewer(teacherA.id), mission.id);

    const remaining = await adminQuery<{ total: string }>(
      "select count(*)::text as total from missions where id = $1",
      [mission.id],
    );
    expect(Number(remaining[0].total)).toBe(0);
  });

  it("menolak hapus misi yang belum diarsipkan", async () => {
    const mission = await publishedMission();
    await expect(deleteMission(teacherViewer(teacherA.id), mission.id)).rejects.toThrow(/arsipkan/i);
  });

  it("menolak hapus misi yang punya riwayat pengerjaan dan menjaga riwayatnya", async () => {
    const mission = await publishedMission();
    await seedAttempt(mission.id, student.id);
    await archiveMission(teacherViewer(teacherA.id), mission.id);

    await expect(deleteMission(teacherViewer(teacherA.id), mission.id)).rejects.toThrow(/riwayat/i);

    const attempting = await adminQuery<{ total: string }>(
      "select count(*)::text as total from attempts where mission_id = $1",
      [mission.id],
    );
    expect(Number(attempting[0].total)).toBeGreaterThan(0);
    const missionRow = await adminQuery<{ total: string }>(
      "select count(*)::text as total from missions where id = $1",
      [mission.id],
    );
    expect(Number(missionRow[0].total)).toBe(1);
  });

  it("relasi penugasan lama tidak menghalangi hapus misi kosong", async () => {
    const mission = await publishedMission();
    await setMissionClasses(teacherViewer(teacherA.id), teacherA.id, mission.id, [classroom.id]);
    await archiveMission(teacherViewer(teacherA.id), mission.id);

    await deleteMission(teacherViewer(teacherA.id), mission.id);

    expect(
      await adminQuery("select id from missions where id = $1", [mission.id]),
    ).toHaveLength(0);
    expect(
      await adminQuery("select mission_id from mission_classes where mission_id = $1", [mission.id]),
    ).toHaveLength(0);
  });
});

describe("kewenangan guru dan penjagaan database", () => {
  it("guru lain tidak bisa mengarsipkan, memulihkan, menghapus, atau mengedit misi orang", async () => {
    const mission = await publishedMission();
    const other = teacherViewer(teacherB.id);

    await expect(archiveMission(other, mission.id)).rejects.toBeInstanceOf(TeacherError);
    await expect(restoreMission(other, mission.id)).rejects.toBeInstanceOf(TeacherError);
    await expect(deleteMission(other, mission.id)).rejects.toBeInstanceOf(TeacherError);
    expect(await getMissionForEdit(other, mission.id, teacherB.id)).toBeNull();

    const list = await listTeacherMissions(other, teacherB.id, { status: "archived" });
    expect(list.map((item) => item.id)).not.toContain(mission.id);
  });

  it("trigger database menolak hapus permanen misi berriwayat walau lewat SQL langsung", async () => {
    const mission = await publishedMission();
    await seedAttempt(mission.id, student.id);

    await expect(adminQuery("delete from missions where id = $1", [mission.id])).rejects.toThrow(/riwayat/i);
  });

  it("trigger database menolak penugasan kelas ke misi yang diarsipkan", async () => {
    const mission = await publishedMission();
    await archiveMission(teacherViewer(teacherA.id), mission.id);

    await expect(
      adminQuery("insert into mission_classes (mission_id, class_id) values ($1, $2)", [
        mission.id,
        classroom.id,
      ]),
    ).rejects.toThrow(/arsip/i);
  });

  it("misi arsip tidak mungkin tetap berstatus terbit walau kolomnya diubah langsung", async () => {
    const mission = await publishedMission();
    await adminQuery("update missions set is_published = true, archived_at = now() where id = $1", [mission.id]);

    const row = await adminQuery<{ is_published: boolean }>(
      "select is_published from missions where id = $1",
      [mission.id],
    );
    expect(row[0].is_published).toBe(false);
  });
});

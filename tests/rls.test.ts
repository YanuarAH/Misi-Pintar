import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closePool } from "@/lib/db";
import {
  adminQuery,
  asViewer,
  closePools,
  createClassroom,
  createMission,
  createStudent,
  createTeacher,
  resetData,
} from "./helpers/db";

let teacherA: { id: string };
let teacherB: { id: string };
let classA: { id: string; joinCode: string };
let classB: { id: string; joinCode: string };
let studentA: { id: string; accessCode: string };
let studentB: { id: string; accessCode: string };
let missionPublished: { id: string; slug: string };
let missionDraft: { id: string; slug: string };
let attemptA: string;

beforeAll(async () => {
  await resetData();
  teacherA = await createTeacher("Bu Ani");
  teacherB = await createTeacher("Pak Budi");
  classA = await createClassroom(teacherA.id, "Kelas A");
  classB = await createClassroom(teacherB.id, "Kelas B");
  studentA = await createStudent({ classId: classA.id });
  studentB = await createStudent({ classId: classA.id });

  missionPublished = await createMission({
    authorId: teacherA.id,
    orderIndex: 1,
    published: true,
    questions: [
      {
        questionType: "multiple_choice",
        prompt: "Berapa hasil 5 + 7?",
        options: ["10", "11", "12"],
        correctAnswer: "12",
        explanation: "5 + 7 = 12.",
      },
    ],
  });

  missionDraft = await createMission({
    authorId: teacherA.id,
    orderIndex: 2,
    published: false,
    questions: [
      {
        questionType: "numeric",
        prompt: "Berapa 100 - 40?",
        correctAnswer: "60",
        explanation: "100 - 40 = 60.",
      },
    ],
  });

  const [attempt] = await adminQuery<{ id: string }>(
    `insert into attempts (student_id, mission_id, total_questions, score, correct_count, xp_earned, completed_at)
     values ($1, $2, 1, 100, 1, 30, now()) returning id`,
    [studentA.id, missionPublished.id],
  );
  attemptA = attempt.id;
});

afterAll(async () => {
  await closePool();
  await closePools();
});

describe("RLS: pengunjung anonim", () => {
  it("hanya melihat misi yang terbit", async () => {
    const rows = await asViewer(null, (query) => query<{ id: string }>("select id from missions"));
    const ids = rows.map((row) => row.id);
    expect(ids).toContain(missionPublished.id);
    expect(ids).not.toContain(missionDraft.id);
  });

  it("tidak dapat membaca profil, percobaan, atau jawaban", async () => {
    await asViewer(null, async (query) => {
      expect(await query("select id from profiles")).toHaveLength(0);
      expect(await query("select id from attempts")).toHaveLength(0);
      expect(await query("select id from attempt_answers")).toHaveLength(0);
      expect(await query("select id from user_achievements")).toHaveLength(0);
      await expect(query("select id from sessions")).rejects.toThrow(/permission denied/i);
    });
  });
});

describe("RLS: antar siswa", () => {
  it("siswa hanya melihat percobaannya sendiri", async () => {
    const own = await asViewer({ userId: studentA.id, role: "student" }, (query) =>
      query<{ id: string }>("select id from attempts"),
    );
    expect(own.map((row) => row.id)).toEqual([attemptA]);

    const other = await asViewer({ userId: studentB.id, role: "student" }, (query) =>
      query<{ id: string }>("select id from attempts"),
    );
    expect(other).toHaveLength(0);
  });

  it("siswa hanya membaca profilnya sendiri dan guru kelasnya", async () => {
    const visible = await asViewer({ userId: studentA.id, role: "student" }, (query) =>
      query<{ id: string; role: string }>("select id, role from profiles"),
    );

    // Diri sendiri + guru kelas yang diikuti (dibutuhkan halaman "Kelas saya").
    expect(visible.map((row) => row.id).sort()).toEqual([studentA.id, teacherA.id].sort());

    // Bukan siswa lain di kelas yang sama, bukan guru lain.
    expect(visible.some((row) => row.id === studentB.id)).toBe(false);
    expect(visible.some((row) => row.id === teacherB.id)).toBe(false);
  });

  it("siswa tidak dapat membuat percobaan atas nama siswa lain", async () => {
    await expect(
      asViewer({ userId: studentA.id, role: "student" }, (query) =>
        query("insert into attempts (student_id, mission_id, total_questions) values ($1, $2, 1)", [
          studentB.id,
          missionPublished.id,
        ]),
      ),
    ).rejects.toThrow(/row-level security|permission/i);
  });

  it("siswa tidak dapat memberi lencana untuk siswa lain", async () => {
    await expect(
      asViewer({ userId: studentA.id, role: "student" }, (query) =>
        query("insert into user_achievements (student_id, achievement_key) values ($1, 'sempurna')", [studentB.id]),
      ),
    ).rejects.toThrow(/row-level security|permission/i);
  });

  it("hash PIN dan email tidak dapat dibaca oleh koneksi aplikasi", async () => {
    await expect(
      asViewer({ userId: studentA.id, role: "student" }, (query) => query("select pin_hash from profiles")),
    ).rejects.toThrow(/permission denied/i);

    await expect(
      asViewer({ userId: teacherA.id, role: "teacher" }, (query) => query("select email, password_hash from profiles")),
    ).rejects.toThrow(/permission denied/i);
  });

  it("riwayat jawaban tidak dapat diubah atau dihapus", async () => {
    await expect(
      asViewer({ userId: studentA.id, role: "student" }, (query) =>
        query("update attempt_answers set is_correct = false"),
      ),
    ).rejects.toThrow(/permission denied/i);

    await expect(
      asViewer({ userId: studentA.id, role: "student" }, (query) => query("delete from attempt_answers")),
    ).rejects.toThrow(/permission denied/i);
  });

  it("siswa tidak dapat mengubah perannya menjadi guru", async () => {
    await expect(
      asViewer({ userId: studentA.id, role: "student" }, (query) =>
        query("update profiles set role = 'teacher' where id = $1", [studentA.id]),
      ),
    ).rejects.toThrow(/permission denied/i);
  });
});

describe("RLS: batas antar guru", () => {
  it("guru hanya melihat kelas miliknya", async () => {
    const classesOfA = await asViewer({ userId: teacherA.id, role: "teacher" }, (query) =>
      query<{ id: string }>("select id from classes"),
    );
    expect(classesOfA.map((row) => row.id)).toEqual([classA.id]);

    const classesOfB = await asViewer({ userId: teacherB.id, role: "teacher" }, (query) =>
      query<{ id: string }>("select id from classes"),
    );
    expect(classesOfB.map((row) => row.id)).toEqual([classB.id]);
  });

  it("guru hanya melihat percobaan siswa di kelasnya", async () => {
    const ofA = await asViewer({ userId: teacherA.id, role: "teacher" }, (query) =>
      query<{ id: string }>("select id from attempts"),
    );
    expect(ofA.map((row) => row.id)).toContain(attemptA);

    const ofB = await asViewer({ userId: teacherB.id, role: "teacher" }, (query) =>
      query<{ id: string }>("select id from attempts"),
    );
    expect(ofB).toHaveLength(0);
  });

  it("guru tidak dapat mengubah misi guru lain", async () => {
    const updated = await asViewer({ userId: teacherB.id, role: "teacher" }, (query) =>
      query<{ id: string }>("update missions set title = 'Diambil alih' where id = $1 returning id", [
        missionPublished.id,
      ]),
    );
    expect(updated).toHaveLength(0);
  });

  it("guru hanya dapat melihat draf misi miliknya sendiri", async () => {
    const draftsOfB = await asViewer({ userId: teacherB.id, role: "teacher" }, (query) =>
      query<{ id: string }>("select id from missions"),
    );
    expect(draftsOfB.map((row) => row.id)).not.toContain(missionDraft.id);

    const draftsOfA = await asViewer({ userId: teacherA.id, role: "teacher" }, (query) =>
      query<{ id: string }>("select id from missions"),
    );
    expect(draftsOfA.map((row) => row.id)).toContain(missionDraft.id);
  });

  it("siswa tidak dapat melihat soal misi draf", async () => {
    const questions = await asViewer({ userId: studentA.id, role: "student" }, (query) =>
      query<{ id: string }>("select id from questions where mission_id = $1", [missionDraft.id]),
    );
    expect(questions).toHaveLength(0);
  });
});

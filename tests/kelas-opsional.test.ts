import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashSecret } from "@/lib/password";
import type { QuestionFixture } from "./helpers/db";
import {
  adminQuery,
  asViewer,
  closePools,
  createClassroom,
  createMission as createMissionRef,
  createStudent,
  createTeacher,
  randomCode,
  resetData,
} from "./helpers/db";
import {
  getClassDetail,
  listTeacherClasses,
  removeClassMember,
  setClassGrade,
  TeacherError,
} from "@/server/teacher";
import {
  getAttemptResult,
  getProgress,
  getStudentClasses,
  joinClassWithCode,
  leaveClass,
  listMissionCards,
  setStudentGrade,
  startOrResumeAttempt,
  submitAnswer,
} from "@/server/student";

const teacherViewer = (id: string) => ({ userId: id, role: "teacher" as const });
const studentViewer = (id: string) => ({ userId: id, role: "student" as const });

let teacherA: { id: string };
let teacherB: { id: string };
let class5A: { id: string; joinCode: string };
let class5B: { id: string; joinCode: string };
let class2A: { id: string; joinCode: string };
let mission5: { id: string; slug: string };
let mission5Open: { id: string; slug: string };
let mission4: { id: string; slug: string };

/** Mendaftar seperti formulir: kode kelas opsional, tingkat opsional. */
async function registerStudent(options: {
  name?: string;
  joinCode?: string | null;
  gradeLevel?: number | null;
  pin?: string;
} = {}) {
  const accessCode = randomCode(8);
  const pinHash = await hashSecret(options.pin ?? "1234");
  const row = await adminQuery<{ app_register_student: string }>(
    "select public.app_register_student($1, $2, $3, $4, $5, $6)",
    [
      options.name ?? `Siswa ${accessCode.slice(0, 4)}`,
      "panda",
      pinHash,
      accessCode,
      options.joinCode ?? null,
      options.gradeLevel ?? null,
    ],
  );
  return { id: row[0].app_register_student, accessCode };
}

beforeAll(async () => {
  await resetData();
  teacherA = await createTeacher("Guru A");
  teacherB = await createTeacher("Guru B");

  class5A = await createClassroom(teacherA.id, "5A", 5);
  class5B = await createClassroom(teacherA.id, "5B", 5);
  class2A = await createClassroom(teacherA.id, "2A", 2);

  mission5 = await createMissionRef({
    authorId: teacherA.id,
    title: "Misi Kelas 5",
    slug: "misi-kelas-5",
    gradeLevel: 5,
    orderIndex: 1,
    questions: [{ questionType: "numeric", prompt: "Berapa 3 + 3?", correctAnswer: "6", explanation: "3 + 3 = 6." }],
  });
  mission5Open = await createMissionRef({
    authorId: teacherA.id,
    title: "Misi Kelas 5 Terbuka",
    slug: "misi-kelas-5-terbuka",
    gradeLevel: 5,
    orderIndex: 2,
    questions: [{ questionType: "numeric", prompt: "Berapa 4 + 4?", correctAnswer: "8", explanation: "4 + 4 = 8." }],
  });
  mission4 = await createMissionRef({
    authorId: teacherA.id,
    title: "Misi Kelas 4",
    slug: "misi-kelas-4",
    gradeLevel: 4,
    orderIndex: 1,
    questions: [{ questionType: "numeric", prompt: "Berapa 2 + 2?", correctAnswer: "4", explanation: "2 + 2 = 4." }],
  });
});

afterAll(async () => {
  await closePools();
});

describe("pendaftaran tanpa kode kelas", () => {
  it("membuat akun tanpa keanggotaan kelas", async () => {
    const student = await registerStudent({ gradeLevel: 4 });
    const rows = await adminQuery<{ class_id: string }>("select class_id from class_members where student_id = $1", [
      student.id,
    ]);
    expect(rows).toHaveLength(0);

    const profile = await adminQuery<{ grade_level: number | null }>(
      "select grade_level from profiles where id = $1",
      [student.id],
    );
    expect(profile[0].grade_level).toBe(4);
  });

  it("siswa tanpa kelas tetap bisa masuk (login tidak butuh kelas)", async () => {
    const student = await registerStudent({ gradeLevel: 4 });
    const lookup = await asViewer(null, async (query) =>
      query("select id, display_name from public.app_login_lookup_student($1)", [student.accessCode]),
    );
    expect(lookup).toHaveLength(1);
    expect(lookup[0].id).toBe(student.id);
  });

  it("kode kelas yang diisi saat mendaftar langsung menjadi keanggotaan", async () => {
    const student = await registerStudent({ joinCode: class5A.joinCode });
    const classes = await getStudentClasses(studentViewer(student.id), student.id);
    expect(classes.classes.map((item) => item.id)).toEqual([class5A.id]);
    // Tanpa tingkat eksplisit, tingkat mengikuti kelas yang dimasuki.
    expect(classes.gradeLevel).toBe(5);
  });

  it("tingkat yang tidak cocok dengan kelas ditolak saat mendaftar", async () => {
    await expect(registerStudent({ joinCode: class2A.joinCode, gradeLevel: 5 })).rejects.toThrow(/TINGKAT_TIDAK_COCOK/);
  });
});

describe("konten mandiri sesuai tingkat kelas", () => {
  it("siswa tanpa kelas melihat misi sesuai tingkatnya saja", async () => {
    const student = await registerStudent({ gradeLevel: 4 });
    const cards = await listMissionCards(studentViewer(student.id), student.id);
    expect(cards.map((card) => card.id)).toContain(mission4.id);
    expect(cards.map((card) => card.id)).not.toContain(mission5.id);
  });

  it("siswa tanpa tingkat belum bisa membuka misi", async () => {
    const student = await registerStudent({});
    expect(await listMissionCards(studentViewer(student.id), student.id)).toHaveLength(0);

    await setStudentGrade(studentViewer(student.id), student.id, 4);
    const cards = await listMissionCards(studentViewer(student.id), student.id);
    expect(cards.map((card) => card.id)).toContain(mission4.id);
  });

  it("misi draf tetap tidak terlihat siswa mandiri", async () => {
    const draft = await createMissionRef({
      authorId: teacherA.id,
      title: "Draf Kelas 4",
      slug: "draf-kelas-4",
      gradeLevel: 4,
      orderIndex: 2,
      published: false,
      questions: [{ questionType: "numeric", prompt: "Berapa 5 + 5?", correctAnswer: "10", explanation: "5 + 5 = 10." }],
    });
    const student = await registerStudent({ gradeLevel: 4 });
    const cards = await listMissionCards(studentViewer(student.id), student.id);
    expect(cards.map((card) => card.id)).not.toContain(draft.id);
  });
});

describe("gabung kelas setelah mendaftar", () => {
  it("bergabung dengan kode tanpa membuat akun baru", async () => {
    const student = await registerStudent({ gradeLevel: 5 });
    const before = await adminQuery<{ count: string }>("select count(*)::text from profiles where role = 'student'");

    const result = await joinClassWithCode(studentViewer(student.id), class5A.joinCode);
    expect(result.status).toBe("BERHASIL");
    expect(result.className).toContain("5A");

    const after = await adminQuery<{ count: string }>("select count(*)::text from profiles where role = 'student'");
    expect(after[0].count).toBe(before[0].count);
  });

  it("satu siswa dapat bergabung ke beberapa kelas dengan akun yang sama", async () => {
    const student = await registerStudent({ gradeLevel: 5 });
    expect((await joinClassWithCode(studentViewer(student.id), class5A.joinCode)).status).toBe("BERHASIL");
    expect((await joinClassWithCode(studentViewer(student.id), class5B.joinCode)).status).toBe("BERHASIL");

    const classes = await getStudentClasses(studentViewer(student.id), student.id);
    expect(classes.classes.map((item) => item.name.length > 0)).toHaveLength(2);
    expect(classes.classes.map((item) => item.id).sort()).toEqual([class5A.id, class5B.id].sort());
  });

  it("keanggotaan ganda pada kelas yang sama dicegah", async () => {
    const student = await registerStudent({ gradeLevel: 5 });
    await joinClassWithCode(studentViewer(student.id), class5A.joinCode);
    const again = await joinClassWithCode(studentViewer(student.id), class5A.joinCode);
    expect(again.status).toBe("SUDAH_TERGABUNG");

    const rows = await adminQuery<{ count: string }>(
      "select count(*)::text from class_members where student_id = $1 and class_id = $2",
      [student.id, class5A.id],
    );
    expect(Number(rows[0].count)).toBe(1);
  });

  it("kode salah tidak menambah akses apa pun", async () => {
    const student = await registerStudent({ gradeLevel: 5 });
    const result = await joinClassWithCode(studentViewer(student.id), "ZZZZZZ");
    expect(result.status).toBe("KODE_TIDAK_DITEMUKAN");

    const classes = await getStudentClasses(studentViewer(student.id), student.id);
    expect(classes.classes).toHaveLength(0);
  });

  it("kelas dengan tingkat berbeda tidak bisa dimasuki", async () => {
    const student = await registerStudent({ gradeLevel: 5 });
    const result = await joinClassWithCode(studentViewer(student.id), class2A.joinCode);
    expect(result.status).toBe("TINGKAT_TIDAK_COCOK");

    const classes = await getStudentClasses(studentViewer(student.id), student.id);
    expect(classes.classes).toHaveLength(0);
  });

  it("penebakan kode dibatasi setelah beberapa kegagalan", async () => {
    const student = await registerStudent({ gradeLevel: 5 });
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const result = await joinClassWithCode(studentViewer(student.id), `ZZZZZ${attempt}`);
      expect(result.status).toBe("KODE_TIDAK_DITEMUKAN");
    }
    const limited = await joinClassWithCode(studentViewer(student.id), class5A.joinCode);
    expect(limited.status).toBe("TERLALU_BANYAK_PERCOBAAN");

    const classes = await getStudentClasses(studentViewer(student.id), student.id);
    expect(classes.classes).toHaveLength(0);
  });

  it("guru tidak dapat memakai jalur gabung kelas", async () => {
    const result = await joinClassWithCode(teacherViewer(teacherA.id), class5A.joinCode);
    expect(result.status).toBe("BUKAN_SISWA");
  });

  it("siswa tidak bisa menyisipkan keanggotaan langsung lewat SQL", async () => {
    const student = await registerStudent({ gradeLevel: 5 });
    await expect(
      asViewer(studentViewer(student.id), async (query) =>
        query("insert into class_members (class_id, student_id) values ($1, $2)", [class5A.id, student.id]),
      ),
    ).rejects.toThrow();
  });
});

describe("tugas kelas dan isolasi data", () => {
  it("tugas kelas tampil hanya untuk anggota kelas itu", async () => {
    await adminQuery("insert into mission_classes (mission_id, class_id) values ($1, $2) on conflict do nothing", [
      mission5.id,
      class5B.id,
    ]);

    const in5B = await registerStudent({ gradeLevel: 5, joinCode: class5B.joinCode });
    const in5A = await registerStudent({ gradeLevel: 5, joinCode: class5A.joinCode });

    const classes5B = await getStudentClasses(studentViewer(in5B.id), in5B.id);
    expect(classes5B.classes[0].tasks.map((task) => task.slug)).toContain("misi-kelas-5");

    // Kelas 5A bukan penerima tugas, jadi kartunya tidak boleh muncul walau tingkatnya sama.
    const cards5A = await listMissionCards(studentViewer(in5A.id), in5A.id);
    expect(cards5A.map((card) => card.id)).not.toContain(mission5.id);
  });

  it("siswa tidak melihat anggota kelas lain", async () => {
    const mine = await registerStudent({ gradeLevel: 5, joinCode: class5A.joinCode });
    const other = await registerStudent({ gradeLevel: 5, joinCode: class5A.joinCode });

    const members = (await asViewer(studentViewer(mine.id), async (query) =>
      query("select student_id from class_members"),
    )) as Array<{ student_id: string }>;
    expect(members.every((row) => row.student_id === mine.id)).toBe(true);
    expect(members.some((row) => row.student_id === other.id)).toBe(false);

    const otherProfile = await asViewer(studentViewer(mine.id), async (query) =>
      query("select id from profiles where id = $1", [other.id]),
    );
    expect(otherProfile).toHaveLength(0);
  });

  it("siswa tidak melihat penugasan kelas yang bukan miliknya", async () => {
    const mine = await registerStudent({ gradeLevel: 5, joinCode: class5A.joinCode });
    const assignments = (await asViewer(studentViewer(mine.id), async (query) =>
      query("select class_id from mission_classes"),
    )) as Array<{ class_id: string }>;
    expect(assignments.some((row) => row.class_id === class5B.id)).toBe(false);
  });
});

describe("kewenangan guru", () => {
  it("guru lain tidak bisa mengelola kelas atau anggotanya", async () => {
    expect(await getClassDetail(teacherViewer(teacherB.id), class5A.id)).toBeNull();
    expect(await removeClassMember(teacherViewer(teacherB.id), class5A.id, "00000000-0000-0000-0000-000000000000")).toBe(
      false,
    );
    await expect(setClassGrade(teacherViewer(teacherB.id), class5A.id, 3)).rejects.toThrow(TeacherError);
  });

  it("guru tidak bisa mengubah tingkat kelas bila ada anggota dengan tingkat berbeda", async () => {
    const class3 = await createClassroom(teacherA.id, "3A", 3);
    await registerStudent({ gradeLevel: 3, joinCode: class3.joinCode });
    await expect(setClassGrade(teacherViewer(teacherA.id), class3.id, 4)).rejects.toThrow(/tingkat kelas lain/i);
  });

  it("siswa tanpa tingkat mengikuti tingkat kelas saat bergabung", async () => {
    const student = await registerStudent({});
    const result = await joinClassWithCode(studentViewer(student.id), class2A.joinCode);
    expect(result.status).toBe("BERHASIL");

    const classes = await getStudentClasses(studentViewer(student.id), student.id);
    expect(classes.gradeLevel).toBe(2);
  });
});

describe("progres lama tetap aman", () => {
  it("keluar kelas tidak menghapus akun, progres, atau riwayat", async () => {
    const student = await registerStudent({ gradeLevel: 5, joinCode: class5A.joinCode });
    const started = await startOrResumeAttempt(studentViewer(student.id), student.id, "misi-kelas-5-terbuka");
    if (started.ok) {
      await submitAnswer(studentViewer(student.id), student.id, {
        attemptId: started.state.attemptId,
        questionId: started.state.questions[0].id,
        answer: "6",
      });
      await adminQuery("update attempts set completed_at = now(), score = 100, correct_count = 1 where id = $1", [
        started.state.attemptId,
      ]);
    }

    expect(await leaveClass(studentViewer(student.id), student.id, class5A.id)).toBe(true);

    const classes = await getStudentClasses(studentViewer(student.id), student.id);
    expect(classes.classes).toHaveLength(0);

    const progress = await getProgress(studentViewer(student.id), student.id);
    expect(progress.history.length).toBeGreaterThan(0);

    if (started.ok) {
      const result = await getAttemptResult(studentViewer(student.id), started.state.attemptId);
      expect(result).not.toBeNull();
      expect(result?.answers).toHaveLength(1);
    }

    // Tetap bisa belajar mandiri sesuai tingkat profil setelah keluar kelas.
    const cards = await listMissionCards(studentViewer(student.id), student.id);
    expect(cards.map((card) => card.id)).toContain(mission5Open.id);
    expect(cards.map((card) => card.id)).not.toContain(mission4.id);
  });

  it("guru tetap melihat kelas dan jumlah siswanya setelah perubahan skema", async () => {
    const classes = await listTeacherClasses(teacherViewer(teacherA.id), teacherA.id);
    expect(classes.some((item) => item.id === class5A.id)).toBe(true);
    const detail = await getClassDetail(teacherViewer(teacherA.id), class5A.id);
    expect(detail?.students.some((student) => student.gradeLevel !== null)).toBe(true);
  });
});

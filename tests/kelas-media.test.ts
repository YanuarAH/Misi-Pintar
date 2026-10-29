import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MediaError, MAX_IMAGE_BYTES, mediaRoot, readImageBytes } from "@/lib/mediaStore";
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
import {
  archiveClass,
  deleteClass,
  getClassDetail,
  listTeacherClasses,
  restoreClass,
  setMissionClasses,
  TeacherError,
} from "@/server/teacher";
import {
  getStudentClasses,
  joinClassWithCode,
  leaveClass,
  listMissionCards,
  startOrResumeAttempt,
} from "@/server/student";
import { attachQuestionImage, detachQuestionImage, getMediaForViewer } from "@/server/media";

const teacherViewer = (id: string) => ({ userId: id, role: "teacher" as const });
const studentViewer = (id: string) => ({ userId: id, role: "student" as const });

// PNG 1×1 transparan.
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function pngFile(name = "gambar.png"): File {
  return new File([new Uint8Array(PNG_1PX)], name, { type: "image/png" });
}

let teacherA: { id: string };
let teacherB: { id: string };
let mission5: { id: string; slug: string };
let missionImg: { id: string; slug: string };
let questionId: string;
let mediaDir: string;

async function fileCount(): Promise<number> {
  try {
    return (await readdir(mediaRoot())).length;
  } catch {
    return 0;
  }
}

beforeAll(async () => {
  mediaDir = await mkdtemp(path.join(tmpdir(), "misi-media-"));
  process.env.MEDIA_ROOT = mediaDir;

  await resetData();
  teacherA = await createTeacher("Guru A");
  teacherB = await createTeacher("Guru B");

  mission5 = await createMission({
    authorId: teacherA.id,
    title: "Misi Kelas",
    slug: "misi-kelas-arsip",
    gradeLevel: 5,
    audience: "class_only",
    questions: [
      {
        questionType: "numeric",
        prompt: "Berapa hasil 2 + 2?",
        correctAnswer: "4",
        explanation: "2 + 2 = 4.",
      },
    ],
  });

  // Misi tanpa penugasan: dipakai untuk uji gambar agar tidak terpengaruh status kelas.
  missionImg = await createMission({
    authorId: teacherA.id,
    title: "Misi Bergambar",
    slug: "misi-bergambar",
    gradeLevel: 5,
    questions: [
      {
        questionType: "numeric",
        prompt: "Berapa hasil 2 + 2?",
        correctAnswer: "4",
        explanation: "2 + 2 = 4.",
      },
    ],
  });

  const [question] = await adminQuery<{ id: string }>("select id from questions where mission_id = $1", [
    missionImg.id,
  ]);
  questionId = question.id;
});

afterAll(async () => {
  await closePools();
  await rm(mediaDir, { recursive: true, force: true });
});

describe("arsip kelas", () => {
  it("guru dapat mengarsipkan kelasnya sendiri dan siswa tidak melihatnya lagi", async () => {
    const classroom = await createClassroom(teacherA.id, "Arsip A", 5);
    const student = await createStudent({ classId: classroom.id });

    expect((await getStudentClasses(studentViewer(student.id), student.id)).classes).toHaveLength(1);

    await archiveClass(teacherViewer(teacherA.id), classroom.id);

    const archivedAt = await adminQuery<{ archived_at: Date | null }>(
      "select archived_at from classes where id = $1",
      [classroom.id],
    );
    expect(archivedAt[0].archived_at).not.toBeNull();

    // Siswa tidak lagi melihat kelas arsip, tetapi keanggotaannya tetap tercatat.
    expect((await getStudentClasses(studentViewer(student.id), student.id)).classes).toHaveLength(0);
    const membership = await adminQuery<{ count: string }>(
      "select count(*)::text from class_members where class_id = $1",
      [classroom.id],
    );
    expect(Number(membership[0].count)).toBe(1);

    // Guru tetap melihatnya di daftar (sebagai arsip).
    const listed = await listTeacherClasses(teacherViewer(teacherA.id), teacherA.id);
    expect(listed.find((item) => item.id === classroom.id)?.archived_at).not.toBeNull();
  });

  it("guru lain tidak dapat mengarsipkan atau menghapus kelas orang lain", async () => {
    const classroom = await createClassroom(teacherA.id, "Milik A", 5);

    await expect(archiveClass(teacherViewer(teacherB.id), classroom.id)).rejects.toThrow(TeacherError);
    await expect(deleteClass(teacherViewer(teacherB.id), classroom.id, teacherB.id)).rejects.toThrow(TeacherError);

    const row = await adminQuery<{ archived_at: Date | null }>(
      "select archived_at from classes where id = $1",
      [classroom.id],
    );
    expect(row).toHaveLength(1);
    expect(row[0].archived_at).toBeNull();
  });

  it("kelas kosong boleh dihapus permanen", async () => {
    const classroom = await createClassroom(teacherA.id, "Kosong", 5);
    await deleteClass(teacherViewer(teacherA.id), classroom.id, teacherA.id);

    const row = await adminQuery<{ count: string }>("select count(*)::text from classes where id = $1", [
      classroom.id,
    ]);
    expect(Number(row[0].count)).toBe(0);
  });

  it("kelas berisi siswa tidak dihapus permanen, harus diarsipkan", async () => {
    const classroom = await createClassroom(teacherA.id, "Ada Siswa", 5);
    const student = await createStudent({ classId: classroom.id });

    await expect(deleteClass(teacherViewer(teacherA.id), classroom.id, teacherA.id)).rejects.toThrow(/anggota/i);

    const row = await adminQuery<{ count: string }>("select count(*)::text from classes where id = $1", [
      classroom.id,
    ]);
    expect(Number(row[0].count)).toBe(1);

    await archiveClass(teacherViewer(teacherA.id), classroom.id);
    expect((await getStudentClasses(studentViewer(student.id), student.id)).classes).toHaveLength(0);
  });

  it("kelas kosong dapat dihapus permanen tanpa pengaruh tugas mapelnya", async () => {
    const classroom = await createClassroom(teacherA.id, "Ada Tugas", 5);
    await adminQuery("insert into mission_classes (mission_id, class_id) values ($1, $2)", [
      mission5.id,
      classroom.id,
    ]);

    await deleteClass(teacherViewer(teacherA.id), classroom.id, teacherA.id);
    expect(
      await adminQuery("select class_id from mission_classes where class_id = $1", [classroom.id]),
    ).toHaveLength(0);
    expect(
      await adminQuery("select id from classes where id = $1", [classroom.id]),
    ).toHaveLength(0);
  });

  it("kelas arsip tidak menerima anggota baru maupun tugas baru", async () => {
    const classroom = await createClassroom(teacherA.id, "Terkunci", 5);
    await archiveClass(teacherViewer(teacherA.id), classroom.id);

    const newcomer = await createStudent({ gradeLevel: 5 });
    const join = await joinClassWithCode(studentViewer(newcomer.id), classroom.joinCode);
    expect(join.status).toBe("KELAS_DIARSIPKAN");

    await expect(
      adminQuery("insert into class_members (class_id, student_id) values ($1, $2)", [classroom.id, newcomer.id]),
    ).rejects.toThrow(/diarsipkan/i);

    await expect(
      setMissionClasses(teacherViewer(teacherA.id), teacherA.id, mission5.id, [classroom.id]),
    ).rejects.toThrow(/diarsipkan/i);

    await expect(
      adminQuery("insert into mission_classes (mission_id, class_id) values ($1, $2)", [
        mission5.id,
        classroom.id,
      ]),
    ).rejects.toThrow(/diarsipkan/i);
  });

  it("kelas arsip tidak lagi memberi akses tugas, tetapi progres mandiri tetap", async () => {
    const classroom = await createClassroom(teacherA.id, "Akses", 5);
    await setMissionClasses(teacherViewer(teacherA.id), teacherA.id, mission5.id, [classroom.id]);

    // Misi tanpa penugasan tetap terbuka untuk belajar mandiri.
    const selfStudy = await createMission({
      authorId: teacherA.id,
      title: "Misi Mandiri",
      slug: "misi-mandiri-arsip",
      gradeLevel: 5,
      orderIndex: 2,
      questions: [
        {
          questionType: "numeric",
          prompt: "Berapa hasil 5 + 5?",
          correctAnswer: "10",
          explanation: "5 + 5 = 10.",
        },
      ],
    });

    const student = await createStudent({ classId: classroom.id, gradeLevel: 5 });

    const before = await listMissionCards(studentViewer(student.id), student.id);
    expect(before.map((card) => card.id)).toEqual(expect.arrayContaining([mission5.id, selfStudy.id]));

    const started = await startOrResumeAttempt(studentViewer(student.id), student.id, mission5.slug);
    expect(started.ok).toBe(true);

    await archiveClass(teacherViewer(teacherA.id), classroom.id);

    const after = await listMissionCards(studentViewer(student.id), student.id);
    expect(after.map((card) => card.id)).not.toContain(mission5.id);
    expect(after.map((card) => card.id)).toContain(selfStudy.id);

    // Riwayat & keanggotaan tetap ada.
    const history = await adminQuery<{ count: string }>(
      "select count(*)::text from attempts where student_id = $1",
      [student.id],
    );
    expect(Number(history[0].count)).toBeGreaterThan(0);
  });

  it("kelas arsip dapat dipulihkan beserta anggotanya", async () => {
    const classroom = await createClassroom(teacherA.id, "Pulih", 5);
    const student = await createStudent({ classId: classroom.id });
    await archiveClass(teacherViewer(teacherA.id), classroom.id);
    await restoreClass(teacherViewer(teacherA.id), classroom.id);

    const detail = await getClassDetail(teacherViewer(teacherA.id), classroom.id);
    expect(detail?.classroom.archived_at).toBeNull();
    expect(detail?.students.map((item) => item.id)).toContain(student.id);
    expect((await getStudentClasses(studentViewer(student.id), student.id)).classes).toHaveLength(1);
  });

  it("siswa tidak dapat mengubah atau menghapus kelas lewat SQL langsung", async () => {
    const classroom = await createClassroom(teacherA.id, "SQL", 5);
    const student = await createStudent({ classId: classroom.id });

    const updated = await asViewer(studentViewer(student.id), async (query) =>
      query("update classes set name = 'Dibajak' where id = $1 returning id", [classroom.id]),
    );
    expect(updated).toHaveLength(0);

    const deleted = await asViewer(studentViewer(student.id), async (query) =>
      query("delete from classes where id = $1 returning id", [classroom.id]),
    );
    expect(deleted).toHaveLength(0);

    const row = await adminQuery<{ name: string }>("select name from classes where id = $1", [classroom.id]);
    expect(row[0].name.startsWith("SQL")).toBe(true);
  });
});

describe("gambar soal", () => {
  it("menyimpan gambar PNG dan siswa yang berhak dapat membacanya", async () => {
    const attached = await attachQuestionImage(teacherViewer(teacherA.id), questionId, pngFile());
    expect(attached.imageId).toBeTruthy();

    const row = await adminQuery<{ image_id: string; storage_key: string; mime_type: string }>(
      `select q.image_id, m.mime_type, m.storage_key from questions q
         join media_assets m on m.id = q.image_id where q.id = $1`,
      [questionId],
    );
    expect(row[0].mime_type).toBe("image/png");
    expect(row[0].storage_key).toMatch(/\.png$/);

    const stored = await readImageBytes(row[0].storage_key);
    expect(stored?.byteLength).toBe(PNG_1PX.byteLength);

    // Guru penulis misi.
    expect(await getMediaForViewer(teacherViewer(teacherA.id), attached.imageId)).not.toBeNull();

    // Siswa yang boleh melihat misi terbit.
    const student = await createStudent({ gradeLevel: 5 });
    const media = await getMediaForViewer(studentViewer(student.id), attached.imageId);
    expect(media?.mime).toBe("image/png");

    // Konsisten dengan RLS soal: misi terbit boleh dibaca guru lain, tetapi tidak boleh diubah.
    expect(await getMediaForViewer(teacherViewer(teacherB.id), attached.imageId)).not.toBeNull();
    await expect(attachQuestionImage(teacherViewer(teacherB.id), questionId, pngFile("asing.png"))).rejects.toThrow(
      /bukan milik misi/i,
    );

    // Siswa yang tidak berhak (tingkat berbeda) tidak bisa membaca.
    const outsider = await createStudent({ gradeLevel: 2 });
    expect(await getMediaForViewer(studentViewer(outsider.id), attached.imageId)).toBeNull();

    await detachQuestionImage(teacherViewer(teacherA.id), questionId);
  });

  it("menolak tipe file yang tidak didukung dan ukuran berlebihan tanpa menyisakan file", async () => {
    const before = await fileCount();

    const gif = new File([new Uint8Array(Buffer.from("GIF89a-bukan-gambar-valid"))], "x.gif", { type: "image/gif" });
    await expect(attachQuestionImage(teacherViewer(teacherA.id), questionId, gif)).rejects.toThrow(MediaError);

    const tooBig = new File([new Uint8Array(Buffer.alloc(MAX_IMAGE_BYTES + 10, 1))], "besar.png", {
      type: "image/png",
    });
    await expect(attachQuestionImage(teacherViewer(teacherA.id), questionId, tooBig)).rejects.toThrow(/3 MB/);

    expect(await fileCount()).toBe(before);

    const row = await adminQuery<{ image_id: string | null }>("select image_id from questions where id = $1", [
      questionId,
    ]);
    expect(row[0].image_id).toBeNull();
  });

  it("mengganti gambar menghapus file lama", async () => {
    const first = await attachQuestionImage(teacherViewer(teacherA.id), questionId, pngFile("satu.png"));
    const firstRow = await adminQuery<{ storage_key: string }>(
      "select storage_key from media_assets where id = $1",
      [first.imageId],
    );

    const second = await attachQuestionImage(teacherViewer(teacherA.id), questionId, pngFile("dua.png"));
    expect(second.imageId).not.toBe(first.imageId);

    expect(await readImageBytes(firstRow[0].storage_key)).toBeNull();
    const oldRows = await adminQuery<{ count: string }>("select count(*)::text from media_assets where id = $1", [
      first.imageId,
    ]);
    expect(Number(oldRows[0].count)).toBe(0);
  });

  it("file yang masih dipakai soal lain tidak ikut terhapus", async () => {
    const shared = await attachQuestionImage(teacherViewer(teacherA.id), questionId, pngFile("bersama.png"));
    const sharedRow = await adminQuery<{ storage_key: string }>(
      "select storage_key from media_assets where id = $1",
      [shared.imageId],
    );

    // Soal kedua memakai file yang sama.
    const [secondQuestion] = await adminQuery<{ id: string }>(
      `insert into questions (mission_id, question_type, prompt, options, correct_answer, explanation,
                              hint, difficulty, order_index, slot_index, topic, image_id)
       values ($1, 'numeric', 'Berapa 3 + 3?', null, '6', '3 + 3 = 6.', '', 'mudah', 2, 2,
               'penjumlahan-pengurangan', $2) returning id`,
      [missionImg.id, shared.imageId],
    );

    // Ganti gambar soal pertama: file masih dipakai soal kedua.
    await attachQuestionImage(teacherViewer(teacherA.id), questionId, pngFile("baru.png"));
    expect(await readImageBytes(sharedRow[0].storage_key)).not.toBeNull();

    // Lepas dari soal kedua: sekarang file boleh dibersihkan.
    await detachQuestionImage(teacherViewer(teacherA.id), secondQuestion.id);
    expect(await readImageBytes(sharedRow[0].storage_key)).toBeNull();
    await adminQuery("delete from questions where id = $1", [secondQuestion.id]);
  });

  it("melepas gambar tidak menghapus soal", async () => {
    await attachQuestionImage(teacherViewer(teacherA.id), questionId, pngFile("lepas.png"));
    await detachQuestionImage(teacherViewer(teacherA.id), questionId);

    const row = await adminQuery<{ image_id: string | null; prompt: string }>(
      "select image_id, prompt from questions where id = $1",
      [questionId],
    );
    expect(row).toHaveLength(1);
    expect(row[0].image_id).toBeNull();
    expect(row[0].prompt.length).toBeGreaterThan(0);
  });

  it("guru lain tidak dapat mengganti gambar soal yang bukan misinya", async () => {
    await expect(attachQuestionImage(teacherViewer(teacherB.id), questionId, pngFile("asing.png"))).rejects.toThrow(
      /bukan milik misi/i,
    );
  });

  it("soal tanpa gambar tetap berfungsi dan payload siswa berisi URL gambar saat ada", async () => {
    const student = await createStudent({ gradeLevel: 5 });
    const started = await startOrResumeAttempt(studentViewer(student.id), student.id, missionImg.slug);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    expect(started.state.questions[0].imageUrl).toBeNull();

    const attached = await attachQuestionImage(teacherViewer(teacherA.id), questionId, pngFile("payload.png"));
    const withImage = await startOrResumeAttempt(studentViewer(student.id), student.id, missionImg.slug);
    if (!withImage.ok) return;
    const question = withImage.state.questions.find((item) => item.id === questionId);
    expect(question?.imageUrl).toBe(`/media/${attached.imageId}`);
  });

  it("siswa tidak bisa menghapus baris media lewat SQL", async () => {
    const attached = await attachQuestionImage(teacherViewer(teacherA.id), questionId, pngFile("proteksi.png"));
    const student = await createStudent({ gradeLevel: 5 });

    const deleted = await asViewer(studentViewer(student.id), async (query) =>
      query("delete from media_assets where id = $1 returning id", [attached.imageId]),
    );
    expect(deleted).toHaveLength(0);
  });
});

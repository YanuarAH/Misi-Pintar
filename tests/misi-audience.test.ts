import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminQuery, closePools, createClassroom, createStudent, createTeacher, resetData } from "./helpers/db";
import {
  archiveClass,
  createMission,
  setMissionClasses,
  setMissionPublished,
  setClassGrade,
  setClassSubject,
  updateMission,
} from "@/server/teacher";
import { getAttemptResult, getStudentClasses, listMissionCards, startOrResumeAttempt } from "@/server/student";

const teacherViewer = (id: string) => ({ userId: id, role: "teacher" as const });
const studentViewer = (id: string) => ({ userId: id, role: "student" as const });

let teacher: { id: string };
let classA: { id: string };
let classB: { id: string };
let classC: { id: string };

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

it("kelas matematika dan IPAS hanya melihat misi mapelnya, termasuk daftar kelas siswa", async () => {
  const math = await createMission(
    teacherViewer(teacher.id),
    teacher.id,
    missionInput({ audience: "public", orderIndex: 3 }) as never,
  );
  const ipa = await createMission(
    teacherViewer(teacher.id),
    teacher.id,
    missionInput({
      audience: "public",
      orderIndex: 4,
      subject: "ipa",
      topic: "makhluk-hidup",
    }) as never,
  );
  await publish(math.id);
  await publish(ipa.id);

  const mathStudent = await createStudent({ classId: classA.id, gradeLevel: 5 });
  const ipaStudent = await createStudent({ classId: classB.id, gradeLevel: 5 });
  const mathCards = await listMissionCards(studentViewer(mathStudent.id), mathStudent.id);
  const ipaCards = await listMissionCards(studentViewer(ipaStudent.id), ipaStudent.id);
  expect(mathCards.map((card) => card.id)).toContain(math.id);
  expect(mathCards.map((card) => card.id)).not.toContain(ipa.id);
  expect(ipaCards.map((card) => card.id)).toContain(ipa.id);
  expect(ipaCards.map((card) => card.id)).not.toContain(math.id);

  const classes = await getStudentClasses(studentViewer(mathStudent.id), mathStudent.id);
  expect(classes.classes[0].subjectLabel).toBe("Matematika");
  expect(classes.classes[0].tasks.map((task) => task.slug)).toContain(math.slug);
  expect(classes.classes[0].tasks.map((task) => task.slug)).not.toContain(ipa.slug);
});

it("kelas lama mulai menerima misi setelah mata pelajarannya diatur", async () => {
  const legacyClass = await createClassroom(teacher.id, "Kelas lama", 5, null);
  const member = await createStudent({ classId: legacyClass.id, gradeLevel: 5 });
  const mission = await createMission(
    teacherViewer(teacher.id),
    teacher.id,
    missionInput({ audience: "class_only" }) as never,
  );
  await publish(mission.id);

  expect((await listMissionCards(studentViewer(member.id), member.id)).map((card) => card.id)).not.toContain(
    mission.id,
  );
  await setClassSubject(teacherViewer(teacher.id), legacyClass.id, "matematika");
  expect((await listMissionCards(studentViewer(member.id), member.id)).map((card) => card.id)).toContain(mission.id);
});

async function addQuestion(missionId: string) {
  await adminQuery(
    `insert into questions
       (mission_id, question_type, prompt, options, correct_answer, explanation, difficulty,
        order_index, slot_index, variant_index, topic)
     values ($1, 'numeric', 'Berapa hasil 6 + 4?', null, '10', '6 + 4 = 10.', 'mudah', 1, 1, 0, 'pecahan')`,
    [missionId],
  );
}

async function publish(missionId: string) {
  await addQuestion(missionId);
  await setMissionPublished(teacherViewer(teacher.id), missionId, true);
}

beforeAll(async () => {
  await resetData();
  teacher = await createTeacher("Guru Audiens");
  classA = await createClassroom(teacher.id, "5A Audiens", 5);
  classB = await createClassroom(teacher.id, "5B Audiens", 5, "ipa");
  classC = await createClassroom(teacher.id, "5C Audiens", 5);
});

afterAll(async () => {
  await closePools();
});

describe("audiens misi memisahkan belajar mandiri dan misi kelas", () => {
  it("misi kelas otomatis terlihat oleh anggota kelas dengan tingkat dan mata pelajaran yang cocok", async () => {
    const mission = await createMission(
      teacherViewer(teacher.id),
      teacher.id,
      missionInput({ audience: "class_only" }) as never,
    );
    await publish(mission.id);

    const member = await createStudent({ classId: classA.id, gradeLevel: 5 });
    const otherClass = await createStudent({ classId: classB.id, gradeLevel: 5 });
    const selfPaced = await createStudent({ gradeLevel: 5 });

    const cardsMember = await listMissionCards(studentViewer(member.id), member.id);
    expect(cardsMember.map((card) => card.id)).toContain(mission.id);

    for (const outsider of [otherClass, selfPaced]) {
      const cards = await listMissionCards(studentViewer(outsider.id), outsider.id);
      expect(cards.map((card) => card.id)).not.toContain(mission.id);
      const started = await startOrResumeAttempt(studentViewer(outsider.id), outsider.id, mission.slug);
      expect(started.ok).toBe(false);
    }
  });

  it("misi kelas tanpa penugasan manual otomatis tampil berdasarkan mata pelajaran", async () => {
    const [row] = await adminQuery<{ id: string; slug: string }>(
      `insert into missions
         (slug, title, description, story, learning_objectives, order_index, is_published, author_id,
          grade_level, subject_slug, topic_slug, audience)
       values ($1, 'Misi Tanpa Kelas', '', '', '{}', 9, true, $2, 5, 'matematika', 'pecahan', 'class_only')
       returning id, slug`,
      [`misi-tanpa-kelas-${Date.now()}`, teacher.id],
    );
    await addQuestion(row.id);

    const member = await createStudent({ classId: classA.id, gradeLevel: 5 });
    const selfPaced = await createStudent({ gradeLevel: 5 });
    expect((await listMissionCards(studentViewer(member.id), member.id)).map((card) => card.id)).toContain(row.id);
    expect((await listMissionCards(studentViewer(selfPaced.id), selfPaced.id)).map((card) => card.id)).not.toContain(row.id);
  });

  it("misi belajar mandiri tetap terbuka untuk siswa setingkat tanpa kelas", async () => {
    const mission = await createMission(
      teacherViewer(teacher.id),
      teacher.id,
      missionInput({ audience: "public", orderIndex: 2 }) as never,
    );
    await publish(mission.id);

    const selfPaced = await createStudent({ gradeLevel: 5 });
    const cards = await listMissionCards(studentViewer(selfPaced.id), selfPaced.id);
    expect(cards.map((card) => card.id)).toContain(mission.id);
    expect(cards.find((card) => card.id === mission.id)?.audience).toBe("public");
  });

  it("hasil misi Inggris tidak menawarkan misi Bahasa Indonesia sebagai misi berikutnya", async () => {
    const englishClass = await createClassroom(teacher.id, "Kelas Inggris", 5, "matematika");
    await setClassSubject(teacherViewer(teacher.id), englishClass.id, "bahasa-inggris");
    const student = await createStudent({ classId: englishClass.id, gradeLevel: 5 });

    const englishMission = await createMission(
      teacherViewer(teacher.id),
      teacher.id,
      missionInput({
        audience: "class_only",
        subject: "bahasa-inggris",
        topic: "kosa-kata-inggris",
        orderIndex: 1,
      }) as never,
    );
    const indonesianMission = await createMission(
      teacherViewer(teacher.id),
      teacher.id,
      missionInput({
        audience: "public",
        subject: "bahasa-indonesia",
        topic: "membaca-teks",
        orderIndex: 2,
      }) as never,
    );
    await publish(englishMission.id);
    await publish(indonesianMission.id);
    const [attempt] = await adminQuery<{ id: string }>(
      `insert into attempts
         (student_id, mission_id, question_ids, total_questions, score, correct_count, xp_earned, completed_at)
       values ($1, $2, '{}', 1, 100, 1, 30, now())
       returning id`,
      [student.id, englishMission.id],
    );

    const result = await getAttemptResult(studentViewer(student.id), attempt.id);
    expect(result?.nextMission).toBeNull();
  });

  it("menerbitkan misi kelas tanpa penugasan manual diperbolehkan", async () => {
    const mission = await createMission(
      teacherViewer(teacher.id),
      teacher.id,
      missionInput({ audience: "class_only" }) as never,
    );
    await addQuestion(mission.id);

    const published = await setMissionPublished(teacherViewer(teacher.id), mission.id, true);
    expect(published.is_published).toBe(true);
  });

  it("mengubah misi menjadi khusus kelas mencabut akses siswa di luar kelas", async () => {
    const mission = await createMission(
      teacherViewer(teacher.id),
      teacher.id,
      missionInput({ audience: "public" }) as never,
    );
    await publish(mission.id);

    const member = await createStudent({ classId: classA.id, gradeLevel: 5 });
    const outsider = await createStudent({ gradeLevel: 5 });
    expect((await listMissionCards(studentViewer(outsider.id), outsider.id)).map((card) => card.id)).toContain(
      mission.id,
    );

    await setMissionClasses(teacherViewer(teacher.id), teacher.id, mission.id, [classA.id]);
    await updateMission(teacherViewer(teacher.id), mission.id, {
      ...missionInput({ slug: mission.slug, audience: "class_only" }),
    } as never);

    expect((await listMissionCards(studentViewer(outsider.id), outsider.id)).map((card) => card.id)).not.toContain(
      mission.id,
    );
    expect((await listMissionCards(studentViewer(member.id), member.id)).map((card) => card.id)).toContain(
      mission.id,
    );
  });

  it("kelas arsip berhenti memberi akses misi kelas", async () => {
    const mission = await createMission(
      teacherViewer(teacher.id),
      teacher.id,
      missionInput({ audience: "class_only" }) as never,
    );
    await setMissionClasses(teacherViewer(teacher.id), teacher.id, mission.id, [classC.id]);
    await publish(mission.id);

    const member = await createStudent({ classId: classC.id, gradeLevel: 5 });
    expect((await listMissionCards(studentViewer(member.id), member.id)).map((card) => card.id)).toContain(
      mission.id,
    );

    await archiveClass(teacherViewer(teacher.id), classC.id);
    expect((await listMissionCards(studentViewer(member.id), member.id)).map((card) => card.id)).not.toContain(
      mission.id,
    );
  });

  it("mengubah tingkat kelas tidak menambah akses ke misi kelas lain", async () => {
    const mission = await createMission(
      teacherViewer(teacher.id),
      teacher.id,
      missionInput({ audience: "class_only" }) as never,
    );
    await setMissionClasses(teacherViewer(teacher.id), teacher.id, mission.id, [classA.id]);
    await publish(mission.id);

    const outsider = await createStudent({ gradeLevel: 5 });
    await setClassGrade(teacherViewer(teacher.id), classB.id, 5);
    expect((await listMissionCards(studentViewer(outsider.id), outsider.id)).map((card) => card.id)).not.toContain(
      mission.id,
    );
  });
});

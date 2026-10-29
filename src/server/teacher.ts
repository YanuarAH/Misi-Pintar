import { randomInt } from "node:crypto";
import { one, rows, withViewer, type Viewer } from "@/lib/db";
import { parseNumericAnswer } from "@/lib/normalize";
import { hashSecret } from "@/lib/password";
import { questionSchema, type MissionInput, type QuestionFormInput } from "@/lib/validation";
import { getTopicMastery } from "./student";
import type { MissionRow, QuestionRow } from "./types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length: number): string {
  let code = "";
  for (let index = 0; index < length; index += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

export class TeacherError extends Error {}

export async function listTeacherClasses(viewer: Viewer, teacherId: string) {
  const data = await rows<{
    id: string;
    name: string;
    join_code: string;
    grade_level: number | null;
    subject_slug: string | null;
    subject_label: string | null;
    created_at: Date;
    archived_at: Date | null;
    student_count: string;
    completion_count: string;
    avg_accuracy: number | null;
    mission_count: string;
  }>(
    viewer,
    `select c.id, c.name, c.join_code, c.grade_level, c.subject_slug, s.label as subject_label,
            c.created_at, c.archived_at,
            (select count(*) from class_members cm where cm.class_id = c.id) as student_count,
            (select count(*) from missions m
              where m.is_published and m.archived_at is null
                and m.grade_level = c.grade_level and m.subject_slug = c.subject_slug) as mission_count,
            (select count(*) from attempts a
               join missions m on m.id = a.mission_id
               join class_members cm on cm.student_id = a.student_id
               where cm.class_id = c.id and a.mode = 'mission' and a.completed_at is not null
                and m.grade_level = c.grade_level and m.subject_slug = c.subject_slug) as completion_count,
            (select round(avg(a.score))::int from attempts a
               join missions m on m.id = a.mission_id
               join class_members cm on cm.student_id = a.student_id
               where cm.class_id = c.id and a.mode = 'mission' and a.completed_at is not null
                and m.grade_level = c.grade_level and m.subject_slug = c.subject_slug) as avg_accuracy
       from classes c
       left join subjects s on s.slug = c.subject_slug
      where c.teacher_id = $1
      order by c.archived_at nulls first, c.created_at asc`,
    [teacherId],
  );

  return data.map((row) => ({
    ...row,
    studentCount: Number(row.student_count),
    completionCount: Number(row.completion_count),
    missionCount: Number(row.mission_count),
    avgAccuracy: row.avg_accuracy,
  }));
}

export async function createClass(
  viewer: Viewer,
  teacherId: string,
  name: string,
  gradeLevel: number,
  subjectSlug: string,
) {
  const subject = await one<{ slug: string }>(viewer, "select slug from subjects where slug = $1", [subjectSlug]);
  if (!subject) throw new TeacherError("Mata pelajaran tidak ditemukan.");

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const joinCode = randomCode(6);
    try {
      const created = await one<{ id: string; name: string; join_code: string }>(
        viewer,
        `insert into classes (teacher_id, name, join_code, grade_level, subject_slug)
         values ($1, $2, $3, $4, $5) returning id, name, join_code`,
        [teacherId, name, joinCode, gradeLevel, subjectSlug],
      );
      if (created) return created;
    } catch (error) {
      if ((error as { code?: string }).code !== "23505") throw error;
    }
  }
  throw new TeacherError("Gagal membuat kode kelas unik. Coba lagi.");
}

export type RosterStudent = {
  id: string;
  displayName: string;
  avatarKey: string;
  accessCode: string;
  /** Tingkat kelas dari profil siswa (belajar mandiri); null = belum dipilih. */
  gradeLevel: number | null;
  /** Berapa kelas belajar yang diikuti siswa ini (boleh lebih dari satu). */
  classCount: number;
  joinedAt: Date;
  attempts: number;
  completedMissions: number;
  avgAccuracy: number | null;
  lastActiveAt: Date | null;
};

export async function setClassGrade(viewer: Viewer, classId: string, gradeLevel: number): Promise<void> {
  if (!Number.isInteger(gradeLevel) || gradeLevel < 1 || gradeLevel > 6) {
    throw new TeacherError("Tingkat kelas harus 1-6.");
  }

  try {
    const updated = await one<{ id: string }>(
      viewer,
      "update classes set grade_level = $2 where id = $1 returning id",
      [classId, gradeLevel],
    );
    if (!updated) throw new TeacherError("Kelas tidak ditemukan.");
  } catch (error) {
    // Trigger database menolak perubahan yang membuat anggota jadi tidak cocok.
    const message = (error as Error).message ?? "";
    if (message.includes("anggota dengan tingkat kelas berbeda")) {
      throw new TeacherError(
        "Kelas ini masih berisi siswa dengan tingkat kelas lain. Keluarkan siswa tersebut dulu, lalu ubah tingkat kelas.",
      );
    }
    throw error;
  }
}

export async function setClassSubject(viewer: Viewer, classId: string, subjectSlug: string): Promise<void> {
  const subject = await one<{ slug: string }>(viewer, "select slug from subjects where slug = $1", [subjectSlug]);
  if (!subject) throw new TeacherError("Mata pelajaran tidak ditemukan.");

  const updated = await one<{ id: string }>(
    viewer,
    "update classes set subject_slug = $2 where id = $1 returning id",
    [classId, subjectSlug],
  );
  if (!updated) throw new TeacherError("Kelas tidak ditemukan.");
}

/** Mengarsipkan kelas: anggota & riwayat tetap ada, tetapi kelas tidak lagi membuka akses misi. */
export async function archiveClass(viewer: Viewer, classId: string): Promise<void> {
  const updated = await one<{ id: string }>(
    viewer,
    `update classes set archived_at = now(), archived_by = $2
      where id = $1 and archived_at is null
      returning id`,
    [classId, viewer?.userId ?? null],
  );
  if (!updated) throw new TeacherError("Kelas tidak ditemukan atau sudah diarsipkan.");
}

/** Memulihkan kelas arsip; anggota lama tetap menjadi anggota. */
export async function restoreClass(viewer: Viewer, classId: string): Promise<void> {
  const updated = await one<{ id: string }>(
    viewer,
    `update classes set archived_at = null, archived_by = null
      where id = $1 and archived_at is not null
      returning id`,
    [classId],
  );
  if (!updated) throw new TeacherError("Kelas tidak ditemukan atau belum diarsipkan.");
}

/**
 * Menghapus permanen — hanya bila kelas kosong (tanpa anggota) dan tanpa tugas.
 * Kelas yang punya jejak harus diarsipkan agar data historis tetap utuh.
 */
export async function deleteClass(viewer: Viewer, classId: string, teacherId: string): Promise<void> {
  const deleted = await one<{ id: string }>(
    viewer,
    `delete from classes c
      where c.id = $1 and c.teacher_id = $2
        and not exists (select 1 from class_members m where m.class_id = c.id)
      returning c.id`,
    [classId, teacherId],
  );
  if (deleted) return;

  const state = await one<{ members: string; owned: boolean }>(
    viewer,
    `select
        (select count(*)::text from class_members m where m.class_id = c.id) as members,
        c.teacher_id = $2 as owned
      from classes c where c.id = $1`,
    [classId, teacherId],
  );

  if (!state) throw new TeacherError("Kelas tidak ditemukan.");
  if (!state.owned) throw new TeacherError("Kelas ini bukan milik Anda.");
  if (Number(state.members) > 0) {
    throw new TeacherError(
      "Kelas masih punya anggota. Keluarkan anggotanya dulu, atau arsipkan kelas agar riwayat tetap tersimpan.",
    );
  }
  throw new TeacherError("Kelas gagal dihapus. Coba muat ulang halaman.");
}

export async function getClassDetail(viewer: Viewer, classId: string) {
  const classroom = await one<{
    id: string;
    name: string;
    join_code: string;
    grade_level: number | null;
    subject_slug: string | null;
    subject_label: string | null;
    created_at: Date;
    archived_at: Date | null;
  }>(
    viewer,
    `select c.id, c.name, c.join_code, c.grade_level, c.subject_slug, s.label as subject_label,
            c.created_at, c.archived_at
       from classes c
       left join subjects s on s.slug = c.subject_slug
      where c.id = $1`,
    [classId],
  );
  if (!classroom) return null;

  const roster = await rows<{
    id: string;
    display_name: string;
    avatar_key: string;
    access_code: string;
    grade_level: number | null;
    class_count: string;
    joined_at: Date;
    attempts: string;
    completed_missions: string;
    avg_accuracy: number | null;
    last_active_at: Date | null;
  }>(
    viewer,
    `select p.id, p.display_name, p.avatar_key, p.access_code, p.grade_level,
            (select count(*) from class_members x where x.student_id = p.id) as class_count,
            cm.joined_at,
            (select count(*) from attempts a
              join missions m on m.id = a.mission_id
              where a.student_id = p.id and a.mode = 'mission' and a.completed_at is not null
                and m.grade_level = cl.grade_level and m.subject_slug = cl.subject_slug) as attempts,
            (select count(distinct a.mission_id) from attempts a
              join missions m on m.id = a.mission_id
              where a.student_id = p.id and a.mode = 'mission' and a.completed_at is not null
                and m.grade_level = cl.grade_level and m.subject_slug = cl.subject_slug) as completed_missions,
            (select round(avg(a.score))::int from attempts a
              join missions m on m.id = a.mission_id
              where a.student_id = p.id and a.mode = 'mission' and a.completed_at is not null
                and m.grade_level = cl.grade_level and m.subject_slug = cl.subject_slug) as avg_accuracy,
            (select max(a.completed_at) from attempts a
              join missions m on m.id = a.mission_id
              where a.student_id = p.id and a.mode = 'mission' and a.completed_at is not null
                and m.grade_level = cl.grade_level and m.subject_slug = cl.subject_slug) as last_active_at
       from class_members cm
       join classes cl on cl.id = cm.class_id
       join profiles p on p.id = cm.student_id
      where cm.class_id = $1
      order by p.display_name asc`,
    [classId],
  );

  const missionStats = await rows<{
    id: string;
    slug: string;
    title: string;
    order_index: number;
    grade_level: number | null;
    subject_label: string | null;
    topic_label: string | null;
    completions: string;
    avg_score: number | null;
  }>(
    viewer,
    `select m.id, m.slug, m.title, m.order_index, m.grade_level, s.label as subject_label,
            t.label as topic_label,
            count(a.id) filter (where a.completed_at is not null) as completions,
            round(avg(a.score) filter (where a.completed_at is not null))::int as avg_score
       from missions m
       join classes cl on cl.id = $1
       left join subjects s on s.slug = m.subject_slug
       left join mission_topics t on t.slug = m.topic_slug
       left join attempts a on a.mission_id = m.id
        and a.student_id in (select student_id from class_members where class_id = $1)
        and a.mode = 'mission'
      where m.archived_at is null and m.is_published
        and m.grade_level = cl.grade_level
        and m.subject_slug = cl.subject_slug
      group by m.id, m.grade_level, s.label, t.label
      order by m.grade_level asc nulls last, m.order_index asc`,
    [classId],
  );

  const hardest = await rows<{ id: string; prompt: string; answers: string; wrong: string }>(
    viewer,
    `select q.id, q.prompt, count(*)::text as answers,
            count(*) filter (where not aa.is_correct)::text as wrong
       from attempt_answers aa
       join questions q on q.id = aa.question_id
       join attempts a on a.id = aa.attempt_id
       join missions m on m.id = a.mission_id
       join classes cl on cl.id = $1
      where a.mode = 'mission'
        and a.student_id in (select student_id from class_members where class_id = $1)
        and m.grade_level = cl.grade_level and m.subject_slug = cl.subject_slug
      group by q.id
      having count(*) >= 2
      order by (count(*) filter (where not aa.is_correct))::numeric / count(*) desc
      limit 5`,
    [classId],
  );

  return {
    classroom,
    students: roster.map<RosterStudent>((row) => ({
      id: row.id,
      displayName: row.display_name,
      avatarKey: row.avatar_key,
      accessCode: row.access_code,
      gradeLevel: row.grade_level,
      classCount: Number(row.class_count),
      joinedAt: new Date(row.joined_at),
      attempts: Number(row.attempts),
      completedMissions: Number(row.completed_missions),
      avgAccuracy: row.avg_accuracy,
      lastActiveAt: row.last_active_at ? new Date(row.last_active_at) : null,
    })),
    missionStats: missionStats.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      orderIndex: row.order_index,
      gradeLevel: row.grade_level,
      subjectLabel: row.subject_label,
      topicLabel: row.topic_label,
      completions: Number(row.completions),
      avgScore: row.avg_score,
    })),
    hardestQuestions: hardest.map((row) => ({
      id: row.id,
      prompt: row.prompt,
      answers: Number(row.answers),
      wrong: Number(row.wrong),
      wrongRate: Number(row.answers) ? Math.round((Number(row.wrong) / Number(row.answers)) * 100) : 0,
    })),
  };
}

export async function resetStudentPin(viewer: Viewer, studentId: string, pin: string): Promise<void> {
  const pinHash = await hashSecret(pin);
  const result = await one<{ app_teacher_reset_student_pin: null }>(
    viewer,
    "select public.app_teacher_reset_student_pin($1, $2)",
    [studentId, pinHash],
  );
  if (!result) throw new TeacherError("PIN siswa gagal diatur ulang.");
}

export async function removeClassMember(viewer: Viewer, classId: string, studentId: string): Promise<boolean> {
  const deleted = await one<{ id: string }>(
    viewer,
    "delete from class_members where class_id = $1 and student_id = $2 returning id",
    [classId, studentId],
  );
  return Boolean(deleted);
}

export async function getTeacherDashboard(viewer: Viewer, teacherId: string) {
  const summary = await one<{
    students: string;
    completions: string;
    avg_accuracy: number | null;
    active_this_week: string;
  }>(
    viewer,
    `select
       (select count(distinct cm.student_id) from class_members cm
          join classes c on c.id = cm.class_id where c.teacher_id = $1 and c.archived_at is null) as students,
       (select count(*) from attempts a
          where a.completed_at is not null and a.mode = 'mission'
            and a.student_id in (select cm.student_id from class_members cm
                                 join classes c on c.id = cm.class_id where c.teacher_id = $1 and c.archived_at is null)) as completions,
       (select round(avg(a.score))::int from attempts a
          where a.completed_at is not null and a.mode = 'mission'
            and a.student_id in (select cm.student_id from class_members cm
                                 join classes c on c.id = cm.class_id where c.teacher_id = $1 and c.archived_at is null)) as avg_accuracy,
       (select count(distinct a.student_id) from attempts a
          where a.completed_at > now() - interval '7 days'
            and a.student_id in (select cm.student_id from class_members cm
                                 join classes c on c.id = cm.class_id where c.teacher_id = $1 and c.archived_at is null)) as active_this_week`,
    [teacherId],
  );

  const recent = await rows<{
    id: string;
    display_name: string;
    avatar_key: string;
    title: string;
    slug: string;
    score: number;
    completed_at: Date;
    class_name: string;
  }>(
    viewer,
    `select a.id, p.display_name, p.avatar_key, m.title, m.slug, a.score, a.completed_at, c.name as class_name
       from attempts a
       join profiles p on p.id = a.student_id
       join missions m on m.id = a.mission_id
       join lateral (
         select c.name
           from class_members cm
           join classes c on c.id = cm.class_id
          where cm.student_id = a.student_id
            and c.teacher_id = $1 and c.archived_at is null
          order by c.name asc
          limit 1
       ) c on true
      where a.completed_at is not null and a.mode = 'mission'
      order by a.completed_at desc
      limit 8`,
    [teacherId],
  );

  const hardest = await rows<{ id: string; prompt: string; title: string; answers: string; wrong: string }>(
    viewer,
    `select q.id, q.prompt, m.title, count(*)::text as answers,
            count(*) filter (where not aa.is_correct)::text as wrong
       from attempt_answers aa
       join questions q on q.id = aa.question_id
       join missions m on m.id = q.mission_id
       join attempts a on a.id = aa.attempt_id
      where a.mode = 'mission'
        and a.student_id in (select cm.student_id from class_members cm
                             join classes c on c.id = cm.class_id where c.teacher_id = $1 and c.archived_at is null)
      group by q.id, m.title
      order by (count(*) filter (where not aa.is_correct))::numeric / count(*) desc
      limit 5`,
    [teacherId],
  );

  const subjectProgress = await rows<{
    grade_level: number;
    subject_slug: string;
    subject_label: string;
    enrolled: string;
    attempted: string;
    completions: string;
    avg_accuracy: number | null;
  }>(
    viewer,
    `with teacher_students as (
       select distinct c.grade_level, c.subject_slug, cm.student_id
         from class_members cm
         join classes c on c.id = cm.class_id
        where c.teacher_id = $1 and c.archived_at is null
          and c.grade_level is not null and c.subject_slug is not null
     )
     select ts.grade_level, ts.subject_slug, s.label as subject_label,
            count(distinct ts.student_id)::text as enrolled,
            count(distinct a.student_id)::text as attempted,
            count(a.id)::text as completions,
            round(avg(a.score))::int as avg_accuracy
       from teacher_students ts
       join missions m on m.grade_level = ts.grade_level and m.subject_slug = ts.subject_slug
       join subjects s on s.slug = ts.subject_slug
       left join attempts a on a.student_id = ts.student_id and a.mission_id = m.id
          and a.mode = 'mission' and a.completed_at is not null
      group by ts.grade_level, ts.subject_slug, s.label, s.order_index
      order by ts.grade_level asc, s.order_index asc`,
    [teacherId],
  );

  const classes = await listTeacherClasses(viewer, teacherId);
  const missions = await listTeacherMissions(viewer, teacherId);

  return {
    summary: {
      students: Number(summary?.students ?? 0),
      completions: Number(summary?.completions ?? 0),
      avgAccuracy: summary?.avg_accuracy ?? null,
      activeThisWeek: Number(summary?.active_this_week ?? 0),
    },
    recent: recent.map((row) => ({
      id: row.id,
      studentName: row.display_name,
      avatarKey: row.avatar_key,
      missionTitle: row.title,
      slug: row.slug,
      score: row.score,
      completedAt: new Date(row.completed_at),
      className: row.class_name,
    })),
    hardest: hardest.map((row) => ({
      id: row.id,
      prompt: row.prompt,
      missionTitle: row.title,
      answers: Number(row.answers),
      wrong: Number(row.wrong),
      wrongRate: Number(row.answers) ? Math.round((Number(row.wrong) / Number(row.answers)) * 100) : 0,
    })),
    subjectProgress: subjectProgress.map((row) => ({
      gradeLevel: row.grade_level,
      subjectSlug: row.subject_slug,
      subjectLabel: row.subject_label,
      enrolled: Number(row.enrolled),
      attempted: Number(row.attempted),
      completions: Number(row.completions),
      avgAccuracy: row.avg_accuracy,
    })),
    classes,
    missions,
  };
}

export async function getStudentReport(viewer: Viewer, studentId: string) {
  const student = await one<{ id: string; display_name: string; avatar_key: string; access_code: string; created_at: Date }>(
    viewer,
    "select id, display_name, avatar_key, access_code, created_at from profiles where id = $1 and role = 'student'",
    [studentId],
  );
  if (!student) return null;

  const classroom = await one<{ id: string; name: string; join_code: string }>(
    viewer,
    "select c.id, c.name, c.join_code from classes c join class_members cm on cm.class_id = c.id where cm.student_id = $1 limit 1",
    [studentId],
  );

  const attempts = await rows<{
    id: string;
    title: string;
    slug: string;
    score: number;
    correct_count: number;
    total_questions: number;
    xp_earned: number;
    completed_at: Date | null;
    started_at: Date;
    mode: "mission" | "practice";
  }>(
    viewer,
    `select a.id, m.title, m.slug, a.score, a.correct_count, a.total_questions, a.xp_earned,
            a.completed_at, a.started_at, a.mode
       from attempts a join missions m on m.id = a.mission_id
      where a.student_id = $1
      order by a.started_at desc`,
    [studentId],
  );

  const achievements = await rows<{ achievement_key: string; earned_at: Date }>(
    viewer,
    "select achievement_key, earned_at from user_achievements where student_id = $1 order by earned_at asc",
    [studentId],
  );

  const weakTopics = await rows<{ prompt: string; title: string; wrong: string; total: string }>(
    viewer,
    `select q.prompt, m.title, count(*) filter (where not aa.is_correct)::text as wrong, count(*)::text as total
       from attempt_answers aa
       join questions q on q.id = aa.question_id
       join missions m on m.id = q.mission_id
       join attempts a on a.id = aa.attempt_id
      where a.student_id = $1 and a.mode = 'mission'
      group by q.id, m.title
      having count(*) filter (where not aa.is_correct) > 0
      order by count(*) filter (where not aa.is_correct) desc, count(*) desc
      limit 6`,
    [studentId],
  );

  const totals = await one<{ xp: string }>(
    viewer,
    "select coalesce(sum(xp_earned),0)::text as xp from attempts where student_id = $1 and completed_at is not null",
    [studentId],
  );

  return {
    student: {
      id: student.id,
      displayName: student.display_name,
      avatarKey: student.avatar_key,
      accessCode: student.access_code,
      createdAt: new Date(student.created_at),
    },
    classroom: classroom ?? null,
    attempts: attempts.map((row) => ({
      id: row.id,
      missionTitle: row.title,
      slug: row.slug,
      score: row.score,
      correctCount: row.correct_count,
      totalQuestions: row.total_questions,
      xpEarned: row.xp_earned,
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      startedAt: new Date(row.started_at),
      mode: row.mode,
    })),
    achievements: achievements.map((row) => ({ key: row.achievement_key, earnedAt: new Date(row.earned_at) })),
    weakTopics: weakTopics.map((row) => ({
      prompt: row.prompt,
      missionTitle: row.title,
      wrong: Number(row.wrong),
      total: Number(row.total),
    })),
    xp: Number(totals?.xp ?? 0),
    topics: await getTopicMastery(viewer, studentId),
  };
}

/* ------------------------------- Konten guru ------------------------------ */

export type MissionStatusFilter = "active" | "draft" | "published" | "archived";

export type MissionAdminItem = MissionRow & {
  questionCount: number;
  validQuestionCount: number;
  subjectLabel: string | null;
  topicLabel: string | null;
  assignedClasses: { id: string; name: string; gradeLevel: number | null }[];
  publishIssues: string[];
  attemptCount: number;
  /** Boleh dihapus permanen: belum pernah dikerjakan. */
  deletable: boolean;
};

export type MissionFilter = {
  gradeLevel?: number | null;
  subject?: string | null;
  uncategorized?: boolean;
  status?: MissionStatusFilter;
};

/** Metadata misi yang wajib ada sebelum misi boleh terbit. */
export function curriculumIssues(
  mission: Pick<MissionRow, "grade_level" | "subject_slug" | "topic_slug">,
): string[] {
  const issues: string[] = [];
  if (mission.grade_level === null) issues.push("Tingkat kelas misi belum dipilih.");
  if (!mission.subject_slug) issues.push("Mata pelajaran misi belum dipilih.");
  if (!mission.topic_slug) issues.push("Topik/materi misi belum dipilih.");
  return issues;
}

/**
 * Setiap slot harus punya minimal satu soal yang valid. Varian boleh rusak,
 * asalkan soal utamanya masih bisa dipakai; slot tanpa soal valid memblokir terbit.
 */
export function slotIssues(questions: Pick<QuestionRow, "id" | "slot_index" | "question_type" | "options" | "correct_answer" | "prompt" | "explanation">[]): string[] {
  const slots = new Map<number, boolean>();
  for (const question of questions) {
    const valid = questionIssues(question).length === 0;
    slots.set(question.slot_index, (slots.get(question.slot_index) ?? false) || valid);
  }
  const broken = [...slots.entries()].filter(([, valid]) => !valid).map(([slot]) => slot);
  return broken.length === 0 ? [] : [`Slot ${broken.sort((a, b) => a - b).join(", ")} belum punya soal yang valid.`];
}

export function questionIssues(question: Pick<QuestionRow, "question_type" | "options" | "correct_answer" | "prompt" | "explanation">): string[] {
  const issues: string[] = [];
  if (question.prompt.trim().length < 5) issues.push("Pertanyaan terlalu pendek.");
  if (question.explanation.trim().length < 5) issues.push("Penjelasan belum diisi.");
  if (question.question_type === "multiple_choice") {
    const options = (question.options ?? []).map((option) => option.trim()).filter(Boolean);
    if (options.length < 2) issues.push("Pilihan jawaban kurang dari 2.");
    const unique = new Set(options.map((option) => option.toLocaleLowerCase("id-ID")));
    if (unique.size !== options.length) issues.push("Ada pilihan jawaban yang sama.");
    if (!options.some((option) => option.toLocaleLowerCase("id-ID") === question.correct_answer.trim().toLocaleLowerCase("id-ID"))) {
      issues.push("Jawaban benar tidak ada di daftar pilihan.");
    }
  } else if (parseNumericAnswer(question.correct_answer) === null) {
    issues.push("Jawaban angka tidak valid.");
  }
  return issues;
}

export async function listTeacherMissions(
  viewer: Viewer,
  teacherId: string,
  filter: MissionFilter = {},
): Promise<MissionAdminItem[]> {
  const status: MissionStatusFilter = filter.status ?? "active";
  const missions = await rows<
    MissionRow & {
      question_count: string;
      subject_label: string | null;
      topic_label: string | null;
      attempt_count: string;
    }
  >(
    viewer,
    `select m.*,
            (select count(distinct q.slot_index) from questions q
               where q.mission_id = m.id and q.archived_at is null) as question_count,
            s.label as subject_label,
            t.label as topic_label,
            public.app_mission_attempt_count(m.id) as attempt_count
       from missions m
       left join subjects s on s.slug = m.subject_slug
       left join mission_topics t on t.slug = m.topic_slug
      where m.author_id = $1
        and (case when $5 = 'archived' then m.archived_at is not null else m.archived_at is null end)
        and ($5 <> 'draft' or not m.is_published)
        and ($5 <> 'published' or m.is_published)
        and ($2::int is null or m.grade_level = $2)
        and ($3::text is null or m.subject_slug = $3)
        and ($4::boolean is not true or m.grade_level is null)
      order by m.grade_level asc nulls last, m.subject_slug asc nulls last, m.order_index asc`,
    [teacherId, filter.gradeLevel ?? null, filter.subject ?? null, filter.uncategorized ?? false, status],
  );

  const questions = await rows<QuestionRow>(
    viewer,
    "select * from questions where archived_at is null",
  );

  const assignments = await rows<{ mission_id: string; id: string; name: string; grade_level: number | null }>(
    viewer,
    `select mc.mission_id, c.id, c.name, c.grade_level
       from mission_classes mc join classes c on c.id = mc.class_id
      where c.teacher_id = $1
      order by c.name asc`,
    [teacherId],
  );

  return missions.map((mission) => {
    const missionQuestions = questions.filter((question) => question.mission_id === mission.id);
    const issues = [...curriculumIssues(mission), ...missionQuestions.flatMap((question) => questionIssues(question))];
    if (missionQuestions.length === 0) issues.push("Misi belum memiliki soal.");
    issues.push(...slotIssues(missionQuestions));
    const assignedClasses = assignments
      .filter((row) => row.mission_id === mission.id)
      .map((row) => ({ id: row.id, name: row.name, gradeLevel: row.grade_level }));
    const attemptCount = Number(mission.attempt_count);

    return {
      ...mission,
      questionCount: Number(mission.question_count),
      validQuestionCount: missionQuestions.filter((question) => questionIssues(question).length === 0).length,
      subjectLabel: mission.subject_label,
      topicLabel: mission.topic_label,
      assignedClasses,
      publishIssues: [...new Set(issues)],
      attemptCount,
      deletable: attemptCount === 0,
    };
  });
}

export type CurriculumOptions = {
  subjects: { slug: string; label: string; topics: { slug: string; label: string }[] }[];
};

/** Pilihan tingkat/mapel/topik untuk formulir guru (dari tabel referensi). */
export async function getCurriculumOptions(viewer: Viewer): Promise<CurriculumOptions> {
  const subjects = await rows<{ slug: string; label: string }>(
    viewer,
    "select slug, label from subjects order by order_index asc, label asc",
  );
  const topics = await rows<{ slug: string; subject_slug: string; label: string }>(
    viewer,
    "select slug, subject_slug, label from mission_topics order by order_index asc, label asc",
  );

  return {
    subjects: subjects.map((subject) => ({
      slug: subject.slug,
      label: subject.label,
      topics: topics
        .filter((topic) => topic.subject_slug === subject.slug)
        .map((topic) => ({ slug: topic.slug, label: topic.label })),
    })),
  };
}

export async function getMissionForEdit(viewer: Viewer, missionId: string, teacherId: string) {
  const mission = await one<MissionRow>(
    viewer,
    "select * from missions where id = $1 and archived_at is null and author_id = $2",
    [missionId, teacherId],
  );
  if (!mission) return null;

  const questions = await rows<QuestionRow>(
    viewer,
    "select * from questions where mission_id = $1 and archived_at is null order by slot_index asc, variant_index asc",
    [missionId],
  );

  const attempts = await one<{ total: string; avg_score: number | null }>(
    viewer,
    `select count(*)::text as total, round(avg(score))::int as avg_score
       from attempts where mission_id = $1 and completed_at is not null and mode = 'mission'`,
    [missionId],
  );

  const classes = await rows<{ id: string; name: string; grade_level: number | null }>(
    viewer,
    `select id, name, grade_level from classes
      where teacher_id = $1 and archived_at is null
      order by grade_level asc nulls last, name asc`,
    [teacherId],
  );

  const assigned = await rows<{ class_id: string }>(
    viewer,
    `select mc.class_id from mission_classes mc
       join classes c on c.id = mc.class_id
      where mc.mission_id = $1 and c.teacher_id = $2`,
    [missionId, teacherId],
  );

  return {
    mission,
    questions: questions.map((question) => ({ ...question, issues: questionIssues(question) })),
    slotCount: new Set(questions.map((question) => question.slot_index)).size,
    stats: { attempts: Number(attempts?.total ?? 0), avgScore: attempts?.avg_score ?? null },
    options: await getCurriculumOptions(viewer),
    classes: classes.map((row) => ({ id: row.id, name: row.name, gradeLevel: row.grade_level })),
    assignedClassIds: assigned.map((row) => row.class_id),
    publishIssues: (() => {
      const issues = [...curriculumIssues(mission), ...questions.flatMap((question) => questionIssues(question))];
      if (questions.length === 0) issues.push("Misi belum memiliki soal.");
      issues.push(...slotIssues(questions));
      return [...new Set(issues)];
    })(),
  };
}

function missionRecord(input: MissionInput) {
  return {
    title: input.title,
    slug: input.slug,
    description: input.description,
    story: input.story,
    learningObjectives: input.learningObjectives.filter((objective) => objective.trim().length > 0),
    orderIndex: input.orderIndex,
    audience: input.audience,
    gradeLevel: input.gradeLevel,
    subject: input.subject,
    topic: input.topic,
  };
}

export async function createMission(viewer: Viewer, teacherId: string, input: MissionInput) {
  const record = missionRecord(input);
  try {
    const mission = await one<MissionRow>(
      viewer,
      `insert into missions
         (slug, title, description, story, learning_objectives, order_index, is_published, author_id,
          grade_level, subject_slug, topic_slug, audience)
       values ($1, $2, $3, $4, $5, $6, false, $7, $8, $9, $10, $11)
       returning *`,
      [
        record.slug,
        record.title,
        record.description,
        record.story,
        record.learningObjectives,
        record.orderIndex,
        teacherId,
        record.gradeLevel,
        record.subject,
        record.topic,
        record.audience,
      ],
    );
    if (!mission) throw new TeacherError("Misi gagal dibuat.");
    return mission;
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new TeacherError("Slug sudah dipakai misi lain. Gunakan slug berbeda.");
    }
    throw error;
  }
}

export async function updateMission(viewer: Viewer, missionId: string, input: MissionInput) {
  const record = missionRecord(input);
  try {
    return await withViewer(viewer, async (client) => {
      const updated = await client.query<MissionRow>(
        `update missions
            set slug = $2, title = $3, description = $4, story = $5, learning_objectives = $6, order_index = $7,
                grade_level = $8, subject_slug = $9, topic_slug = $10, audience = $11
          where id = $1 and archived_at is null
          returning *`,
        [
          missionId,
          record.slug,
          record.title,
          record.description,
          record.story,
          record.learningObjectives,
          record.orderIndex,
          record.gradeLevel,
          record.subject,
          record.topic,
          record.audience,
        ],
      );
      const mission = updated.rows[0];
      if (!mission) throw new TeacherError("Misi tidak ditemukan atau bukan milik Anda.");

      // Bila tingkat kelas berubah, penugasan ke kelas tingkat lain otomatis dilepas
      // agar tidak ada materi lintas tingkat yang tetap terpasang.
      await client.query(
        `delete from mission_classes mc
          using classes c
          where mc.class_id = c.id and mc.mission_id = $1 and c.grade_level is distinct from $2`,
        [missionId, record.gradeLevel],
      );

      return mission;
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new TeacherError("Slug sudah dipakai misi lain. Gunakan slug berbeda.");
    }
    throw error;
  }
}

/**
 * Menugaskan satu misi ke satu atau beberapa kelas belajar tanpa menyalin misi.
 * Tingkat kelas misi dan kelas penerima wajib sama (juga dijaga trigger database).
 */
export async function setMissionClasses(
  viewer: Viewer,
  teacherId: string,
  missionId: string,
  classIds: string[],
): Promise<{ assigned: number }> {
  if (!viewer || viewer.userId !== teacherId) throw new TeacherError("Sesi tidak cocok.");

  return withViewer(viewer, async (client) => {
    const missionResult = await client.query<{
      id: string;
      grade_level: number | null;
      archived_at: Date | null;
      audience: "public" | "class_only";
      is_published: boolean;
    }>(
      "select id, grade_level, archived_at, audience, is_published from missions where id = $1 and author_id = $2 for update",
      [missionId, teacherId],
    );
    const mission = missionResult.rows[0];
    if (!mission) throw new TeacherError("Misi tidak ditemukan atau bukan milik Anda.");
    if (mission.archived_at) {
      throw new TeacherError("Misi ini sudah diarsipkan. Pulihkan dulu sebelum menugaskan ke kelas.");
    }
    if (mission.grade_level === null) {
      throw new TeacherError("Pilih tingkat kelas misi sebelum menugaskan ke kelas belajar.");
    }

    const unique = [...new Set(classIds.filter((id) => id.trim().length > 0))];

    // Misi khusus kelas yang sudah terbit tidak boleh kehilangan seluruh penugasannya:
    // tanpa penugasan, misi itu tidak terlihat oleh siapa pun.
    if (mission.audience === "class_only" && mission.is_published && unique.length === 0) {
      throw new TeacherError(
        "Misi ini hanya untuk kelas dan sudah terbit. Sisakan minimal satu kelas, atau ubah menjadi misi belajar mandiri.",
      );
    }

    if (unique.length > 0) {
      const classResult = await client.query<{ id: string; name: string; grade_level: number | null }>(
        `select id, name, grade_level from classes
          where id = any($1::uuid[]) and teacher_id = $2 and archived_at is null`,
        [unique, teacherId],
      );
      if (classResult.rows.length !== unique.length) {
        throw new TeacherError("Ada kelas yang bukan milik Anda atau sudah diarsipkan.");
      }
      const mismatch = classResult.rows.find((row) => row.grade_level !== mission.grade_level);
      if (mismatch) {
        throw new TeacherError(
          `${mismatch.name} bukan kelas tingkat ${mission.grade_level}, jadi misi ini tidak bisa ditugaskan di sana.`,
        );
      }
    }

    await client.query(
      "delete from mission_classes where mission_id = $1 and not (class_id = any($2::uuid[]))",
      [missionId, unique],
    );
    if (unique.length > 0) {
      await client.query(
        `insert into mission_classes (mission_id, class_id, assigned_by)
         select $1, unnest($2::uuid[]), $3
         on conflict (mission_id, class_id) do nothing`,
        [missionId, unique, teacherId],
      );
    }

    return { assigned: unique.length };
  });
}

export async function setMissionPublished(viewer: Viewer, missionId: string, published: boolean) {
  if (published) {
    const mission = await one<MissionRow>(
      viewer,
      "select * from missions where id = $1 and archived_at is null",
      [missionId],
    );
    if (!mission) throw new TeacherError("Misi tidak ditemukan.");

    const curriculum = curriculumIssues(mission);
    if (curriculum.length > 0) {
      throw new TeacherError(`${curriculum[0]} Lengkapi metadata misi sebelum menerbitkan.`);
    }

    const questions = await rows<QuestionRow>(
      viewer,
      "select * from questions where mission_id = $1 and archived_at is null",
      [missionId],
    );
    if (questions.length === 0) throw new TeacherError("Misi belum punya soal, belum bisa diterbitkan.");
    const brokenSlots = slotIssues(questions);
    if (brokenSlots.length > 0) {
      throw new TeacherError(`${brokenSlots[0]} Perbaiki dulu sebelum menerbitkan.`);
    }
  }

  const mission = await one<MissionRow>(
    viewer,
    "update missions set is_published = $2 where id = $1 and archived_at is null returning *",
    [missionId, published],
  );
  if (!mission) throw new TeacherError("Misi tidak ditemukan.");
  return mission;
}

export async function archiveMission(viewer: Viewer, missionId: string): Promise<void> {
  const mission = await one<{ id: string }>(
    viewer,
    "update missions set archived_at = now(), is_published = false where id = $1 and archived_at is null returning id",
    [missionId],
  );
  if (!mission) throw new TeacherError("Misi tidak ditemukan atau sudah diarsipkan.");
}

export async function restoreMission(viewer: Viewer, missionId: string): Promise<void> {
  const mission = await one<{ id: string }>(
    viewer,
    "update missions set archived_at = null where id = $1 and archived_at is not null returning id",
    [missionId],
  );
  if (!mission) throw new TeacherError("Misi tidak ditemukan atau belum diarsipkan.");
}

/**
 * Hapus permanen hanya untuk misi arsip yang belum pernah dikerjakan. Trigger
 * `missions_delete_guard` menjadi jaring pengaman
 * terakhir bila ada jalur lain yang mencoba menghapus.
 */
export async function deleteMission(viewer: Viewer, missionId: string): Promise<void> {
  const mission = await one<{ id: string; title: string }>(
    viewer,
    "select id, title from missions where id = $1 and archived_at is not null",
    [missionId],
  );
  if (!mission) throw new TeacherError("Arsipkan misi dulu sebelum menghapus permanen.");

  const attempts = await one<{ total: string }>(
    viewer,
    "select public.app_mission_attempt_count($1)::text as total",
    [missionId],
  );
  if (Number(attempts?.total ?? "0") > 0) {
    throw new TeacherError(
      `Misi ini punya ${attempts?.total} riwayat pengerjaan siswa. Riwayat belajar tidak boleh hilang, jadi misi hanya bisa diarsipkan.`,
    );
  }

  try {
    const deleted = await one<{ id: string }>(viewer, "delete from missions where id = $1 returning id", [missionId]);
    if (!deleted) throw new TeacherError("Misi tidak ditemukan.");
  } catch (error) {
    if (error instanceof TeacherError) throw error;
    const message = error instanceof Error ? error.message : "";
    if (message.includes("riwayat pengerjaan") || message.includes("masih ditugaskan")) {
      throw new TeacherError(message);
    }
    throw new TeacherError("Misi gagal dihapus.");
  }
}

function questionRecord(input: QuestionFormInput) {
  const options =
    input.questionType === "multiple_choice" ? input.options.map((option) => option.trim()).filter(Boolean) : null;
  return {
    questionType: input.questionType,
    prompt: input.prompt,
    options,
    correctAnswer: input.correctAnswer.trim(),
    explanation: input.explanation,
    hint: input.hint,
    difficulty: input.difficulty,
    orderIndex: input.orderIndex,
    topic: input.topic,
    slotIndex: input.slotIndex ?? input.orderIndex,
  };
}

export async function createQuestion(viewer: Viewer, missionId: string, rawInput: unknown) {
  const parsed = questionSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new TeacherError(parsed.error.issues[0]?.message ?? "Data soal belum valid.");
  }
  const record = questionRecord(parsed.data);
  // Soal baru untuk slot yang sudah terisi otomatis menjadi varian berikutnya.
  const variantRow = await one<{ next: string }>(
    viewer,
    "select coalesce(max(variant_index) + 1, 0)::text as next from questions where mission_id = $1 and slot_index = $2 and archived_at is null",
    [missionId, record.slotIndex],
  );
  const question = await one<QuestionRow>(
    viewer,
    `insert into questions
       (mission_id, question_type, prompt, options, correct_answer, explanation, hint, difficulty,
        order_index, topic, slot_index, variant_index)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     returning *`,
    [
      missionId,
      record.questionType,
      record.prompt,
      record.options === null ? null : JSON.stringify(record.options),
      record.correctAnswer,
      record.explanation,
      record.hint,
      record.difficulty,
      record.orderIndex,
      record.topic,
      record.slotIndex,
      Number(variantRow?.next ?? 0),
    ],
  );
  if (!question) throw new TeacherError("Soal gagal disimpan.");
  await touchMission(viewer, missionId);
  return question;
}

export async function updateQuestion(viewer: Viewer, questionId: string, rawInput: unknown) {
  const parsed = questionSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new TeacherError(parsed.error.issues[0]?.message ?? "Data soal belum valid.");
  }
  const record = questionRecord(parsed.data);
  const question = await one<QuestionRow>(
    viewer,
    `update questions
        set question_type = $2, prompt = $3, options = $4, correct_answer = $5,
            explanation = $6, hint = $7, difficulty = $8, order_index = $9, topic = $10, slot_index = $11
      where id = $1 and archived_at is null
      returning *`,
    [
      questionId,
      record.questionType,
      record.prompt,
      record.options === null ? null : JSON.stringify(record.options),
      record.correctAnswer,
      record.explanation,
      record.hint,
      record.difficulty,
      record.orderIndex,
      record.topic,
      record.slotIndex,
    ],
  );
  if (!question) throw new TeacherError("Soal tidak ditemukan.");
  await touchMission(viewer, question.mission_id);
  return question;
}

/** Menandai misi berubah supaya kolom "diperbarui" di daftar misi akurat. */
async function touchMission(viewer: Viewer, missionId: string): Promise<void> {
  await one(viewer, "update missions set updated_at = now() where id = $1 returning id", [missionId]);
}

/** Soft delete: riwayat percobaan lama tetap utuh. */
export async function archiveQuestion(viewer: Viewer, questionId: string): Promise<void> {
  const question = await one<{ id: string; mission_id: string }>(
    viewer,
    "update questions set archived_at = now() where id = $1 and archived_at is null returning id, mission_id",
    [questionId],
  );
  if (!question) throw new TeacherError("Soal tidak ditemukan.");
  await touchMission(viewer, question.mission_id);
}

export async function regenerateJoinCode(viewer: Viewer, classId: string): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = randomCode(6);
    try {
      const updated = await one<{ join_code: string }>(
        viewer,
        "update classes set join_code = $2 where id = $1 returning join_code",
        [classId, code],
      );
      if (updated) return updated.join_code;
    } catch (error) {
      if ((error as { code?: string }).code !== "23505") throw error;
    }
  }
  throw new TeacherError("Gagal membuat kode kelas baru.");
}

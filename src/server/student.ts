import { isChoiceAnswerCorrect, isNumericAnswerCorrect } from "@/lib/normalize";
import { computeScore, computeXp, XP_MISSION_BONUS, XP_PER_CORRECT } from "@/lib/scoring";
import { evaluateAchievements, type AchievementKey } from "@/lib/achievements";
import { one, rows, withViewer, type Viewer } from "@/lib/db";
import { masteryLevel, TOPICS, topicOrder, type MasteryLevel } from "@/lib/topics";
import type { AttemptRow, MissionCard, MissionRow, PlayQuestion, AttemptResult } from "./types";

export type MissionProgressRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  order_index: number;
  is_published: boolean;
  audience: "public" | "class_only";
  grade_level: number | null;
  subject_slug: string | null;
  subject_label: string | null;
  topic_label: string | null;
  question_count: string;
  attempt_count: string;
  best_score: number | null;
  last_score: number | null;
  open_attempt_id: string | null;
  completed_any: boolean;
};

// Kelas aktif membatasi misi ke mata pelajaran dan tingkat kelas yang diikuti.
const MISSION_PROGRESS_SQL = `
  select m.id, m.slug, m.title, m.description, m.order_index, m.is_published, m.audience,
         m.grade_level, m.subject_slug, s.label as subject_label, t.label as topic_label,
         (select count(distinct q.slot_index) from questions q
            where q.mission_id = m.id and q.archived_at is null) as question_count,
         (select count(*) from attempts a
            where a.mission_id = m.id and a.student_id = $1
              and a.mode = 'mission' and a.completed_at is not null) as attempt_count,
         (select max(a.score) from attempts a
            where a.mission_id = m.id and a.student_id = $1
              and a.mode = 'mission' and a.completed_at is not null) as best_score,
         (select a.score from attempts a
            where a.mission_id = m.id and a.student_id = $1
              and a.mode = 'mission' and a.completed_at is not null
            order by a.completed_at desc limit 1) as last_score,
         (select a.id from attempts a
            where a.mission_id = m.id and a.student_id = $1
              and a.mode = 'mission' and a.completed_at is null limit 1) as open_attempt_id
  from missions m
  left join subjects s on s.slug = m.subject_slug
  left join mission_topics t on t.slug = m.topic_slug
  where m.archived_at is null and m.is_published
    and public.app_mission_available(m.id)
  order by m.grade_level asc nulls last, m.order_index asc
`;

function toCards(rowsIn: MissionProgressRow[]): MissionCard[] {
  // Urutan pembukaan dihitung per (tingkat kelas, mata pelajaran), bukan lintas semua misi:
  // misi Kelas 5 tidak boleh terkunci karena misi Kelas 2 belum dikerjakan.
  const completedByGroup = new Set<string>();
  const firstOfGroupSeen = new Set<string>();

  return rowsIn.map((row) => {
    const group = `${row.grade_level ?? "-"}|${row.subject_label ?? "-"}`;
    const completed = Number(row.attempt_count) > 0;
    const unlocked = !firstOfGroupSeen.has(group) || completedByGroup.has(group);
    firstOfGroupSeen.add(group);
    if (completed) completedByGroup.add(group);

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      orderIndex: row.order_index,
      gradeLevel: row.grade_level,
      subjectSlug: row.subject_slug,
      subjectLabel: row.subject_label,
      topicLabel: row.topic_label,
      questionCount: Number(row.question_count),
      isPublished: row.is_published,
      audience: row.audience,
      unlocked,
      completed,
      bestScore: row.best_score,
      lastScore: row.last_score,
      attemptCount: Number(row.attempt_count),
      openAttemptId: row.open_attempt_id,
    };
  });
}

export async function listMissionCards(viewer: Viewer, studentId: string): Promise<MissionCard[]> {
  const data = await rows<MissionProgressRow>(viewer, MISSION_PROGRESS_SQL, [studentId]);
  return toCards(data);
}

export type StudentOverview = {
  xp: number;
  completedMissions: number;
  totalMissions: number;
  cards: MissionCard[];
  achievements: { key: string; earnedAt: Date }[];
  recent: { id: string; missionTitle: string; slug: string; score: number; completedAt: Date }[];
  continueCard: MissionCard | null;
  /** Tingkat kelas siswa (profil); null = belum dipilih. */
  gradeLevel: number | null;
  /** Jumlah kelas belajar yang diikuti (boleh nol untuk belajar mandiri). */
  classCount: number;
};

export async function getStudentOverview(viewer: Viewer, studentId: string): Promise<StudentOverview> {
  const cards = await listMissionCards(viewer, studentId);

  const totals = await one<{ xp: string }>(
    viewer,
    "select coalesce(sum(xp_earned), 0)::text as xp from attempts where student_id = $1 and completed_at is not null",
    [studentId],
  );

  const achievements = await rows<{ achievement_key: string; earned_at: Date }>(
    viewer,
    "select achievement_key, earned_at from user_achievements where student_id = $1 order by earned_at asc",
    [studentId],
  );

  const recent = await rows<{ id: string; title: string; slug: string; score: number; completed_at: Date }>(
    viewer,
    `select a.id, m.title, m.slug, a.score, a.completed_at
       from attempts a join missions m on m.id = a.mission_id
      where a.student_id = $1 and a.mode = 'mission' and a.completed_at is not null
      order by a.completed_at desc limit 3`,
    [studentId],
  );

  const profile = await one<{ grade_level: number | null; classes: string }>(
    viewer,
    `select p.grade_level,
            (select count(*)::text
               from class_members cm join classes c on c.id = cm.class_id
              where cm.student_id = p.id and c.archived_at is null) as classes
       from profiles p
      where p.id = $1`,
    [studentId],
  );

  const continueCard =
    cards.find((card) => card.openAttemptId) ??
    cards.find((card) => card.unlocked && !card.completed) ??
    cards.find((card) => card.unlocked && (card.lastScore ?? 100) < 100) ??
    cards[0] ??
    null;

  return {
    xp: Number(totals?.xp ?? 0),
    completedMissions: cards.filter((card) => card.completed).length,
    totalMissions: cards.length,
    cards,
    achievements: achievements.map((row) => ({ key: row.achievement_key, earnedAt: new Date(row.earned_at) })),
    recent: recent.map((row) => ({
      id: row.id,
      missionTitle: row.title,
      slug: row.slug,
      score: row.score,
      completedAt: new Date(row.completed_at),
    })),
    continueCard,
    gradeLevel: profile?.grade_level ?? null,
    classCount: Number(profile?.classes ?? 0),
  };
}

export type StudentClassTask = {
  slug: string;
  title: string;
  gradeLevel: number | null;
  completed: boolean;
};

export type StudentClass = {
  id: string;
  name: string;
  gradeLevel: number | null;
  subjectSlug: string | null;
  subjectLabel: string | null;
  teacherName: string;
  joinedAt: Date;
  tasks: StudentClassTask[];
};

export type StudentClassesView = {
  gradeLevel: number | null;
  classes: StudentClass[];
};

/** Tingkat kelas profil siswa (dipakai untuk belajar mandiri). */
export async function getStudentGrade(viewer: Viewer, studentId: string): Promise<number | null> {
  const row = await one<{ grade_level: number | null }>(
    viewer,
    "select grade_level from profiles where id = $1",
    [studentId],
  );
  return row?.grade_level ?? null;
}

/** Kelas belajar yang diikuti siswa beserta guru dan misi otomatis berdasarkan kurikulum kelas. */
export async function getStudentClasses(viewer: Viewer, studentId: string): Promise<StudentClassesView> {
  const classes = await rows<{
    id: string;
    name: string;
    grade_level: number | null;
    subject_slug: string | null;
    subject_label: string | null;
    teacher_name: string;
    joined_at: Date;
  }>(
    viewer,
    `select c.id, c.name, c.grade_level, c.subject_slug, s.label as subject_label,
            t.display_name as teacher_name, cm.joined_at
       from class_members cm
       join classes c on c.id = cm.class_id
       left join subjects s on s.slug = c.subject_slug
       join profiles t on t.id = c.teacher_id
      where cm.student_id = $1 and c.archived_at is null
      order by cm.joined_at asc`,
    [studentId],
  );

  const grade = await getStudentGrade(viewer, studentId);
  if (classes.length === 0) return { gradeLevel: grade, classes: [] };

  const tasks = await rows<{
    class_id: string;
    slug: string;
    title: string;
    grade_level: number | null;
    completed: boolean;
  }>(
    viewer,
    `select c.id as class_id, m.slug, m.title, m.grade_level,
            exists (
              select 1 from attempts a
               where a.student_id = $1 and a.mission_id = m.id
                 and a.mode = 'mission' and a.completed_at is not null
            ) as completed
       from classes c
       join missions m on m.grade_level = c.grade_level and m.subject_slug = c.subject_slug
      where c.id = any($2::uuid[])
        and m.is_published and m.archived_at is null
      order by m.order_index asc`,
    [studentId, classes.map((row) => row.id)],
  );

  return {
    gradeLevel: grade,
    classes: classes.map((row) => ({
      id: row.id,
      name: row.name,
      gradeLevel: row.grade_level,
      subjectSlug: row.subject_slug,
      subjectLabel: row.subject_label,
      teacherName: row.teacher_name,
      joinedAt: new Date(row.joined_at),
      tasks: tasks
        .filter((task) => task.class_id === row.id)
        .map((task) => ({
          slug: task.slug,
          title: task.title,
          gradeLevel: task.grade_level,
          completed: task.completed,
        })),
    })),
  };
}

/** Menyimpan tingkat kelas siswa sendiri. */
export async function setStudentGrade(viewer: Viewer, studentId: string, gradeLevel: number): Promise<void> {
  if (!Number.isInteger(gradeLevel) || gradeLevel < 1 || gradeLevel > 6) {
    throw new Error("Tingkat kelas harus 1-6.");
  }
  await rows(
    viewer,
    "update profiles set grade_level = $2 where id = $1 and role = 'student' returning id",
    [studentId, gradeLevel],
  );
}

export type JoinClassResult = {
  status: string;
  className: string | null;
  teacherName: string | null;
  gradeLevel: number | null;
};

/** Bergabung ke kelas belajar dengan kode undangan guru (tanpa membuat akun baru). */
export async function joinClassWithCode(viewer: Viewer, code: string): Promise<JoinClassResult> {
  const result = await one<{
    status: string;
    class_name: string | null;
    teacher_name: string | null;
    grade_level: number | null;
  }>(viewer, "select status, class_name, teacher_name, grade_level from public.app_join_class($1)", [code]);

  if (!result) throw new Error("Kelas gagal diproses. Coba lagi.");

  return {
    status: result.status,
    className: result.class_name,
    teacherName: result.teacher_name,
    gradeLevel: result.grade_level,
  };
}

/** Keluar dari kelas belajar (hanya keanggotaan sendiri; akun & progres tetap). */
export async function leaveClass(viewer: Viewer, studentId: string, classId: string): Promise<boolean> {
  const left = await rows<{ class_id: string }>(
    viewer,
    "delete from class_members where class_id = $1 and student_id = $2 returning class_id",
    [classId, studentId],
  );
  return left.length > 0;
}

export type MissionDetailView = {
  mission: MissionRow;
  card: MissionCard;
  subjectLabel: string | null;
  topicLabel: string | null;
  nextMission: { slug: string; title: string } | null;
  estimatedMinutes: number;
  rewardXp: number;
};

export async function getMissionDetail(viewer: Viewer, studentId: string, slug: string): Promise<MissionDetailView | null> {
  const mission = await one<MissionRow>(
    viewer,
    "select * from missions where slug = $1 and is_published and archived_at is null",
    [slug],
  );
  if (!mission) return null;

  const cards = await listMissionCards(viewer, studentId);
  const card = cards.find((item) => item.id === mission.id);
  if (!card) return null;

  const index = cards.findIndex((item) => item.id === mission.id);
  const next = cards.slice(index + 1).find(
    (item) => item.gradeLevel === card.gradeLevel && item.subjectSlug === card.subjectSlug,
  );

  return {
    mission,
    card,
    subjectLabel: card.subjectLabel,
    topicLabel: card.topicLabel,
    nextMission: next ? { slug: next.slug, title: next.title } : null,
    estimatedMinutes: Math.max(3, Math.round(card.questionCount * 1.5)),
    rewardXp: card.questionCount * XP_PER_CORRECT + XP_MISSION_BONUS,
  };
}

export type PlayState = {
  attemptId: string;
  mode: "mission" | "practice";
  mission: { id: string; slug: string; title: string; story: string; objectives: string[] };
  questions: PlayQuestion[];
  answeredIndexes: number[];
  startIndex: number;
  /** True bila semua soal sudah dijawab (mis. halaman di-refresh tepat setelah soal terakhir). */
  allAnswered: boolean;
};

/** Mengambil misi untuk dimainkan; hanya mengirim data yang aman ke klien. */
export type StartResult =
  | { ok: true; state: PlayState }
  | { ok: false; reason: "not_found" | "locked" | "empty" };

async function buildPlayState(
  viewer: Viewer,
  mission: MissionRow,
  attempt: AttemptRow,
): Promise<PlayState | null> {
  // Soal yang sudah diarsipkan tetap boleh diselesaikan bila sudah dibekukan di percobaan.
  const questionRows = await rows<{
    id: string;
    question_type: "multiple_choice" | "numeric";
    prompt: string;
    options: string[] | null;
    hint: string;
    difficulty: "mudah" | "sedang" | "tantangan";
    answer_unit: string;
    order_index: number;
    image_id: string | null;
  }>(
    viewer,
    `select id, question_type, prompt, options, hint, difficulty, answer_unit, order_index, image_id
       from questions where id = any($1::uuid[]) order by order_index asc`,
    [attempt.question_ids],
  );

  if (questionRows.length === 0) return null;

  if (attempt.total_questions !== questionRows.length) {
    await one(viewer, "update attempts set total_questions = $2 where id = $1 returning id", [
      attempt.id,
      questionRows.length,
    ]);
  }

  const answered = await rows<{ question_id: string }>(
    viewer,
    "select question_id from attempt_answers where attempt_id = $1",
    [attempt.id],
  );
  const answeredIds = new Set(answered.map((row) => row.question_id));
  const answeredIndexes = questionRows
    .map((question, index) => (answeredIds.has(question.id) ? index : -1))
    .filter((index) => index >= 0);
  const firstUnanswered = questionRows.findIndex((question) => !answeredIds.has(question.id));

  return {
    attemptId: attempt.id,
    mode: attempt.mode,
    mission: {
      id: mission.id,
      slug: mission.slug,
      title: mission.title,
      story: mission.story,
      objectives: mission.learning_objectives,
    },
    questions: questionRows.map((question, index) => ({
      id: question.id,
      type: question.question_type,
      prompt: question.prompt,
      imageUrl: question.image_id ? `/media/${question.image_id}` : null,
      options: question.options ?? [],
      hint: question.hint,
      difficulty: question.difficulty,
      answerUnit: question.answer_unit,
      orderIndex: index + 1,
    })),
    answeredIndexes,
    startIndex: firstUnanswered === -1 ? Math.max(0, questionRows.length - 1) : firstUnanswered,
    allAnswered: answeredIndexes.length === questionRows.length,
  };
}

async function findMission(viewer: Viewer, slug: string): Promise<MissionRow | null> {
  return one<MissionRow>(
    viewer,
    "select * from missions where slug = $1 and is_published and archived_at is null",
    [slug],
  );
}

async function findOpenAttempt(viewer: Viewer, studentId: string, missionId: string): Promise<AttemptRow | null> {
  return one<AttemptRow>(
    viewer,
    "select * from attempts where student_id = $1 and mission_id = $2 and completed_at is null",
    [studentId, missionId],
  );
}

/**
 * Membuat percobaan baru (atau melanjutkan yang sedang berjalan).
 * Hanya dipanggil dari server action (POST), bukan dari render GET, supaya
 * prefetch/refresh halaman tidak membuat percobaan kosong.
 */
export async function startOrResumeAttempt(viewer: Viewer, studentId: string, slug: string): Promise<StartResult> {
  const mission = await findMission(viewer, slug);
  if (!mission) return { ok: false, reason: "not_found" };

  const cards = await listMissionCards(viewer, studentId);
  const card = cards.find((item) => item.id === mission.id);
  if (!card) return { ok: false, reason: "not_found" };
  if (!card.unlocked) return { ok: false, reason: "locked" };
  if (card.questionCount === 0) return { ok: false, reason: "empty" };

  let attempt = await findOpenAttempt(viewer, studentId, mission.id);

  if (!attempt) {
    // Satu soal acak per slot: variasi soal antarpercobaan tanpa mengubah jumlah soal.
    const questions = await rows<{ id: string }>(
      viewer,
      `select distinct on (slot_index) id
         from questions
        where mission_id = $1 and archived_at is null
        order by slot_index asc, random()`,
      [mission.id],
    );
    const questionIds = questions.map((row) => row.id);

    try {
      attempt = await one<AttemptRow>(
        viewer,
        `insert into attempts (student_id, mission_id, total_questions, question_ids)
         values ($1, $2, $3, $4)
         returning *`,
        [studentId, mission.id, questionIds.length, questionIds],
      );
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        attempt = await findOpenAttempt(viewer, studentId, mission.id);
      } else {
        throw error;
      }
    }
  }

  if (!attempt) return { ok: false, reason: "not_found" };

  const state = await buildPlayState(viewer, mission, attempt);
  if (!state) return { ok: false, reason: "empty" };
  return { ok: true, state };
}

/**
 * Membatalkan percobaan yang belum selesai. Percobaan selesai tidak bisa dihapus
 * agar riwayat belajar (dan laporan guru) tetap utuh.
 */
export async function cancelAttempt(
  viewer: Viewer,
  studentId: string,
  attemptId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const deleted = await one<{ id: string }>(
    viewer,
    "delete from attempts where id = $1 and student_id = $2 and completed_at is null returning id",
    [attemptId, studentId],
  );
  if (!deleted) return { ok: false, reason: "Percobaan ini tidak bisa dibatalkan." };
  return { ok: true };
}

/**
 * Memulai latihan dari soal yang salah pada satu percobaan selesai.
 * Percobaan latihan tidak memberi XP, tidak memberi lencana, dan tidak membuka misi
 * berikutnya, tetapi jawabannya tercatat untuk peta kemampuan.
 */
export async function startPracticeAttempt(
  viewer: Viewer,
  studentId: string,
  sourceAttemptId: string,
): Promise<{ ok: true; attemptId: string } | { ok: false; reason: string }> {
  const source = await one<AttemptRow>(
    viewer,
    "select * from attempts where id = $1 and student_id = $2 and completed_at is not null",
    [sourceAttemptId, studentId],
  );
  if (!source) return { ok: false, reason: "Percobaan tidak ditemukan." };
  if (source.mode === "practice") return { ok: false, reason: "Pilih percobaan misi untuk membuat latihan." };

  const wrong = await rows<{ question_id: string }>(
    viewer,
    "select question_id from attempt_answers where attempt_id = $1 and not is_correct order by answered_at asc",
    [source.id],
  );
  if (wrong.length === 0) {
    return { ok: false, reason: "Tidak ada soal yang salah di percobaan ini. Kerja bagus!" };
  }

  const questionIds = wrong.map((row) => row.question_id);
  const created = await one<AttemptRow>(
    viewer,
    `insert into attempts (student_id, mission_id, total_questions, question_ids, mode, source_attempt_id)
     values ($1, $2, $3, $4, 'practice', $5)
     returning *`,
    [studentId, source.mission_id, questionIds.length, questionIds, source.id],
  );
  if (!created) return { ok: false, reason: "Latihan gagal dimulai. Coba lagi." };
  return { ok: true, attemptId: created.id };
}

/** State latihan; hanya boleh dibaca pemiliknya. */
export async function getPracticeState(
  viewer: Viewer,
  studentId: string,
  attemptId: string,
): Promise<PlayState | null> {
  const attempt = await one<AttemptRow>(
    viewer,
    "select * from attempts where id = $1 and student_id = $2 and mode = 'practice'",
    [attemptId, studentId],
  );
  if (!attempt) return null;

  const mission = await one<MissionRow>(viewer, "select * from missions where id = $1", [attempt.mission_id]);
  if (!mission) return null;

  return buildPlayState(viewer, mission, attempt);
}

/** Membaca percobaan berjalan tanpa menulis apa pun. Aman dipanggil saat render GET. */
export async function getOpenAttemptState(viewer: Viewer, studentId: string, slug: string): Promise<PlayState | null> {
  const mission = await findMission(viewer, slug);
  if (!mission) return null;

  const attempt = await findOpenAttempt(viewer, studentId, mission.id);
  if (!attempt) return null;

  return buildPlayState(viewer, mission, attempt);
}

export async function submitAnswer(
  viewer: Viewer,
  studentId: string,
  input: { attemptId: string; questionId: string; answer: string },
): Promise<{ ok: true; feedback: import("./types").AnswerFeedback } | { ok: false; reason: string }> {
  const answer = input.answer.trim();
  if (!answer) return { ok: false, reason: "Jawaban masih kosong." };
  if (answer.length > 300) return { ok: false, reason: "Jawaban terlalu panjang." };

  return withViewer(viewer, async (client) => {
    const attemptResult = await client.query<AttemptRow>(
      "select * from attempts where id = $1 and student_id = $2 and completed_at is null for update",
      [input.attemptId, studentId],
    );
    const attempt = attemptResult.rows[0];
    if (!attempt) return { ok: false as const, reason: "Percobaan tidak ditemukan atau sudah selesai." };
    if (!attempt.question_ids.includes(input.questionId)) {
      return { ok: false as const, reason: "Soal bukan bagian dari misi ini." };
    }

    const questionResult = await client.query<{
      id: string;
      question_type: "multiple_choice" | "numeric";
      options: string[] | null;
      correct_answer: string;
      explanation: string;
    }>("select id, question_type, options, correct_answer, explanation from questions where id = $1", [
      input.questionId,
    ]);
    const question = questionResult.rows[0];
    if (!question) return { ok: false as const, reason: "Soal tidak tersedia." };

    const existing = await client.query<{ is_correct: boolean }>(
      "select is_correct from attempt_answers where attempt_id = $1 and question_id = $2",
      [attempt.id, input.questionId],
    );
    if (existing.rows[0]) {
      return {
        ok: true as const,
        feedback: {
          isCorrect: existing.rows[0].is_correct,
          correctAnswer: question.correct_answer,
          explanation: question.explanation,
          alreadyAnswered: true,
        },
      };
    }

    const isCorrect =
      question.question_type === "multiple_choice"
        ? isChoiceAnswerCorrect(question.correct_answer, answer)
        : isNumericAnswerCorrect(question.correct_answer, answer);

    await client.query(
      `insert into attempt_answers (attempt_id, question_id, submitted_answer, is_correct)
       values ($1, $2, $3, $4)`,
      [attempt.id, input.questionId, answer, isCorrect],
    );

    return {
      ok: true as const,
      feedback: {
        isCorrect,
        correctAnswer: question.correct_answer,
        explanation: question.explanation,
      },
    };
  });
}

/** Menyelesaikan percobaan, menghitung skor & XP di server, lalu memberi lencana. */
export async function completeAttempt(
  viewer: Viewer,
  studentId: string,
  attemptId: string,
): Promise<{ ok: true; attemptId: string } | { ok: false; reason: string }> {
  return withViewer(viewer, async (client) => {
    const attemptResult = await client.query<AttemptRow>(
      "select * from attempts where id = $1 and student_id = $2 for update",
      [attemptId, studentId],
    );
    const attempt = attemptResult.rows[0];
    if (!attempt) return { ok: false as const, reason: "Percobaan tidak ditemukan." };
    if (attempt.completed_at) return { ok: true as const, attemptId: attempt.id };

    const total = attempt.question_ids.length || attempt.total_questions;
    if (total === 0) return { ok: false as const, reason: "Misi ini tidak memiliki soal." };

    const answerStats = await client.query<{ answered: string; correct: string }>(
      `select count(*)::text as answered,
              count(*) filter (where is_correct)::text as correct
         from attempt_answers where attempt_id = $1`,
      [attempt.id],
    );
    const answeredCount = Number(answerStats.rows[0]?.answered ?? 0);
    if (answeredCount < total) {
      return {
        ok: false as const,
        reason: `Masih ada ${total - answeredCount} soal yang belum dijawab.`,
      };
    }

    const correctCount = Math.min(Number(answerStats.rows[0]?.correct ?? 0), total);
    const score = computeScore(correctCount, total);

    if (attempt.mode === "practice") {
      const updatedPractice = await client.query<AttemptRow>(
        `update attempts
            set completed_at = now(), score = $2, correct_count = $3, total_questions = $4, xp_earned = 0
          where id = $1
          returning *`,
        [attempt.id, score, correctCount, total],
      );
      if (!updatedPractice.rows[0]) return { ok: false as const, reason: "Gagal menyimpan hasil latihan." };
      return { ok: true as const, attemptId: attempt.id };
    }

    // XP dihitung dari peningkatan rekor, bukan diakumulasi tiap pengulangan.
    // Total XP per misi karena itu tidak pernah melebihi satu kali nilai penuh (maks. 120).
    const priorBestResult = await client.query<{ best: string | null }>(
      `select max(correct_count * $4 + $5)::text as best
         from attempts
        where student_id = $1
          and mission_id = $2
          and completed_at is not null
          and id <> $3`,
      [studentId, attempt.mission_id, attempt.id, XP_PER_CORRECT, XP_MISSION_BONUS],
    );
    const previousBestXp = Number(priorBestResult.rows[0]?.best ?? 0);
    const xp = Math.max(0, computeXp(correctCount, true) - previousBestXp);

    const priorCompleted = await client.query<{ mission_id: string }>(
      `select distinct mission_id from attempts
        where student_id = $1 and completed_at is not null and id <> $2`,
      [studentId, attempt.id],
    );
    const distinctBefore = new Set(priorCompleted.rows.map((row) => row.mission_id));
    const hadCompletedBefore = distinctBefore.size > 0;
    distinctBefore.add(attempt.mission_id);

    const earned = evaluateAchievements({
      correctCount,
      totalQuestions: total,
      accuracy: score,
      completedMissionCount: distinctBefore.size,
      hadCompletedMissionBefore: hadCompletedBefore,
    });

    const updated = await client.query<AttemptRow>(
      `update attempts
          set completed_at = now(), score = $2, correct_count = $3, total_questions = $4, xp_earned = $5
        where id = $1
        returning *`,
      [attempt.id, score, correctCount, total, xp],
    );
    if (!updated.rows[0]) return { ok: false as const, reason: "Gagal menyimpan hasil." };

    await grantAchievements(client, studentId, earned);
    return { ok: true as const, attemptId: attempt.id };
  });
}

async function grantAchievements(
  client: import("pg").PoolClient,
  studentId: string,
  keys: AchievementKey[],
): Promise<void> {
  if (keys.length === 0) return;
  await client.query(
    `insert into user_achievements (student_id, achievement_key)
     select $1, unnest($2::text[])
     on conflict (student_id, achievement_key) do nothing`,
    [studentId, keys],
  );
}

export async function getAttemptResult(viewer: Viewer, attemptId: string): Promise<AttemptResult | null> {
  const attempt = await one<AttemptRow>(viewer, "select * from attempts where id = $1", [attemptId]);
  if (!attempt) return null;

  const mission = await one<{
    id: string;
    slug: string;
    title: string;
    order_index: number;
    grade_level: number | null;
    subject_slug: string | null;
    subject_label: string | null;
    learning_objectives: string[];
  }>(
    viewer,
    `select m.id, m.slug, m.title, m.order_index, m.grade_level, m.subject_slug,
            s.label as subject_label, m.learning_objectives
       from missions m left join subjects s on s.slug = m.subject_slug
      where m.id = $1`,
    [attempt.mission_id],
  );
  if (!mission) return null;

  const student = await one<{ display_name: string; avatar_key: string }>(
    viewer,
    "select display_name, avatar_key from profiles where id = $1",
    [attempt.student_id],
  );

  const answers = await rows<{
    question_id: string;
    prompt: string;
    topic: string;
    difficulty: string;
    is_correct: boolean;
    submitted_answer: string;
    correct_answer: string;
    explanation: string;
    answer_unit: string;
    order_index: number;
  }>(
    viewer,
    `select aa.question_id, q.prompt, q.topic, q.difficulty, aa.is_correct, aa.submitted_answer,
            q.correct_answer, q.explanation, q.answer_unit, q.order_index
       from attempt_answers aa join questions q on q.id = aa.question_id
      where aa.attempt_id = $1 order by q.order_index asc`,
    [attempt.id],
  );

  const achievements = await rows<{ achievement_key: string; earned_at: Date }>(
    viewer,
    "select achievement_key, earned_at from user_achievements where student_id = $1 order by earned_at asc",
    [attempt.student_id],
  );

  const cards = viewer?.role === "student" ? await listMissionCards(viewer, attempt.student_id) : [];
  const currentIndex = cards.findIndex((card) => card.id === mission.id);
  const nextCard = cards.slice(currentIndex + 1).find(
    (card) => card.gradeLevel === mission.grade_level && card.subjectSlug === mission.subject_slug,
  );

  const xpTotal = await one<{ xp: string }>(
    viewer,
    "select coalesce(sum(xp_earned),0)::text as xp from attempts where student_id = $1 and completed_at is not null",
    [attempt.student_id],
  );

  const priorBest = await one<{ best: string | null }>(
    viewer,
    `select max(correct_count * $3 + $4)::text as best
       from attempts
      where student_id = $1
        and mission_id = $2
        and completed_at is not null
        and id <> $5`,
    [attempt.student_id, attempt.mission_id, XP_PER_CORRECT, XP_MISSION_BONUS, attempt.id],
  );

  return {
    attempt,
    mission: {
      id: mission.id,
      slug: mission.slug,
      title: mission.title,
      orderIndex: mission.order_index,
      gradeLevel: mission.grade_level,
      subjectLabel: mission.subject_label,
      objectives: mission.learning_objectives,
    },
    student: student
      ? { displayName: student.display_name, avatarKey: student.avatar_key }
      : { displayName: "Siswa", avatarKey: "rubah" },
    answers: answers.map((row) => ({
      questionId: row.question_id,
      prompt: row.prompt,
      topic: row.topic,
      difficulty: row.difficulty,
      isCorrect: row.is_correct,
      submittedAnswer: row.submitted_answer,
      correctAnswer: row.correct_answer,
      explanation: row.explanation,
      answerUnit: row.answer_unit,
      orderIndex: row.order_index,
    })),
    earnedAchievements: achievements.map((row) => ({ key: row.achievement_key, earnedAt: new Date(row.earned_at) })),
    nextMission: nextCard
      ? { slug: nextCard.slug, title: nextCard.title, unlocked: nextCard.unlocked }
      : null,
    accuracy: attempt.total_questions ? Math.round((attempt.correct_count / attempt.total_questions) * 100) : 0,
    mode: attempt.mode,
    sourceAttemptId: attempt.source_attempt_id,
    wrongQuestionIds: answers.filter((row) => !row.is_correct).map((row) => row.question_id),
    xpTotal: Number(xpTotal?.xp ?? 0),
    xpPotential: computeXp(attempt.correct_count, true),
    previousBestXp: Number(priorBest?.best ?? 0),
  };
}

export type TopicMastery = {
  key: string;
  label: string;
  answers: number;
  correct: number;
  accuracy: number | null;
  level: MasteryLevel;
};

/**
 * Akurasi per topik dari jawaban yang benar-benar dikirim siswa.
 * Latihan ikut dihitung karena tujuannya memperkuat topik yang sama.
 */
export async function getTopicMastery(viewer: Viewer, studentId: string): Promise<TopicMastery[]> {
  const data = await rows<{ topic: string; answers: string; correct: string }>(
    viewer,
    `select q.topic,
            count(*)::text as answers,
            count(*) filter (where aa.is_correct)::text as correct
       from attempt_answers aa
       join questions q on q.id = aa.question_id
       join attempts a on a.id = aa.attempt_id
      where a.student_id = $1 and a.completed_at is not null
      group by q.topic`,
    [studentId],
  );

  const byTopic = new Map(data.map((row) => [row.topic, row]));

  return TOPICS.map((topic) => {
    const row = byTopic.get(topic.key);
    const answers = Number(row?.answers ?? 0);
    const correct = Number(row?.correct ?? 0);
    const accuracy = answers > 0 ? Math.round((correct / answers) * 100) : null;
    return {
      key: topic.key,
      label: topic.label,
      answers,
      correct,
      accuracy,
      level: masteryLevel(accuracy, answers),
    };
  }).sort((a, b) => topicOrder(a.key) - topicOrder(b.key));
}

export type ProgressView = {
  xp: number;
  completedMissions: number;
  totalMissions: number;
  achievements: { key: string; earnedAt: Date }[];
  history: {
    id: string;
    missionTitle: string;
    slug: string;
    score: number;
    correctCount: number;
    totalQuestions: number;
    answeredCount: number;
    xpEarned: number;
    completedAt: Date | null;
    inProgress: boolean;
    mode: "mission" | "practice";
  }[];
  topics: TopicMastery[];
  perMission: { slug: string; title: string; lastScore: number | null; bestScore: number | null; attempts: number; unlocked: boolean }[];
};

export async function getProgress(viewer: Viewer, studentId: string): Promise<ProgressView> {
  const cards = await listMissionCards(viewer, studentId);

  const totals = await one<{ xp: string }>(
    viewer,
    "select coalesce(sum(xp_earned),0)::text as xp from attempts where student_id = $1 and completed_at is not null",
    [studentId],
  );

  const achievements = await rows<{ achievement_key: string; earned_at: Date }>(
    viewer,
    "select achievement_key, earned_at from user_achievements where student_id = $1 order by earned_at asc",
    [studentId],
  );

  const history = await rows<{
    id: string;
    title: string;
    slug: string;
    score: number;
    correct_count: number;
    total_questions: number;
    answered_count: string;
    xp_earned: number;
    completed_at: Date | null;
    mode: "mission" | "practice";
  }>(
    viewer,
    `select a.id, m.title, m.slug, a.score, a.correct_count, a.total_questions, a.xp_earned, a.completed_at, a.mode,
            (select count(*) from attempt_answers aa where aa.attempt_id = a.id) as answered_count
       from attempts a join missions m on m.id = a.mission_id
      where a.student_id = $1 order by a.started_at desc limit 30`,
    [studentId],
  );

  return {
    xp: Number(totals?.xp ?? 0),
    completedMissions: cards.filter((card) => card.completed).length,
    totalMissions: cards.length,
    achievements: achievements.map((row) => ({ key: row.achievement_key, earnedAt: new Date(row.earned_at) })),
    history: history.map((row) => ({
      id: row.id,
      missionTitle: row.title,
      slug: row.slug,
      score: row.score,
      correctCount: row.correct_count,
      totalQuestions: row.total_questions,
      answeredCount: Number(row.answered_count),
      xpEarned: row.xp_earned,
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      inProgress: row.completed_at === null,
      mode: row.mode,
    })),
    topics: await getTopicMastery(viewer, studentId),
    perMission: cards.map((card) => ({
      slug: card.slug,
      title: card.title,
      lastScore: card.lastScore,
      bestScore: card.bestScore,
      attempts: card.attemptCount,
      unlocked: card.unlocked,
    })),
  };
}

export async function updateStudentProfile(
  viewer: Viewer,
  studentId: string,
  input: { displayName: string; avatarKey: string },
): Promise<void> {
  await one(
    viewer,
    "update profiles set display_name = $2, avatar_key = $3 where id = $1 and role = 'student' returning id",
    [studentId, input.displayName, input.avatarKey],
  );
}

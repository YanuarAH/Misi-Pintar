import { isChoiceAnswerCorrect, isNumericAnswerCorrect } from "@/lib/normalize";
import { computeScore, computeXp, XP_MISSION_BONUS, XP_PER_CORRECT } from "@/lib/scoring";
import { evaluateAchievements, type AchievementKey } from "@/lib/achievements";
import { one, rows, withViewer, type Viewer } from "@/lib/db";
import type { AttemptRow, MissionCard, MissionRow, PlayQuestion, AttemptResult } from "./types";

export type MissionProgressRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  order_index: number;
  is_published: boolean;
  question_count: string;
  attempt_count: string;
  best_score: number | null;
  last_score: number | null;
  open_attempt_id: string | null;
  completed_any: boolean;
};

const MISSION_PROGRESS_SQL = `
  select m.id, m.slug, m.title, m.description, m.order_index, m.is_published,
         (select count(*) from questions q where q.mission_id = m.id and q.archived_at is null) as question_count,
         (select count(*) from attempts a
            where a.mission_id = m.id and a.student_id = $1 and a.completed_at is not null) as attempt_count,
         (select max(a.score) from attempts a
            where a.mission_id = m.id and a.student_id = $1 and a.completed_at is not null) as best_score,
         (select a.score from attempts a
            where a.mission_id = m.id and a.student_id = $1 and a.completed_at is not null
            order by a.completed_at desc limit 1) as last_score,
         (select a.id from attempts a
            where a.mission_id = m.id and a.student_id = $1 and a.completed_at is null limit 1) as open_attempt_id
  from missions m
  where m.archived_at is null and m.is_published
  order by m.order_index asc
`;

function toCards(rowsIn: MissionProgressRow[]): MissionCard[] {
  const completedSlugs = new Set<string>();
  return rowsIn.map((row, index) => {
    const previous = index === 0 ? null : rowsIn[index - 1];
    const completed = Number(row.attempt_count) > 0;
    const unlocked = index === 0 || (previous ? completedSlugs.has(previous.slug) : true);
    if (completed) completedSlugs.add(row.slug);
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      orderIndex: row.order_index,
      questionCount: Number(row.question_count),
      isPublished: row.is_published,
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
      where a.student_id = $1 and a.completed_at is not null
      order by a.completed_at desc limit 3`,
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
  };
}

export type MissionDetailView = {
  mission: MissionRow;
  card: MissionCard;
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
  const next = cards[index + 1] ?? null;

  return {
    mission,
    card,
    nextMission: next ? { slug: next.slug, title: next.title } : null,
    estimatedMinutes: Math.max(3, Math.round(card.questionCount * 1.5)),
    rewardXp: card.questionCount * XP_PER_CORRECT + XP_MISSION_BONUS,
  };
}

export type PlayState = {
  attemptId: string;
  mission: { id: string; slug: string; title: string; story: string; objectives: string[] };
  questions: PlayQuestion[];
  answeredIndexes: number[];
  startIndex: number;
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
  }>(
    viewer,
    `select id, question_type, prompt, options, hint, difficulty, answer_unit, order_index
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
      options: question.options ?? [],
      hint: question.hint,
      difficulty: question.difficulty,
      answerUnit: question.answer_unit,
      orderIndex: index + 1,
    })),
    answeredIndexes,
    startIndex: firstUnanswered === -1 ? Math.max(0, questionRows.length - 1) : firstUnanswered,
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
    const questions = await rows<{ id: string }>(
      viewer,
      "select id from questions where mission_id = $1 and archived_at is null order by order_index asc",
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
    const correctResult = await client.query<{ correct: string }>(
      "select count(*)::text as correct from attempt_answers where attempt_id = $1 and is_correct",
      [attempt.id],
    );
    const correctCount = Math.min(Number(correctResult.rows[0]?.correct ?? 0), total);
    const score = computeScore(correctCount, total);
    const xp = computeXp(correctCount, true);

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

  const mission = await one<{ id: string; slug: string; title: string; order_index: number; learning_objectives: string[] }>(
    viewer,
    "select id, slug, title, order_index, learning_objectives from missions where id = $1",
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
    difficulty: string;
    is_correct: boolean;
    submitted_answer: string;
    correct_answer: string;
    explanation: string;
    answer_unit: string;
    order_index: number;
  }>(
    viewer,
    `select aa.question_id, q.prompt, q.difficulty, aa.is_correct, aa.submitted_answer,
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

  const siblings = await rows<{ id: string; slug: string; title: string; order_index: number }>(
    viewer,
    "select id, slug, title, order_index from missions where archived_at is null and is_published order by order_index asc",
  );
  const currentIndex = siblings.findIndex((row) => row.id === mission.id);
  const nextRow = siblings[currentIndex + 1] ?? null;
  const nextUnlocked = Boolean(attempt.completed_at);

  const xpTotal = await one<{ xp: string }>(
    viewer,
    "select coalesce(sum(xp_earned),0)::text as xp from attempts where student_id = $1 and completed_at is not null",
    [attempt.student_id],
  );

  return {
    attempt,
    mission: {
      id: mission.id,
      slug: mission.slug,
      title: mission.title,
      orderIndex: mission.order_index,
      objectives: mission.learning_objectives,
    },
    student: student
      ? { displayName: student.display_name, avatarKey: student.avatar_key }
      : { displayName: "Siswa", avatarKey: "rubah" },
    answers: answers.map((row) => ({
      questionId: row.question_id,
      prompt: row.prompt,
      difficulty: row.difficulty,
      isCorrect: row.is_correct,
      submittedAnswer: row.submitted_answer,
      correctAnswer: row.correct_answer,
      explanation: row.explanation,
      answerUnit: row.answer_unit,
      orderIndex: row.order_index,
    })),
    earnedAchievements: achievements.map((row) => ({ key: row.achievement_key, earnedAt: new Date(row.earned_at) })),
    nextMission: nextRow ? { slug: nextRow.slug, title: nextRow.title, unlocked: nextUnlocked } : null,
    accuracy: attempt.total_questions ? Math.round((attempt.correct_count / attempt.total_questions) * 100) : 0,
    xpTotal: Number(xpTotal?.xp ?? 0),
  };
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
    xpEarned: number;
    completedAt: Date | null;
  }[];
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
    xp_earned: number;
    completed_at: Date | null;
  }>(
    viewer,
    `select a.id, m.title, m.slug, a.score, a.correct_count, a.total_questions, a.xp_earned, a.completed_at
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
      xpEarned: row.xp_earned,
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
    })),
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

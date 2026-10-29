import { randomBytes, randomInt } from "node:crypto";
import { Pool } from "pg";
import { hashSecret } from "@/lib/password";

export const ADMIN_URL =
  process.env.TEST_ADMIN_DATABASE_URL ?? "postgres://postgres@127.0.0.1:5433/misi_pintar_test";
export const APP_URL = process.env.TEST_DATABASE_URL ?? "postgres://misi_app:misi_app_dev@127.0.0.1:5433/misi_pintar_test";

const adminPool = new Pool({ connectionString: ADMIN_URL, max: 4 });
const appPool = new Pool({ connectionString: APP_URL, max: 4 });

export async function adminQuery<T extends Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await adminPool.query<T>(sql, params);
  return result.rows;
}

export async function appQuery<T extends Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await appPool.query<T>(sql, params);
  return result.rows;
}

/** Menjalankan query sebagai "viewer" tertentu, seperti yang dilakukan aplikasi. */
export async function asViewer<T>(
  viewer: { userId: string; role: "student" | "teacher" } | null,
  fn: (query: <R extends Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<R[]>) => Promise<T>,
): Promise<T> {
  const client = await appPool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('app.user_id', $1, true), set_config('app.role', $2, true)", [
      viewer?.userId ?? "",
      viewer?.role ?? "anon",
    ]);
    const result = await fn(async <R extends Record<string, unknown>>(sql: string, params: unknown[] = []) => {
      const response = await client.query<R>(sql, params);
      return response.rows;
    });
    await client.query("rollback");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function closePools(): Promise<void> {
  await adminPool.end();
  await appPool.end();
}

/** Mengosongkan seluruh tabel aplikasi agar tiap file uji berdiri sendiri. */
export async function resetData(): Promise<void> {
  await adminQuery(
    `truncate table attempt_answers, attempts, user_achievements, sessions, questions,
       missions, class_members, classes, profiles cascade`,
  );
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomCode(length: number): string {
  let code = "";
  for (let index = 0; index < length; index += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

export async function createTeacher(name = "Guru Uji"): Promise<{ id: string; email: string }> {
  const suffix = randomBytes(4).toString("hex");
  const email = `guru-${suffix}@misipintar.test`;
  const hash = await hashSecret("PasswordUji123!");
  const [row] = await adminQuery<{ id: string }>(
    `insert into profiles (role, display_name, email, password_hash)
     values ('teacher', $1, $2, $3) returning id`,
    [name, email, hash],
  );
  return { id: row.id, email };
}

export async function createClassroom(
  teacherId: string,
  name = "Kelas Uji",
  gradeLevel: number | null = 5,
  subjectSlug: string | null = "matematika",
): Promise<{ id: string; joinCode: string }> {
  const joinCode = randomCode(6);
  const [row] = await adminQuery<{ id: string }>(
    "insert into classes (teacher_id, name, join_code, grade_level, subject_slug) values ($1, $2, $3, $4, $5) returning id",
    [teacherId, `${name} ${joinCode}`, joinCode, gradeLevel, subjectSlug],
  );
  return { id: row.id, joinCode };
}

export async function createStudent(options: {
  className?: string;
  /** Opsional: siswa boleh belajar mandiri tanpa kelas. */
  classId?: string;
  pin?: string;
  avatarKey?: string;
  /** Default: tingkat kelas dari kelasnya; tanpa kelas default null (belum dipilih). */
  gradeLevel?: number | null;
}): Promise<{ id: string; accessCode: string; displayName: string }> {
  const accessCode = randomCode(8);
  const displayName = `Siswa ${accessCode.slice(0, 4)}`;
  const pinHash = await hashSecret(options.pin ?? "1234");

  let gradeLevel = options.gradeLevel ?? null;
  if (options.classId && options.gradeLevel === undefined) {
    const [classroom] = await adminQuery<{ grade_level: number | null }>(
      "select grade_level from classes where id = $1",
      [options.classId],
    );
    gradeLevel = classroom?.grade_level ?? null;
  }

  const [profile] = await adminQuery<{ id: string }>(
    `insert into profiles (role, display_name, avatar_key, pin_hash, access_code, grade_level)
     values ('student', $1, $2, $3, $4, $5) returning id`,
    [displayName, options.avatarKey ?? "panda", pinHash, accessCode, gradeLevel],
  );

  if (options.classId) {
    await adminQuery("insert into class_members (class_id, student_id) values ($1, $2)", [
      options.classId,
      profile.id,
    ]);
  }

  return { id: profile.id, accessCode, displayName };
}

export type QuestionFixture = {
  questionType: "multiple_choice" | "numeric";
  prompt: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  hint?: string;
  difficulty?: "mudah" | "sedang" | "tantangan";
  orderIndex?: number;
  answerUnit?: string;
  /** Slot soal; default = orderIndex. Soal dengan slot sama menjadi varian. */
  slot?: number;
  topic?: string;
  /** Varian ke-berapa dalam slot; default dihitung otomatis per slot. */
  variant?: number;
};

export async function createMission(options: {
  authorId: string;
  slug?: string;
  title?: string;
  orderIndex?: number;
  published?: boolean;
  audience?: "public" | "class_only";
  gradeLevel?: number | null;
  subject?: string | null;
  topic?: string | null;
  questions: QuestionFixture[];
}): Promise<{ id: string; slug: string }> {
  const slug = options.slug ?? `misi-uji-${randomCode(6).toLowerCase()}`;
  const [mission] = await adminQuery<{ id: string }>(
    `insert into missions
       (slug, title, description, story, learning_objectives, order_index, is_published, author_id,
        grade_level, subject_slug, topic_slug, audience)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) returning id`,
    [
      slug,
      options.title ?? `Misi ${slug}`,
      "Deskripsi uji",
      "Cerita uji",
      ["Tujuan uji"],
      options.orderIndex ?? 1,
      options.published ?? true,
      options.authorId,
      options.gradeLevel === undefined ? 5 : options.gradeLevel,
      options.subject === undefined ? "matematika" : options.subject,
      options.topic === undefined ? "pecahan" : options.topic,
      options.audience ?? "public",
    ],
  );

  let order = 0;
  const perSlot = new Map<number, number>();
  for (const question of options.questions) {
    order += 1;
    const slot = question.slot ?? question.orderIndex ?? order;
    const variant = question.variant ?? (perSlot.get(slot) ?? 0);
    perSlot.set(slot, variant + 1);
    await adminQuery(
      `insert into questions
         (mission_id, question_type, prompt, options, correct_answer, explanation, hint, difficulty,
          order_index, answer_unit, slot_index, variant_index, topic)
       values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        mission.id,
        question.questionType,
        question.prompt,
        question.options ? JSON.stringify(question.options) : null,
        question.correctAnswer,
        question.explanation,
        question.hint ?? "Petunjuk uji",
        question.difficulty ?? "sedang",
        question.orderIndex ?? order,
        question.answerUnit ?? "",
        slot,
        variant,
        question.topic ?? "umum",
      ],
    );
  }

  return { id: mission.id, slug };
}

export async function archiveQuestionRow(questionId: string): Promise<void> {
  await adminQuery("update questions set archived_at = now() where id = $1", [questionId]);
}

export async function getQuestionIds(missionId: string): Promise<string[]> {
  const rows = await adminQuery<{ id: string }>(
    "select id from questions where mission_id = $1 and archived_at is null order by order_index",
    [missionId],
  );
  return rows.map((row) => row.id);
}

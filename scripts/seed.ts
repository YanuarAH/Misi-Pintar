/**
 * Seed idempoten: 30 misi untuk Matematika kelas 5 dan tiga mapel kelas 4-6 + soal,
 * akun guru demo, kelas demo, satu siswa demo.
 *
 *   npm run db:seed             # hanya mengisi yang belum ada
 *   npm run db:seed -- --force  # menimpa teks misi/soal dengan versi seed
 *
 * Di production, akun demo hanya dibuat bila SEED_DEMO_ACCOUNTS=true.
 */
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { seedMissions, seedVariants, type SeedQuestion } from "../db/seed/content";
import { hashSecret } from "../src/lib/password";
import { loadEnv, requireEnv } from "./lib/env";
import { resolveTeacherSeedCredentials } from "./lib/seed-config";

const DEMO_CLASS_CODE = "MISI5A";
const DEMO_STUDENT_CODE = "DEMO1234";
const DEMO_STUDENT_PIN = "1234";

async function main() {
  loadEnv();
  const force = process.argv.includes("--force");
  const isProduction = process.env.NODE_ENV === "production";
  const allowDemo = !isProduction || process.env.SEED_DEMO_ACCOUNTS === "true";

  const client = new Client({ connectionString: requireEnv("ADMIN_DATABASE_URL") });
  await client.connect();

  try {
    await client.query("begin");

    const teacherCredentials = resolveTeacherSeedCredentials(process.env);
    const teacherEmail = teacherCredentials.email;
    const teacherPassword = teacherCredentials.password;

    const existingTeacher = await client.query<{ id: string }>(
      "select id from profiles where lower(email) = $1",
      [teacherEmail],
    );

    let teacherId = existingTeacher.rows[0]?.id;
    if (!teacherId) {
      const passwordHash = await hashSecret(teacherPassword);
      const inserted = await client.query<{ id: string }>(
        `insert into profiles (role, display_name, email, password_hash)
         values ('teacher', $1, $2, $3) returning id`,
        ["Bu Sari", teacherEmail, passwordHash],
      );
      teacherId = inserted.rows[0].id;
      console.log(`Guru demo dibuat: ${teacherEmail}`);
    } else {
      console.log(`Guru sudah ada: ${teacherEmail}`);
    }

    let classId: string;
    const existingClass = await client.query<{ id: string }>(
      "select id from classes where teacher_id = $1 and name = $2",
      [teacherId, "Kelas 5A - Matematika"],
    );
    if (existingClass.rows[0]) {
      classId = existingClass.rows[0].id;
      // Kelas demo memang untuk kelas 5; kelas lain tidak disentuh.
      await client.query(
        "update classes set grade_level = coalesce(grade_level, 5), subject_slug = coalesce(subject_slug, 'matematika') where id = $1",
        [classId],
      );
    } else {
      const inserted = await client.query<{ id: string }>(
        "insert into classes (teacher_id, name, join_code, grade_level, subject_slug) values ($1, $2, $3, 5, 'matematika') returning id",
        [teacherId, "Kelas 5A - Matematika", DEMO_CLASS_CODE],
      );
      classId = inserted.rows[0].id;
      console.log(`Kelas demo dibuat dengan kode ${DEMO_CLASS_CODE}`);
    }

    let demoStudentId: string | null = null;
    if (allowDemo) {
      const existingStudent = await client.query<{ id: string }>(
        "select id from profiles where access_code = $1",
        [DEMO_STUDENT_CODE],
      );
      if (existingStudent.rows[0]) {
        demoStudentId = existingStudent.rows[0].id;
        await client.query("update profiles set grade_level = coalesce(grade_level, 5) where id = $1", [demoStudentId]);
      } else {
        const pinHash = await hashSecret(DEMO_STUDENT_PIN);
        const inserted = await client.query<{ id: string }>(
          `insert into profiles (role, display_name, avatar_key, pin_hash, access_code, grade_level)
           values ('student', 'Rani', 'rubah', $1, $2, 5) returning id`,
          [pinHash, DEMO_STUDENT_CODE],
        );
        demoStudentId = inserted.rows[0].id;
        await client.query("insert into class_members (class_id, student_id) values ($1, $2)", [
          classId,
          demoStudentId,
        ]);
        console.log(`Siswa demo dibuat: Rani (kode ${DEMO_STUDENT_CODE}, PIN ${DEMO_STUDENT_PIN})`);
      }
    }

    const missionIds = new Map<string, string>();
    for (const mission of seedMissions) {
      const existing = await client.query<{ id: string; is_published: boolean }>(
        "select id, is_published from missions where slug = $1",
        [mission.slug],
      );

      let missionId = existing.rows[0]?.id;
      if (!missionId) {
        const inserted = await client.query<{ id: string }>(
          `insert into missions
             (slug, title, description, story, learning_objectives, order_index, is_published, author_id,
              grade_level, subject_slug, topic_slug, audience)
           values ($1, $2, $3, $4, $5, $6, true, $7, $8, $9, $10, $11) returning id`,
          [
            mission.slug,
            mission.title,
            mission.description,
            mission.story,
            mission.learningObjectives,
            mission.orderIndex,
            teacherId,
            mission.gradeLevel,
            mission.subject,
            mission.topic,
            mission.audience,
          ],
        );
        missionId = inserted.rows[0].id;
      } else if (force) {
        await client.query(
          `update missions
              set title = $2, description = $3, story = $4, learning_objectives = $5, order_index = $6,
                  is_published = true, archived_at = null,
                  grade_level = $7, subject_slug = $8, topic_slug = $9, audience = $10
            where id = $1`,
          [
            missionId,
            mission.title,
            mission.description,
            mission.story,
            mission.learningObjectives,
            mission.orderIndex,
            mission.gradeLevel,
            mission.subject,
            mission.topic,
            mission.audience,
          ],
        );
      }
      missionIds.set(mission.slug, missionId);

      // Slot 1..n = soal utama; varian mengisi slot yang sama dan dipilih acak saat bermain.
      const slots: { slot: number; orderIndex: number; topic: string; variant: number; data: SeedQuestion }[] = [];

      for (const [index, question] of mission.questions.entries()) {
        slots.push({
          slot: index + 1,
          orderIndex: index + 1,
          topic: mission.questionTopics[index] ?? "umum",
          variant: 0,
          data: question,
        });
      }
      for (const variant of seedVariants[mission.slug] ?? []) {
        const variantIndex = slots.filter((item) => item.slot === variant.slot).length;
        slots.push({
          slot: variant.slot,
          orderIndex: variant.slot,
          topic: variant.topic,
          variant: variantIndex,
          data: variant,
        });
      }

      for (const item of slots) {
        const existingQuestion = await client.query<{ id: string }>(
          `select id from questions
            where mission_id = $1 and slot_index = $2 and variant_index = $3 and archived_at is null`,
          [missionId, item.slot, item.variant],
        );

        const values = [
          missionId,
          item.data.type,
          item.data.prompt,
          item.data.options ? JSON.stringify(item.data.options) : null,
          item.data.answer,
          item.data.explanation,
          item.data.hint,
          item.data.difficulty,
          item.orderIndex,
          item.data.unitLabel ?? "",
          item.slot,
          item.variant,
          item.topic,
        ];

        if (!existingQuestion.rows[0]) {
          await client.query(
            `insert into questions
               (mission_id, question_type, prompt, options, correct_answer, explanation, hint, difficulty,
                order_index, answer_unit, slot_index, variant_index, topic)
             values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            values,
          );
        } else if (force) {
          await client.query(
            `update questions
                set mission_id = $1, question_type = $2, prompt = $3, options = $4::jsonb, correct_answer = $5,
                    explanation = $6, hint = $7, difficulty = $8, order_index = $9, answer_unit = $10,
                    slot_index = $11, variant_index = $12, topic = $13
              where id = $14`,
            [...values, existingQuestion.rows[0].id],
          );
        }
      }
    }

    // Satu percobaan demo agar dashboard guru tidak kosong saat pertama dibuka.
    if (demoStudentId) {
      const existingAttempt = await client.query<{ id: string }>(
        "select id from attempts where student_id = $1 limit 1",
        [demoStudentId],
      );

      if (!existingAttempt.rows[0]) {
        const firstMissionId = missionIds.get("pasar-pintar");
        if (firstMissionId) {
          const questions = await client.query<{
            id: string;
            question_type: string;
            options: string[] | null;
            correct_answer: string;
          }>(
            `select distinct on (slot_index) id, question_type, options, correct_answer
               from questions
              where mission_id = $1 and archived_at is null
              order by slot_index asc, variant_index asc`,
            [firstMissionId],
          );

          const questionIds = questions.rows.map((row) => row.id);
          const attempt = await client.query<{ id: string }>(
            `insert into attempts
               (student_id, mission_id, score, correct_count, total_questions, xp_earned, question_ids, started_at, completed_at)
             values ($1, $2, 80, 8, $3, 100, $4, now() - interval '2 days', now() - interval '2 days' + interval '9 minutes')
             returning id`,
            [demoStudentId, firstMissionId, questionIds.length, questionIds],
          );

          for (const [index, question] of questions.rows.entries()) {
            const correct = index < 8;
            let submitted = question.correct_answer;
            if (!correct) {
              if (question.question_type === "multiple_choice") {
                const wrongOption = (question.options ?? []).find((option) => option !== question.correct_answer);
                submitted = wrongOption ?? "tidak tahu";
              } else {
                submitted = String(Number(question.correct_answer) + 500);
              }
            }
            await client.query(
              `insert into attempt_answers (attempt_id, question_id, submitted_answer, is_correct)
               values ($1, $2, $3, $4)`,
              [attempt.rows[0].id, question.id, submitted, correct],
            );
          }

          await client.query(
            `insert into user_achievements (student_id, achievement_key)
             values ($1, 'penjelajah'), ($1, 'bintang_misi')
             on conflict do nothing`,
            [demoStudentId],
          );
        }
      }
    }

    await client.query("commit");

    const counts = await client.query<{ missions: string; questions: string; slots: string }>(
      `select (select count(*) from missions where archived_at is null)::text as missions,
              (select count(*) from questions where archived_at is null)::text as questions,
              (select count(distinct (mission_id, slot_index)) from questions where archived_at is null)::text as slots`,
    );
    console.log(
      `Seed selesai: ${counts.rows[0].missions} misi, ${counts.rows[0].questions} soal dalam ${counts.rows[0].slots} slot.`,
    );
    if (allowDemo) {
      console.log("");
      console.log("Akun demo:");
      console.log(
        isProduction
          ? `  Guru  : ${teacherEmail} (password dari environment)`
          : `  Guru  : ${teacherEmail} / ${teacherPassword}`,
      );
      console.log(`  Siswa : kode ${DEMO_STUDENT_CODE} / PIN ${DEMO_STUDENT_PIN}`);
      console.log(`  Kode kelas untuk pendaftaran siswa baru: ${DEMO_CLASS_CODE}`);
    }
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  if (error instanceof Error && error.stack && process.env.DEBUG_SEED) console.error(error.stack);
  process.exit(1);
});

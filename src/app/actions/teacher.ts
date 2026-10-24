"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "@/lib/session";
import { classSchema, firstIssue, missionSchema, pinSchema } from "@/lib/validation";
import {
  TeacherError,
  archiveMission,
  archiveQuestion,
  createClass,
  createMission,
  createQuestion,
  regenerateJoinCode,
  removeClassMember,
  resetStudentPin,
  setMissionPublished,
  updateMission,
  updateQuestion,
} from "@/server/teacher";

async function teacherSession(): Promise<SessionUser | null> {
  const session = await getSession();
  return session?.role === "teacher" ? session : null;
}

function viewerFor(session: SessionUser) {
  return { userId: session.id, role: "teacher" as const };
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export type ActionState = { error?: string; success?: string } | null;

/* ---------------------------------- Misi --------------------------------- */

export async function saveMissionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await teacherSession();
  if (!session) return { error: "Sesi guru berakhir. Silakan masuk lagi." };

  const missionId = String(formData.get("missionId") ?? "");
  const parsed = missionSchema.safeParse({
    title: formData.get("title") ?? "",
    slug: formData.get("slug") ?? "",
    description: formData.get("description") ?? "",
    story: formData.get("story") ?? "",
    learningObjectives: String(formData.get("learningObjectives") ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    orderIndex: formData.get("orderIndex") ?? 1,
  });

  if (!parsed.success) return { error: firstIssue(parsed.error) };

  let newMissionId: string | null = null;
  try {
    if (missionId) {
      await updateMission(viewerFor(session), missionId, parsed.data);
    } else {
      const mission = await createMission(viewerFor(session), session.id, parsed.data);
      newMissionId = mission.id;
    }
  } catch (error) {
    if (error instanceof TeacherError) return { error: error.message };
    console.error("saveMissionAction", error);
    return { error: "Misi gagal disimpan. Coba lagi." };
  }

  revalidatePath("/guru/misi");
  if (missionId) revalidatePath(`/guru/misi/${missionId}`);
  revalidatePath("/belajar");

  if (newMissionId) redirect(`/guru/misi/${newMissionId}`);
  return { success: "Perubahan misi tersimpan." };
}

export async function togglePublishAction(formData: FormData): Promise<void> {
  const session = await teacherSession();
  if (!session) redirect("/guru/login");

  const missionId = String(formData.get("missionId") ?? "");
  const publish = String(formData.get("publish") ?? "") === "true";

  try {
    await setMissionPublished(viewerFor(session), missionId, publish);
  } catch (error) {
    const message = error instanceof TeacherError ? error.message : "Status misi gagal diubah.";
    redirectWithError(`/guru/misi/${missionId}`, message);
  }

  revalidatePath("/guru/misi");
  revalidatePath(`/guru/misi/${missionId}`);
  revalidatePath("/belajar");
  redirect(`/guru/misi/${missionId}`);
}

export async function archiveMissionAction(formData: FormData): Promise<void> {
  const session = await teacherSession();
  if (!session) redirect("/guru/login");

  const missionId = String(formData.get("missionId") ?? "");
  try {
    await archiveMission(viewerFor(session), missionId);
  } catch (error) {
    redirectWithError(`/guru/misi/${missionId}`, error instanceof TeacherError ? error.message : "Misi gagal diarsipkan.");
  }

  revalidatePath("/guru/misi");
  revalidatePath("/belajar");
  redirect("/guru/misi");
}

/* --------------------------------- Soal ---------------------------------- */

export async function saveQuestionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await teacherSession();
  if (!session) return { error: "Sesi guru berakhir. Silakan masuk lagi." };

  const missionId = String(formData.get("missionId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");

  if (!missionId) return { error: "Misi tidak dikenali." };

  const payload = {
    questionType: String(formData.get("questionType") ?? "multiple_choice"),
    prompt: String(formData.get("prompt") ?? ""),
    options: formData.getAll("option").map((value) => String(value)),
    correctAnswer: String(formData.get("correctAnswer") ?? ""),
    explanation: String(formData.get("explanation") ?? ""),
    hint: String(formData.get("hint") ?? ""),
    difficulty: String(formData.get("difficulty") ?? "sedang"),
    orderIndex: formData.get("orderIndex") ?? 1,
  };

  try {
    if (questionId) {
      await updateQuestion(viewerFor(session), questionId, payload);
    } else {
      await createQuestion(viewerFor(session), missionId, payload);
    }
  } catch (error) {
    if (error instanceof TeacherError) return { error: error.message };
    console.error("saveQuestionAction", error);
    return { error: "Soal gagal disimpan. Coba lagi." };
  }

  revalidatePath(`/guru/misi/${missionId}`);
  revalidatePath("/guru/misi");
  return { success: questionId ? "Soal diperbarui." : "Soal ditambahkan." };
}

export async function archiveQuestionAction(formData: FormData): Promise<void> {
  const session = await teacherSession();
  if (!session) redirect("/guru/login");

  const missionId = String(formData.get("missionId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");

  try {
    await archiveQuestion(viewerFor(session), questionId);
  } catch (error) {
    redirectWithError(
      `/guru/misi/${missionId}`,
      error instanceof TeacherError ? error.message : "Soal gagal dihapus.",
    );
  }

  revalidatePath(`/guru/misi/${missionId}`);
  revalidatePath("/guru/misi");
  redirect(`/guru/misi/${missionId}`);
}

/* --------------------------------- Kelas --------------------------------- */

export async function createClassAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await teacherSession();
  if (!session) return { error: "Sesi guru berakhir." };

  const parsed = classSchema.safeParse({ name: formData.get("name") ?? "" });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  try {
    await createClass(viewerFor(session), session.id, parsed.data.name);
  } catch (error) {
    console.error("createClassAction", error);
    return { error: error instanceof TeacherError ? error.message : "Kelas gagal dibuat." };
  }

  revalidatePath("/guru/kelas");
  revalidatePath("/guru/dashboard");
  return { success: "Kelas baru dibuat. Bagikan kode kelas kepada siswa." };
}

export async function regenerateJoinCodeAction(formData: FormData): Promise<void> {
  const session = await teacherSession();
  if (!session) redirect("/guru/login");

  const classId = String(formData.get("classId") ?? "");
  try {
    await regenerateJoinCode(viewerFor(session), classId);
  } catch (error) {
    redirectWithError(`/guru/kelas/${classId}`, error instanceof TeacherError ? error.message : "Kode gagal diperbarui.");
  }

  revalidatePath(`/guru/kelas/${classId}`);
  redirect(`/guru/kelas/${classId}`);
}

export async function resetPinAction(formData: FormData): Promise<void> {
  const session = await teacherSession();
  if (!session) redirect("/guru/login");

  const classId = String(formData.get("classId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const parsed = pinSchema.safeParse(formData.get("pin") ?? "");

  if (!parsed.success) {
    redirectWithError(`/guru/kelas/${classId}`, "PIN baru harus 4–6 angka.");
  }

  try {
    await resetStudentPin(viewerFor(session), studentId, parsed.data);
  } catch (error) {
    redirectWithError(
      `/guru/kelas/${classId}`,
      error instanceof TeacherError || (error as { code?: string }).code === "42501"
        ? "Tidak berwenang mengubah PIN siswa ini."
        : "PIN gagal diatur ulang.",
    );
  }

  revalidatePath(`/guru/kelas/${classId}`);
  redirect(`/guru/kelas/${classId}?pinReset=1`);
}

export async function removeMemberAction(formData: FormData): Promise<void> {
  const session = await teacherSession();
  if (!session) redirect("/guru/login");

  const classId = String(formData.get("classId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");

  try {
    await removeClassMember(viewerFor(session), classId, studentId);
  } catch (error) {
    redirectWithError(`/guru/kelas/${classId}`, error instanceof TeacherError ? error.message : "Siswa gagal dikeluarkan.");
  }

  revalidatePath(`/guru/kelas/${classId}`);
  redirect(`/guru/kelas/${classId}`);
}

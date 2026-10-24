import { redirect } from "next/navigation";
import type { Viewer } from "./db";
import { getSession, type SessionUser } from "./session";

export async function requireStudent(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/masuk");
  if (session.role !== "student") redirect("/guru/dashboard");
  return session;
}

export async function requireTeacher(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/guru/login");
  if (session.role !== "teacher") redirect("/belajar");
  return session;
}

export function viewerOf(session: SessionUser | null): Viewer {
  if (!session) return null;
  return { userId: session.id, role: session.role };
}

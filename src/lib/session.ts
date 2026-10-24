import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { one } from "./db";

export const SESSION_COOKIE = "misi_session";
const SESSION_TTL_DAYS = 30;

export type SessionUser = {
  id: string;
  role: "student" | "teacher";
  displayName: string;
  avatarKey: string;
  expiresAt: Date;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Dibaca sekali per request (di-cache oleh React). */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const row = await one<{ id: string; role: string; display_name: string; avatar_key: string; expires_at: Date }>(
    null,
    "select * from public.app_session_user($1)",
    [hashToken(token)],
  );
  if (!row) return null;
  if (row.role !== "student" && row.role !== "teacher") return null;

  return {
    id: row.id,
    role: row.role,
    displayName: row.display_name,
    avatarKey: row.avatar_key,
    expiresAt: new Date(row.expires_at),
  };
});

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await one(null, "select public.app_create_session($1, $2, $3)", [userId, hashToken(token), expiresAt]);

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await one(null, "select public.app_delete_session($1)", [hashToken(token)]);
  }
  store.delete(SESSION_COOKIE);
}

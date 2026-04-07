import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const ADMIN_COOKIE = "admin_token";
const ADMIN_PASSWORD = "123";

export const runtime = "nodejs";

export async function isAdminAuthed(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const d = db();
  const row = d
    .prepare("SELECT token FROM admin_sessions WHERE token = ?")
    .get(token) as { token: string } | undefined;
  return Boolean(row);
}

export async function createAdminSessionOrThrow(password: string) {
  if (password !== ADMIN_PASSWORD) throw new Error("Invalid password");
  const token = crypto.randomUUID();
  const now = Date.now();
  const d = db();
  d.prepare("INSERT INTO admin_sessions (token, created_at) VALUES (?, ?)").run(token, now);
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return token;
}

export async function clearAdminSession() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (token) {
    db().prepare("DELETE FROM admin_sessions WHERE token = ?").run(token);
  }
  jar.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
}


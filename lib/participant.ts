import { cookies } from "next/headers";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { allImages, generateSmartOrder } from "@/lib/images";

const PARTICIPANT_COOKIE = "participant_id";

export type ParticipantRow = {
  id: string;
  username: string | null;
  created_at: number;
  last_seen_at: number;
  image_order_json: string;
};

function newId() {
  return crypto.randomUUID();
}

export async function getOrCreateParticipantId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(PARTICIPANT_COOKIE)?.value;
  if (existing) return existing;

  const id = newId();
  jar.set(PARTICIPANT_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return id;
}

export async function ensureParticipant(participantId: string): Promise<ParticipantRow> {
  const now = Date.now();
  const d = await db();

  const selectRes = await d.execute({
    sql: "SELECT id, username, created_at, last_seen_at, image_order_json FROM participants WHERE id = ?",
    args: [participantId],
  });
  const select = (selectRes.rows[0] as unknown as ParticipantRow | undefined) ?? undefined;

  if (select) {
    await d.execute({
      sql: "UPDATE participants SET last_seen_at = ? WHERE id = ?",
      args: [now, participantId],
    });
    return { ...select, last_seen_at: now };
  }

  const images = allImages();
  const order = generateSmartOrder(images);
  const row: ParticipantRow = {
    id: participantId,
    username: null,
    created_at: now,
    last_seen_at: now,
    image_order_json: JSON.stringify(order),
  };

  await d.execute({
    sql: "INSERT INTO participants (id, username, created_at, last_seen_at, image_order_json) VALUES (?, ?, ?, ?, ?)",
    args: [row.id, row.username, row.created_at, row.last_seen_at, row.image_order_json],
  });

  return row;
}

export async function setParticipantUsername(participantId: string, username: string) {
  const d = await db();
  await d.execute({
    sql: "UPDATE participants SET username = ? WHERE id = ?",
    args: [username, participantId],
  });
}

export async function getRatingsMap(participantId: string): Promise<Record<string, number>> {
  const d = await db();
  const res = await d.execute({
    sql: "SELECT image_id, rating FROM ratings WHERE participant_id = ?",
    args: [participantId],
  });

  const map: Record<string, number> = {};
  for (const r of res.rows as unknown as { image_id: string; rating: number }[]) map[r.image_id] = r.rating;
  return map;
}

export function firstUnratedIndex(order: string[], ratings: Record<string, number>) {
  for (let i = 0; i < order.length; i++) {
    const id = order[i]!;
    if (!ratings[id]) return i;
  }
  return order.length;
}


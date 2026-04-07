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

export function ensureParticipant(participantId: string): ParticipantRow {
  const now = Date.now();
  const d = db();

  const select = d
    .prepare(
      "SELECT id, username, created_at, last_seen_at, image_order_json FROM participants WHERE id = ?"
    )
    .get(participantId) as ParticipantRow | undefined;

  if (select) {
    d.prepare("UPDATE participants SET last_seen_at = ? WHERE id = ?").run(
      now,
      participantId
    );
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

  d.prepare(
    "INSERT INTO participants (id, username, created_at, last_seen_at, image_order_json) VALUES (?, ?, ?, ?, ?)"
  ).run(row.id, row.username, row.created_at, row.last_seen_at, row.image_order_json);

  return row;
}

export function setParticipantUsername(participantId: string, username: string) {
  const d = db();
  d.prepare("UPDATE participants SET username = ? WHERE id = ?").run(username, participantId);
}

export function getRatingsMap(participantId: string): Record<string, number> {
  const d = db();
  const rows = d
    .prepare("SELECT image_id, rating FROM ratings WHERE participant_id = ?")
    .all(participantId) as { image_id: string; rating: number }[];

  const map: Record<string, number> = {};
  for (const r of rows) map[r.image_id] = r.rating;
  return map;
}

export function firstUnratedIndex(order: string[], ratings: Record<string, number>) {
  for (let i = 0; i < order.length; i++) {
    const id = order[i]!;
    if (!ratings[id]) return i;
  }
  return order.length;
}


import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateParticipantId, ensureParticipant, getRatingsMap } from "@/lib/participant";

export const runtime = "nodejs";

const BodySchema = z.object({
  imageId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
});

export async function POST(req: Request) {
  const participantId = await getOrCreateParticipantId();
  ensureParticipant(participantId);

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { imageId, rating } = parsed.data;
  const now = Date.now();
  const d = db();

  d.prepare(
    `
      INSERT INTO ratings (participant_id, image_id, rating, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(participant_id, image_id)
      DO UPDATE SET rating = excluded.rating, updated_at = excluded.updated_at
    `
  ).run(participantId, imageId, rating, now, now);

  const participant = d
    .prepare("SELECT image_order_json FROM participants WHERE id = ?")
    .get(participantId) as { image_order_json: string } | undefined;

  const order = participant ? (JSON.parse(participant.image_order_json) as string[]) : [];
  const ratingsMap = getRatingsMap(participantId);

  const isFinished = order.length > 0 && Object.keys(ratingsMap).length >= order.length;
  // Email sending is intentionally disabled by default.
  // If you want it later, set EMAIL_ENABLED=true and configure SMTP env vars,
  // then re-enable the call to maybeSendCompletionEmail().

  return NextResponse.json({ ok: true, isFinished });
}


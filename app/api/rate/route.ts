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
  await ensureParticipant(participantId);

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { imageId, rating } = parsed.data;
  const now = Date.now();
  const d = await db();

  await d.execute({
    sql: `
      INSERT INTO ratings (participant_id, image_id, rating, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(participant_id, image_id)
      DO UPDATE SET rating = excluded.rating, updated_at = excluded.updated_at
    `,
    args: [participantId, imageId, rating, now, now],
  });

  const participantRes = await d.execute({
    sql: "SELECT image_order_json FROM participants WHERE id = ?",
    args: [participantId],
  });
  const participant = (participantRes.rows[0] as unknown as { image_order_json: string } | undefined) ?? undefined;

  const order = participant ? (JSON.parse(participant.image_order_json) as string[]) : [];
  const ratingsMap = await getRatingsMap(participantId);

  const isFinished = order.length > 0 && Object.keys(ratingsMap).length >= order.length;
  // Email sending is intentionally disabled by default.
  // If you want it later, set EMAIL_ENABLED=true and configure SMTP env vars,
  // then re-enable the call to maybeSendCompletionEmail().

  return NextResponse.json({ ok: true, isFinished });
}


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

  try {
    const existingRes = await d.execute({
      sql: "SELECT created_at FROM ratings WHERE participant_id = ? AND image_id = ?",
      args: [participantId, imageId],
    });
    const hasExisting = existingRes.rows.length > 0;

    if (hasExisting) {
      // A "re-vote" is any POST for an image that was already rated before.
      const last5Res = await d.execute({
        sql: "SELECT image_id FROM ratings WHERE participant_id = ? ORDER BY updated_at DESC LIMIT ?",
        args: [participantId, 5],
      });
      const last5Set = new Set((last5Res.rows as unknown as { image_id: string }[]).map((r) => r.image_id));

      if (!last5Set.has(imageId)) {
        return NextResponse.json(
          { error: "Re-vote is allowed only for the last 5 voted photos." },
          { status: 403 }
        );
      }

      const alreadyRevotedRes = await d.execute({
        sql: "SELECT 1 FROM revote_history WHERE participant_id = ? AND image_id = ?",
        args: [participantId, imageId],
      });
      const alreadyRevoted = alreadyRevotedRes.rows.length > 0;

      if (!alreadyRevoted) {
        const countRes = await d.execute({
          sql: "SELECT COUNT(*) AS cnt FROM revote_history WHERE participant_id = ?",
          args: [participantId],
        });
        const countRow = countRes.rows[0] as unknown as { cnt?: number } | undefined;
        const revoteCount = Number(countRow?.cnt ?? 0);
        if (revoteCount >= 3) {
          return NextResponse.json(
            { error: "You can re-vote at most 3 distinct photos in this 100-photo run." },
            { status: 403 }
          );
        }

        await d.execute({
          sql: `
            INSERT INTO revote_history (participant_id, image_id, created_at)
            VALUES (?, ?, ?)
            ON CONFLICT(participant_id, image_id) DO NOTHING
          `,
          args: [participantId, imageId, now],
        });
      }
    }

    await d.execute({
      sql: `
        INSERT INTO ratings (participant_id, image_id, rating, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(participant_id, image_id)
        DO UPDATE SET rating = excluded.rating, updated_at = excluded.updated_at
      `,
      args: [participantId, imageId, rating, now, now],
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save rating" },
      { status: 500 }
    );
  }

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


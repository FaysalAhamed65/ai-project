import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureParticipant, getOrCreateParticipantId, setParticipantUsername } from "@/lib/participant";

export const runtime = "nodejs";

const BodySchema = z.object({
  username: z.string().trim().min(2).max(40),
});

export async function POST(req: Request) {
  const participantId = await getOrCreateParticipantId();
  ensureParticipant(participantId);

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  setParticipantUsername(participantId, parsed.data.username);
  return NextResponse.json({ ok: true });
}


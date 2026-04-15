import { NextResponse } from "next/server";
import { clearParticipantCookie } from "@/lib/participant";

export const runtime = "nodejs";

export async function POST() {
  await clearParticipantCookie();
  return NextResponse.json({ ok: true });
}


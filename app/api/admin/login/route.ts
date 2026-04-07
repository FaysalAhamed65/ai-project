import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSessionOrThrow } from "@/lib/adminAuth";

export const runtime = "nodejs";

const BodySchema = z.object({
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    await createAdminSessionOrThrow(parsed.data.password);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }
}


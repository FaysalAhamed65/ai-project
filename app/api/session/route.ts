import { NextResponse } from "next/server";
import { allImages } from "@/lib/images";
import {
  ensureParticipant,
  firstUnratedIndex,
  getOrCreateParticipantId,
  getRatingsMap,
} from "@/lib/participant";

export const runtime = "nodejs";

function parseCursor(url: string) {
  try {
    const u = new URL(url);
    const raw = u.searchParams.get("cursor");
    if (raw === null) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.floor(n));
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const participantId = await getOrCreateParticipantId();
  const participant = await ensureParticipant(participantId);

  const images = allImages();
  const imagesById = new Map(images.map((i) => [i.id, i]));
  const order = JSON.parse(participant.image_order_json) as string[];
  const ratings = await getRatingsMap(participantId);

  const completed = Object.keys(ratings).length;
  const cursor = parseCursor(req.url);
  const startIndex = cursor ?? firstUnratedIndex(order, ratings);
  const pageStart = Math.min(startIndex, order.length);
  const pageSize = 1;
  const pageEnd = Math.min(pageStart + pageSize, order.length);
  const pageIds = order.slice(pageStart, pageEnd);

  const pageImages = pageIds
    .map((id) => imagesById.get(id))
    .filter(Boolean)
    .map((img) => ({
      ...img!,
      rating: ratings[img!.id] ?? null,
    }));

  return NextResponse.json({
    participantId,
    total: order.length,
    completed,
    pageStart,
    pageSize,
    images: pageImages,
    isFinished: order.length > 0 && completed >= order.length,
  });
}


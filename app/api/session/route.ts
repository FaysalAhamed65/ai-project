import { NextResponse } from "next/server";
import { allImages } from "@/lib/images";
import {
  ensureParticipant,
  firstUnratedIndex,
  getOrCreateParticipantId,
  getRatingsMap,
} from "@/lib/participant";

export const runtime = "nodejs";

export async function GET() {
  const participantId = await getOrCreateParticipantId();
  const participant = await ensureParticipant(participantId);

  const images = allImages();
  const imagesById = new Map(images.map((i) => [i.id, i]));
  const order = JSON.parse(participant.image_order_json) as string[];
  const ratings = await getRatingsMap(participantId);

  const startIndex = firstUnratedIndex(order, ratings);
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
    completed: Object.keys(ratings).length,
    pageStart,
    pageSize,
    images: pageImages,
    isFinished: pageStart >= order.length,
  });
}


import { NextResponse } from "next/server";
import { allImages } from "@/lib/images";
import {
  ensureParticipant,
  firstUnratedIndex,
  getOrCreateParticipantId,
  getRatingsMap,
  getLastVotedImageIds,
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
  const firstUnrated = firstUnratedIndex(order, ratings);
  let startIndex = cursor ?? firstUnrated;

  // Enforce: a user can see only the last 5 voted photos when navigating backwards.
  if (cursor !== null) {
    const requestedId = order[cursor];
    const requestedRating = requestedId ? ratings[requestedId] : undefined;

    // If the requested cursor points to a rated photo, require it to be within the last 5 votes.
    if (requestedId && typeof requestedRating === "number") {
      const last5 = await getLastVotedImageIds(participantId, 5);
      const last5Set = new Set(last5);

      if (!last5Set.has(requestedId)) {
        const allowedIndices = last5
          .map((id) => order.indexOf(id))
          .filter((i) => Number.isFinite(i) && i >= 0)
          .sort((a, b) => a - b);

        const nearestLeq = allowedIndices.filter((i) => i <= cursor).sort((a, b) => b - a)[0];
        startIndex = nearestLeq ?? allowedIndices[0]!;
      }
    }
  }

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


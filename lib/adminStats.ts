import { allImages } from "@/lib/images";
import { db } from "@/lib/db";

export type RatingBucket = { rating: number; count: number };

export type ImageStats = {
  id: string;
  label: string;
  src: string;
  celebId: string;
  totalRatings: number;
  average: number | null;
  buckets: RatingBucket[];
};

export async function computeAdminStats() {
  const d = await db();
  const images = allImages();

  const totalParticipantsRes = await d.execute("SELECT COUNT(*) as c FROM participants");
  const totalRatingsRes = await d.execute("SELECT COUNT(*) as c FROM ratings");
  const completedParticipantsRes = await d.execute("SELECT COUNT(*) as c FROM completion_emails");

  const totalParticipantsRow = totalParticipantsRes.rows[0] as unknown as { c?: number } | undefined;
  const totalRatingsRow = totalRatingsRes.rows[0] as unknown as { c?: number } | undefined;
  const completedParticipantsRow = completedParticipantsRes.rows[0] as unknown as { c?: number } | undefined;

  const totalParticipants = Number(totalParticipantsRow?.c ?? 0);
  const totalRatings = Number(totalRatingsRow?.c ?? 0);
  const completedParticipants = Number(completedParticipantsRow?.c ?? 0);

  const participantsRes = await d.execute(
    "SELECT id, username, created_at, last_seen_at FROM participants ORDER BY created_at DESC"
  );
  const participantsList = participantsRes.rows as unknown as {
    id: string;
    username: string | null;
    created_at: number;
    last_seen_at: number;
  }[];

  const allRatingsRes = await d.execute(
    "SELECT participant_id, image_id, rating, updated_at FROM ratings ORDER BY updated_at ASC"
  );
  const allRatings = allRatingsRes.rows as unknown as {
    participant_id: string;
    image_id: string;
    rating: number;
    updated_at: number;
  }[];

  const ratingsByParticipant = new Map<string, { imageId: string; rating: number; updatedAt: number }[]>();
  for (const r of allRatings) {
    const list = ratingsByParticipant.get(r.participant_id) || [];
    list.push({ imageId: r.image_id, rating: Number(r.rating), updatedAt: Number(r.updated_at) });
    ratingsByParticipant.set(r.participant_id, list);
  }

  const participants = participantsList.map((p) => ({
    id: p.id,
    username: p.username,
    created_at: p.created_at,
    last_seen_at: p.last_seen_at,
    ratings: ratingsByParticipant.get(p.id) || [],
  }));

  const rowsRes = await d.execute(`
    SELECT image_id, rating, COUNT(*) as c
    FROM ratings
    GROUP BY image_id, rating
  `);
  const rows = rowsRes.rows as unknown as { image_id: string; rating: number; c: number }[];

  const byImage = new Map<string, Map<number, number>>();
  for (const r of rows) {
    const m = byImage.get(r.image_id) ?? new Map<number, number>();
    m.set(Number(r.rating), Number(r.c));
    byImage.set(r.image_id, m);
  }

  const perImage: ImageStats[] = images.map((img) => {
    const m = byImage.get(img.id) ?? new Map<number, number>();
    const buckets = [1, 2, 3, 4, 5].map((rating) => ({ rating, count: m.get(rating) ?? 0 }));
    const total = buckets.reduce((acc, b) => acc + b.count, 0);
    const sum = buckets.reduce((acc, b) => acc + b.rating * b.count, 0);
    const avg = total > 0 ? sum / total : null;
    return {
      id: img.id,
      label: img.label,
      src: img.src,
      celebId: img.celebId,
      totalRatings: total,
      average: avg,
      buckets,
    };
  });

  const unrated = perImage.filter((i) => i.totalRatings === 0);

  return {
    totals: { totalParticipants, totalRatings, completedParticipants, unratedCount: unrated.length },
    participants,
    images: perImage,
    unrated,
  };
}


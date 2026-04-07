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

  const totalParticipants = Number((totalParticipantsRes.rows[0] as any)?.c ?? 0);
  const totalRatings = Number((totalRatingsRes.rows[0] as any)?.c ?? 0);
  const completedParticipants = Number((completedParticipantsRes.rows[0] as any)?.c ?? 0);

  const participantsRes = await d.execute(
    "SELECT id, username, created_at, last_seen_at FROM participants ORDER BY created_at DESC"
  );
  const participants = participantsRes.rows as unknown as {
    id: string;
    username: string | null;
    created_at: number;
    last_seen_at: number;
  }[];

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


import imagesRaw from "@/data/images.json";
import { z } from "zod";

export const ImageItemSchema = z.object({
  id: z.string().min(1),
  celebId: z.string().min(1),
  src: z.string().min(1),
  label: z.string().min(1),
});

export type ImageItem = z.infer<typeof ImageItemSchema>;

const ImagesSchema = z.array(ImageItemSchema).min(1);

export function allImages(): ImageItem[] {
  return ImagesSchema.parse(imagesRaw);
}

function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Creates an order of the images with the constraint:
 * - no two consecutive images share the same celebId
 */
export function generateSmartOrder(images: ImageItem[]): string[] {
  const byCeleb = new Map<string, ImageItem[]>();
  for (const img of images) {
    const bucket = byCeleb.get(img.celebId) ?? [];
    bucket.push(img);
    byCeleb.set(img.celebId, bucket);
  }

  for (const bucket of byCeleb.values()) shuffleInPlace(bucket);

  const celebIds = Array.from(byCeleb.keys());
  const maxTries = 250;

  for (let attempt = 0; attempt < maxTries; attempt++) {
    const remaining = new Map<string, ImageItem[]>();
    for (const [k, v] of byCeleb.entries()) remaining.set(k, [...v]);

    const order: string[] = [];
    let lastCeleb: string | null = null;

    while (order.length < images.length) {
      const options = celebIds
        .filter((c) => c !== lastCeleb && (remaining.get(c)?.length ?? 0) > 0)
        .sort(() => Math.random() - 0.5);

      if (options.length === 0) break;

      const pick = options[0]!;
      const bucket = remaining.get(pick)!;
      const next = bucket.pop()!;
      order.push(next.id);
      lastCeleb = pick;
    }

    if (order.length === images.length) return order;
  }

  // Fallback: random shuffle without guarantee (should be very rare).
  const ids = images.map((i) => i.id);
  shuffleInPlace(ids);
  return ids;
}


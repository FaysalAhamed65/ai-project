import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { allImages } from "@/lib/images";

export const runtime = "nodejs";

type CompletionArgs = {
  participantId: string;
};

function env(name: string) {
  return process.env[name];
}

function canSendEmail() {
  return Boolean(
    env("SMTP_HOST") &&
      env("SMTP_PORT") &&
      env("SMTP_USER") &&
      env("SMTP_PASS") &&
      env("ADMIN_EMAIL")
  );
}

function transporter() {
  return nodemailer.createTransport({
    host: env("SMTP_HOST"),
    port: Number(env("SMTP_PORT")),
    secure: env("SMTP_SECURE") === "true",
    auth: {
      user: env("SMTP_USER"),
      pass: env("SMTP_PASS"),
    },
  });
}

export async function maybeSendCompletionEmail({ participantId }: CompletionArgs) {
  if (!canSendEmail()) return { sent: false, reason: "missing_env" as const };

  const d = db();
  const already = d
    .prepare("SELECT participant_id FROM completion_emails WHERE participant_id = ?")
    .get(participantId) as { participant_id: string } | undefined;
  if (already) return { sent: false, reason: "already_sent" as const };

  const images = allImages();
  const imgById = new Map(images.map((i) => [i.id, i]));
  const ratings = d
    .prepare("SELECT image_id, rating FROM ratings WHERE participant_id = ? ORDER BY image_id")
    .all(participantId) as { image_id: string; rating: number }[];

  const lines = ratings.map((r) => {
    const img = imgById.get(r.image_id);
    const label = img?.label ?? r.image_id;
    return `${label}: ${r.rating}/5`;
  });

  const subject = `Photo rating completed: ${participantId}`;
  const text = [
    `Participant: ${participantId}`,
    "",
    `Total ratings: ${ratings.length}`,
    "",
    ...lines,
  ].join("\n");

  const from = env("SMTP_FROM") || env("SMTP_USER")!;
  const to = env("ADMIN_EMAIL")!;

  await transporter().sendMail({ from, to, subject, text });

  d.prepare("INSERT INTO completion_emails (participant_id, sent_at) VALUES (?, ?)").run(
    participantId,
    Date.now()
  );

  return { sent: true as const };
}


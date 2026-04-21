# Photo Rating Study (Next.js)

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Add your 250 photos

Put your images under `public/images_face/` (recommended structure matches `data/images.json`):

- `public/images_face/celeb01/01.jpg` … `05.jpg`
- …
- `public/images_face/celeb50/01.jpg` … `05.jpg`

If you use different filenames/paths, update `data/images.json` accordingly.

## Admin dashboard

- URL: `/admin`

## Email results (Nodemailer)

Copy `.env.example` to `.env.local` and fill:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`
- `SMTP_USER`, `SMTP_PASS`
- `SMTP_FROM` (optional)
- `ADMIN_EMAIL`

When a participant completes all 250 ratings, the app emails their ratings to `ADMIN_EMAIL` (sent once per participant).

## Data storage

SQLite DB is stored at `data/app.db` (created automatically).

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

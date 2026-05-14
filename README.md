# SVIT ERP Mobile App

Mobile-first SVIT student ERP built with Next.js route handlers and a Capacitor native wrapper. The native apps load the deployed HTTPS Next.js app because login, ERP scraping, Supabase, and marketplace APIs all require the server runtime.

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

## Native Wrapper

Set the deployed app URL before syncing Capacitor:

```bash
set CAPACITOR_SERVER_URL=https://your-deployed-next-app.example.com
npm run cap:sync
npm run cap:android
```

On macOS with Xcode, `npm run cap:ios` opens the iOS project.

The app intentionally opens to `/` for login first. After login, the dashboard runs inside the shared mobile shell with bottom navigation.

Environment values are documented in `.env.example`. Supabase values use `NEXT_PUBLIC_` because the realtime client runs in the browser.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Hello World

COMS E6998 - Design for Generative AI

A Next.js app deployed on Vercel.

- **Week 1:** `/` renders Hello World.
- **Week 2:** `/jokes` reads rows from a Supabase `jokes` table and renders them as cards.
- **Week 3:** `/profile` is a protected, members-only page behind Google sign-in.
  The Sign in with Google button posts an ID token to `/auth/callback`, which
  exchanges it for a Supabase session using `@supabase/ssr`. No Google client
  secret is needed.
- **Week 4:** the Caption Arena. Signed-in users upload a photo at `/upload`;
  a two-step prompt chain (Claude describes the image, then Claude writes
  captions from that description) stores the image in Supabase Storage and
  the captions in Postgres. Everyone can browse `/gallery`; signed-in users
  vote captions up or down, and each vote is a row in the `votes` table.
  Every table has row level security; votes are readable only by their owner
  and totals come from an aggregate view.

## Setup

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql)
   and then [`supabase/week4.sql`](supabase/week4.sql) in the SQL Editor.
2. Create a Google OAuth 2.0 client (Web application). Add the app origin to
   *Authorized JavaScript origins* and `<origin>/auth/callback` to
   *Authorized redirect URIs*.
3. In Supabase, enable the Google auth provider and paste the Client ID.
4. Create an Anthropic API key.
5. Copy `.env.example` to `.env.local` and fill in all four variables.
6. Add the same variables to the Vercel project.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

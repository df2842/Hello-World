# Hello World

COMS E6998 - Design for Generative AI

A Next.js app deployed on Vercel.

- **Week 1:** `/` renders Hello World.
- **Week 2:** `/jokes` reads rows from a Supabase `jokes` table and renders them as cards.
- **Week 3:** `/profile` is a protected, members-only page behind Google sign-in.
  The Sign in with Google button posts an ID token to `/auth/callback`, which
  exchanges it for a Supabase session using `@supabase/ssr`. No Google client
  secret is needed.

## Setup

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in the SQL Editor.
2. Create a Google OAuth 2.0 client (Web application). Add the app origin to
   *Authorized JavaScript origins* and `<origin>/auth/callback` to
   *Authorized redirect URIs*.
3. In Supabase, enable the Google auth provider and paste the Client ID.
4. Copy `.env.example` to `.env.local` and fill in all three variables.
5. Add the same variables to the Vercel project.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

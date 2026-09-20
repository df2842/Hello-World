# Hello World

COMS E6998 - Design for Generative AI

A Next.js app deployed on Vercel.

- **Week 1:** `/` renders Hello World.
- **Week 2:** `/jokes` reads rows from a Supabase `jokes` table and renders them as cards.

## Setup

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in the SQL Editor.
2. Copy `.env.example` to `.env.local` and fill in the project URL and anon key.
3. Add the same two variables to the Vercel project.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

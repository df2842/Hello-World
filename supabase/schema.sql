-- Week 2: jokes table read by /jokes.
-- Run this once in the Supabase SQL Editor.

create table if not exists public.jokes (
  id bigint generated always as identity primary key,
  setup text not null,
  punchline text not null,
  category text not null default 'general',
  created_at timestamptz not null default now()
);

-- The anon key is public, so lock the table down to read-only access.
alter table public.jokes enable row level security;

drop policy if exists "Public can read jokes" on public.jokes;
create policy "Public can read jokes"
  on public.jokes for select
  to anon, authenticated
  using (true);

insert into public.jokes (setup, punchline, category) values
  ('Why do programmers prefer dark mode?', 'Because light attracts bugs.', 'programming'),
  ('Why did the developer go broke?', 'Because they used up all their cache.', 'programming'),
  ('How many programmers does it take to change a light bulb?', 'None. That is a hardware problem.', 'programming'),
  ('Why was the database administrator kicked out of the bar?', 'They kept trying to join the tables.', 'databases'),
  ('What is a database''s favorite kind of relationship?', 'One to many.', 'databases'),
  ('Why did the neural network break up with the decision tree?', 'It needed someone with more depth.', 'ai'),
  ('Why did the language model bring a ladder to work?', 'It heard the job needed higher-level reasoning.', 'ai'),
  ('I would tell you a UDP joke,', 'but you might not get it.', 'networking');

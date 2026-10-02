-- Week 4: images, captions and votes.
-- Run this once in the Supabase SQL Editor (after schema.sql from Week 2).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  storage_path text not null unique,
  public_url text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.captions (
  id uuid primary key default gen_random_uuid(),
  image_id uuid not null references public.images (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text text not null,
  model text,
  created_at timestamptz not null default now()
);

create table if not exists public.votes (
  id bigint generated always as identity primary key,
  caption_id uuid not null references public.captions (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (caption_id, user_id)
);

create index if not exists captions_image_id_idx on public.captions (image_id);
create index if not exists votes_caption_id_idx on public.votes (caption_id);
create index if not exists images_created_at_idx on public.images (created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security: strictest rules that still let the app work.
--   * Anyone can view images and captions (the gallery is public).
--   * Only the signed-in uploader can insert / delete their images & captions.
--   * Votes: a user can only see, cast, change or remove their OWN votes.
--     Totals are exposed through the aggregate view below, never raw rows.
-- ---------------------------------------------------------------------------
alter table public.images   enable row level security;
alter table public.captions enable row level security;
alter table public.votes    enable row level security;

drop policy if exists "Anyone can view images" on public.images;
create policy "Anyone can view images"
  on public.images for select to anon, authenticated using (true);

drop policy if exists "Users insert their own images" on public.images;
create policy "Users insert their own images"
  on public.images for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users delete their own images" on public.images;
create policy "Users delete their own images"
  on public.images for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Anyone can view captions" on public.captions;
create policy "Anyone can view captions"
  on public.captions for select to anon, authenticated using (true);

drop policy if exists "Users insert captions for their own images" on public.captions;
create policy "Users insert captions for their own images"
  on public.captions for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.images i where i.id = image_id and i.user_id = auth.uid())
  );

drop policy if exists "Users delete their own captions" on public.captions;
create policy "Users delete their own captions"
  on public.captions for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Users view their own votes" on public.votes;
create policy "Users view their own votes"
  on public.votes for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users cast their own votes" on public.votes;
create policy "Users cast their own votes"
  on public.votes for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users change their own votes" on public.votes;
create policy "Users change their own votes"
  on public.votes for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users remove their own votes" on public.votes;
create policy "Users remove their own votes"
  on public.votes for delete to authenticated using (auth.uid() = user_id);

-- Aggregate scores. The view runs as its owner so it can total votes that the
-- caller is not allowed to read row-by-row; it exposes only counts.
create or replace view public.caption_scores
  with (security_invoker = false) as
select
  c.id as caption_id,
  coalesce(sum(v.value), 0)::int as score,
  count(*) filter (where v.value = 1)::int as upvotes,
  count(*) filter (where v.value = -1)::int as downvotes
from public.captions c
left join public.votes v on v.caption_id = c.id
group by c.id;

grant select on public.caption_scores to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: public "images" bucket. Users may upload only into a folder named
-- after their own user id; anyone can read.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 6291456, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view uploaded images" on storage.objects;
create policy "Anyone can view uploaded images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'images');

drop policy if exists "Users upload into their own folder" on storage.objects;
create policy "Users upload into their own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete their own uploads" on storage.objects;
create policy "Users delete their own uploads"
  on storage.objects for delete to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);

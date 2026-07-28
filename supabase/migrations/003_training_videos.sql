-- Training videos. Deliberately a table rather than a Drive mirror: these are
-- a handful of links to Loom/YouTube/Drive, not a folder of files, and there's
-- no folder that would serve as a source of truth for them.

create table if not exists public.training_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  description text,
  -- Free-text grouping label. Matching a Drive module name (e.g.
  -- "2 - Crowd Cloud") sits the video with that module's handouts.
  module text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_by uuid references public.certified_framers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_videos_module_idx
  on public.training_videos (module, sort_order);

alter table public.training_videos enable row level security;

create policy "Certified framers view published videos"
  on public.training_videos for select
  to authenticated
  using (
    (is_published = true and public.current_framer_id() is not null)
    or public.is_portal_admin()
  );

create policy "Admins manage videos"
  on public.training_videos for all
  to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

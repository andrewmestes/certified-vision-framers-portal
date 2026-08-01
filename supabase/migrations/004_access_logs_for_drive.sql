-- resource_access_logs was built for the original resources-table design
-- (resource_id was a uuid FK into `resources`). The portal has since moved
-- to live Drive mirrors for handouts, books, and the facilitator guide, none
-- of which have rows in `resources` — so that FK can never be satisfied and
-- nothing has ever written to this table. Safe to drop and rebuild for the
-- shape the app actually needs: a Drive file id (text, not a local uuid), a
-- denormalized name (so a log entry still reads fine after a file is renamed
-- or removed from Drive), and which surface it was opened from.

drop table if exists public.resource_access_logs cascade;

create table public.resource_access_logs (
  id uuid primary key default gen_random_uuid(),
  framer_id uuid not null references public.certified_framers(id) on delete cascade,
  source text not null check (source in ('library', 'books', 'guide')),
  resource_id text not null,
  resource_name text not null,
  module text,
  accessed_at timestamptz not null default now()
);

create index resource_access_logs_framer_idx
  on public.resource_access_logs (framer_id);
create index resource_access_logs_accessed_at_idx
  on public.resource_access_logs (accessed_at desc);

alter table public.resource_access_logs enable row level security;

create policy "Admins view access logs"
  on public.resource_access_logs for select
  to authenticated
  using (public.is_portal_admin());

create policy "Framers log own access"
  on public.resource_access_logs for insert
  to authenticated
  with check (framer_id = public.current_framer_id());

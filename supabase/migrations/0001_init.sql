-- Sitemap tool schema. Run in the Supabase SQL editor (or `supabase db push`).
--
-- Access model:
--   * The owner (you) signs in with Supabase Auth and reads/writes their own rows via RLS.
--   * Clients never get a Supabase session. The share page and comment API run on the
--     server with the service-role key and look the project up by its secret share_token.
--   * No policy is granted to `anon`, so the public API key can read nothing.

create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 200),
  brief         text not null default '' check (char_length(brief) <= 4000),
  -- { pages: [{ id, name, slug, parentId, sections: [{ id, type, description }] }] }
  tree          jsonb not null default '{"pages":[]}'::jsonb,
  -- 64 hex chars of randomness; the only thing a client needs to open the shared view.
  share_token   text not null unique
                default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  share_enabled boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index projects_owner_idx on public.projects (owner_id, updated_at desc);

create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  -- ids come from the tree JSON, so there is no FK; orphaned comments are harmless.
  page_id     text not null check (char_length(page_id) <= 64),
  section_id  text check (char_length(section_id) <= 64),
  parent_id   uuid references public.comments (id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 80),
  body        text not null check (char_length(body) between 1 and 2000),
  by_owner    boolean not null default false,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index comments_project_idx on public.comments (project_id, created_at);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();

alter table public.projects enable row level security;
alter table public.comments enable row level security;

create policy "owner reads own projects" on public.projects
  for select to authenticated using (owner_id = auth.uid());
create policy "owner creates own projects" on public.projects
  for insert to authenticated with check (owner_id = auth.uid());
create policy "owner updates own projects" on public.projects
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner deletes own projects" on public.projects
  for delete to authenticated using (owner_id = auth.uid());

create policy "owner reads comments on own projects" on public.comments
  for select to authenticated using (
    exists (select 1 from public.projects p where p.id = comments.project_id and p.owner_id = auth.uid())
  );
create policy "owner replies on own projects" on public.comments
  for insert to authenticated with check (
    by_owner = true and
    exists (select 1 from public.projects p where p.id = comments.project_id and p.owner_id = auth.uid())
  );
create policy "owner resolves comments on own projects" on public.comments
  for update to authenticated using (
    exists (select 1 from public.projects p where p.id = comments.project_id and p.owner_id = auth.uid())
  );
create policy "owner deletes comments on own projects" on public.comments
  for delete to authenticated using (
    exists (select 1 from public.projects p where p.id = comments.project_id and p.owner_id = auth.uid())
  );

-- Supabase schema for Chris Mission Desk

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  status text not null default 'ready',
  priority text not null default 'medium',
  tags text[] default array[]::text[],
  due_at timestamptz,
  progress int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_priority_idx on public.tasks(priority);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete set null,
  headline text not null,
  details text,
  actor text not null default 'Agent',
  occurred_at timestamptz not null default timezone('utc', now())
);

create index if not exists activity_log_occurred_at_idx on public.activity_log(occurred_at desc);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz,
  source text default 'manual'
);

create index if not exists events_start_at_idx on public.events(start_at);

-- Seed helpers --------------------------------------------------------------
insert into public.tasks (slug, title, description, status, priority, tags, due_at, progress)
values
  ('ops-231', 'Dashboard MVP', 'UI polish + Supabase schema', 'in-progress', 'high', '{Product,Dev}', timezone('utc', now()) + interval '1 hour', 62),
  ('ops-227', 'Calendar sync', 'iCloud blocks + routines', 'blocked', 'medium', '{Automation}', timezone('utc', now()) + interval '10 hours', 25),
  ('ops-198', 'Briefing cron', '6:00 daily digest', 'ready', 'low', '{Ops}', null, 0)
  on conflict (slug) do nothing;

insert into public.activity_log (task_id, headline, details, actor, occurred_at)
select t.id, 'UI scaffolding', 'Next.js + Tailwind ready', 'Agent', timezone('utc', now()) - interval '10 minutes'
from public.tasks t where t.slug = 'ops-231'
on conflict do nothing;

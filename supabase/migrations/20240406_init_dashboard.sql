begin;

-- Core tables
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  status text not null default 'ready',
  priority text not null default 'medium',
  tags text[] default array[]::text[],
  due_at timestamptz,
  progress int not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete set null,
  headline text not null,
  details text,
  actor text not null default 'Agent',
  occurred_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz,
  source text default 'manual'
);

-- Indexes
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_priority_idx on public.tasks(priority);
create index if not exists activity_log_occurred_at_idx on public.activity_log(occurred_at desc);
create index if not exists events_start_at_idx on public.events(start_at);

commit;

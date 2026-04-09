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

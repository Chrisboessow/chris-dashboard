import { getSupabaseServerClient } from "@/lib/supabase-server";
import { createTask, logAgentMessage, updateTaskProgress } from "./actions";

const navLinks = [
  { label: "Dashboard", emoji: "⌁", active: true },
  { label: "Projects", emoji: "✱", active: false },
  { label: "Tasks", emoji: "▣", active: false },
  { label: "Automations", emoji: "∞", active: false },
  { label: "Files", emoji: "⧉", active: false },
  { label: "Support", emoji: "?", active: false },
];

const quickActions = [
  { label: "New task", hint: "⇧ + N" },
  { label: "Sync calendars", hint: "⌘ + K" },
  { label: "Open automations", hint: "A" },
];

const workspaceTabs = ["Overview", "Command", "Launchpad", "Insights"];

const statusMap = {
  ready: "text-emerald-300 bg-emerald-400/10",
  "in-progress": "text-sky-300 bg-sky-400/10",
  blocked: "text-rose-300 bg-rose-400/10",
};

const priorityChip = {
  high: "text-rose-200 border-rose-500/40",
  medium: "text-amber-200 border-amber-500/40",
  low: "text-emerald-200 border-emerald-500/40",
} as const;

type Status = keyof typeof statusMap;
type Priority = keyof typeof priorityChip;

type TaskCard = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  due: string;
  tags: string[];
  progress: number;
};

type ActivityEntry = {
  time: string;
  event: string;
  detail: string;
  actor: string;
};

type ScheduleSlot = {
  time: string;
  title: string;
  description: string;
};

const fallbackTasks: TaskCard[] = [
  {
    id: "OPS-231",
    slug: "ops-231",
    title: "Dashboard MVP",
    description: "UI polish + Supabase schema",
    status: "in-progress",
    priority: "high",
    due: "Heute · 23:55",
    tags: ["Product", "Dev"],
    progress: 62,
  },
  {
    id: "OPS-227",
    slug: "ops-227",
    title: "Calendar sync",
    description: "iCloud blocks + routines",
    status: "blocked",
    priority: "medium",
    due: "Morgen · 08:00",
    tags: ["Automation"],
    progress: 25,
  },
  {
    id: "OPS-198",
    slug: "ops-198",
    title: "Briefing cron",
    description: "6:00 daily digest",
    status: "ready",
    priority: "low",
    due: "Backlog",
    tags: ["Ops"],
    progress: 0,
  },
];

const fallbackActivity: ActivityEntry[] = [
  {
    time: "22:48",
    event: "UI scaffolding",
    detail: "Next.js + Tailwind + theme ready",
    actor: "Agent",
  },
  {
    time: "22:36",
    event: "Scope confirmed",
    detail: "Deadline 00:00 · MVP spec locked",
    actor: "Chris",
  },
  {
    time: "22:30",
    event: "Live-call alt",
    detail: "Switch to async build mode",
    actor: "Agent",
  },
];

const fallbackSchedule: ScheduleSlot[] = [
  {
    time: "08:30",
    title: "Product sync",
    description: "Draft agenda + assets",
  },
  {
    time: "11:00",
    title: "Content sprint",
    description: "Outline + assign briefs",
  },
  {
    time: "14:15",
    title: "Growth review",
    description: "Metrics + blockers",
  },
];

function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusMap[status]}`}>
      {status.replace("-", " ")}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wide ${priorityChip[priority]}`}
    >
      {priority}
    </span>
  );
}

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[32px] border border-white/5 bg-slate-950/60 p-6 shadow-[0_25px_60px_rgba(5,10,20,0.55)] backdrop-blur-2xl ${className}`}
    >
      {children}
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const series = data.length ? data : [38, 52, 47, 64, 58, 72, 80];
  const max = Math.max(...series);
  const min = Math.min(...series);
  const range = Math.max(1, max - min);

  const points = series
    .map((value, index) => {
      const x = series.length > 1 ? (index / (series.length - 1)) * 100 : 0;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="h-24 w-full">
      <defs>
        <linearGradient id="spark" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke="url(#spark)"
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DonutGauge({ value }: { value: number }) {
  const safe = Math.min(100, Math.max(0, value));
  const angle = (safe / 100) * 360;
  return (
    <div className="relative mx-auto h-40 w-40">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(#34d399 ${angle}deg, rgba(255,255,255,0.08) ${angle}deg 360deg)`,
        }}
      />
      <div className="absolute inset-3 rounded-full bg-slate-950/90 flex flex-col items-center justify-center text-center">
        <span className="text-xs uppercase tracking-[0.35em] text-white/40">Health</span>
        <span className="mt-2 text-3xl font-semibold text-white">{safe}%</span>
        <p className="mt-1 text-xs text-white/50">Ops energy</p>
      </div>
    </div>
  );
}

const timeFormatter = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
});

const dueFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDue(iso: string | null): string {
  if (!iso) return "Backlog";
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  const time = timeFormatter.format(date);

  if (isToday) return `Heute · ${time}`;
  if (isTomorrow) return `Morgen · ${time}`;
  return dueFormatter.format(date);
}

function safeStatus(value: string | null): Status {
  return ["ready", "in-progress", "blocked"].includes(value ?? "")
    ? (value as Status)
    : "ready";
}

function safePriority(value: string | null): Priority {
  return ["high", "medium", "low"].includes(value ?? "")
    ? (value as Priority)
    : "medium";
}

async function fetchTasks(): Promise<TaskCard[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return fallbackTasks;

  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("slug,title,description,status,priority,tags,due_at,progress")
      .order("due_at", { ascending: true })
      .limit(20);

    if (error || !data) {
      console.error("Supabase tasks error:", error);
      return fallbackTasks;
    }

    const mapped = data.map((task) => ({
      id: (task.slug ?? task.title ?? "OPS").toUpperCase(),
      slug: (task.slug ?? task.title ?? "ops").toLowerCase(),
      title: task.title ?? "Untitled",
      description: task.description ?? "",
      status: safeStatus(task.status),
      priority: safePriority(task.priority),
      due: formatDue(task.due_at),
      tags: Array.isArray(task.tags) ? task.tags.filter(Boolean) : [],
      progress: Math.min(100, Math.max(0, task.progress ?? 0)),
    }));

    return mapped.length ? mapped : fallbackTasks;
  } catch (err) {
    console.error("Supabase tasks fetch failed:", err);
    return fallbackTasks;
  }
}

async function fetchActivity(): Promise<ActivityEntry[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return fallbackActivity;

  try {
    const { data, error } = await supabase
      .from("activity_log")
      .select("headline,details,actor,occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(6);

    if (error || !data) {
      console.error("Supabase activity error:", error);
      return fallbackActivity;
    }

    const mapped = data.map((entry) => ({
      time: entry.occurred_at ? timeFormatter.format(new Date(entry.occurred_at)) : "--:--",
      event: entry.headline ?? "Update",
      detail: entry.details ?? "",
      actor: entry.actor ?? "Agent",
    }));

    return mapped.length ? mapped : fallbackActivity;
  } catch (err) {
    console.error("Supabase activity fetch failed:", err);
    return fallbackActivity;
  }
}

async function fetchSchedule(): Promise<ScheduleSlot[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return fallbackSchedule;

  try {
    const { data, error } = await supabase
      .from("events")
      .select("title,description,start_at")
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true })
      .limit(4);

    if (error || !data) {
      console.error("Supabase events error:", error);
      return fallbackSchedule;
    }

    const mapped = data.map((event) => ({
      time: event.start_at ? timeFormatter.format(new Date(event.start_at)) : "--:--",
      title: event.title ?? "Untitled",
      description: event.description ?? "",
    }));

    return mapped.length ? mapped : fallbackSchedule;
  } catch (err) {
    console.error("Supabase events fetch failed:", err);
    return fallbackSchedule;
  }
}

function buildSparkline(tasks: TaskCard[]): number[] {
  const series = tasks.map((task) => task.progress);
  if (series.length >= 6) return series.slice(0, 8);
  const padded = [...series];
  while (padded.length < 6) {
    padded.push(Math.round(30 + Math.random() * 60));
  }
  return padded.slice(0, 8);
}

export default async function Home() {
  const [tasks, activity, schedule] = await Promise.all([
    fetchTasks(),
    fetchActivity(),
    fetchSchedule(),
  ]);

  const focusTask =
    tasks.find((task) => task.priority === "high" && task.status !== "ready") ??
    tasks[0];

  const statusCounts = tasks.reduce(
    (acc, task) => {
      acc[task.status] += 1;
      return acc;
    },
    { ready: 0, "in-progress": 0, blocked: 0 } as Record<Status, number>
  );

  const missionHealth = Math.round(
    tasks.reduce((sum, task) => sum + task.progress, 0) / (tasks.length || 1)
  );

  const sparklineSeries = buildSparkline(tasks);
  const readyRatio = Math.round((statusCounts.ready / (tasks.length || 1)) * 100);
  const blockedRatio = Math.round((statusCounts.blocked / (tasks.length || 1)) * 100);
  const nextEvent = schedule[0];
  const latestActivity = activity[0];

  return (
    <div className="px-4 py-10 md:px-10">
      <div className="mx-auto grid max-w-[1400px] gap-6 lg:grid-cols-[260px,1fr]">
        <aside className="rounded-[32px] border border-white/10 bg-gradient-to-b from-white/10 to-white/0 p-6 backdrop-blur-2xl">
          <div className="mb-8 space-y-3">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs uppercase tracking-[0.35em] text-white/60">
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
              Mission Desk
            </div>
            <h1 className="text-2xl font-semibold text-white">Chris ↔ Agent</h1>
            <p className="text-sm text-white/60">
              Realtime Ops Cockpit · Supabase live data · deploy-ready UI
            </p>
          </div>
          <nav className="space-y-2">
            {navLinks.map((link) => (
              <button
                key={link.label}
                className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all ${
                  link.active
                    ? "bg-white text-slate-900 shadow-lg shadow-emerald-500/30"
                    : "text-white/60 hover:bg-white/5"
                }`}
              >
                <span className="mr-3 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs text-white/70">
                  {link.emoji}
                </span>
                {link.label}
              </button>
            ))}
          </nav>
          <div className="mt-10 space-y-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">Quick actions</p>
            {quickActions.map((action) => (
              <div key={action.label} className="flex items-center justify-between text-sm text-white/70">
                <span>{action.label}</span>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-white/40">
                  {action.hint}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-xs text-emerald-100">
            Connected to Supabase · {tasks.length} tasks · {activity.length} live events
          </div>
        </aside>

        <main className="space-y-6">
          <GlassCard className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2 text-sm text-white/60">
              {workspaceTabs.map((tab, index) => (
                <span
                  key={tab}
                  className={`rounded-2xl px-4 py-2 ${
                    index === 0
                      ? "bg-white text-slate-900 font-medium"
                      : "bg-white/5 text-white/70"
                  }`}
                >
                  {tab}
                </span>
              ))}
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex items-center rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white/60">
                <span className="mr-2 text-white/40">⌕</span>
                <input
                  className="w-48 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
                  placeholder="Search missions"
                  aria-label="Search missions"
                />
              </div>
              <button className="rounded-2xl border border-white/15 px-4 py-2 text-sm text-white/70">
                Export snapshot
              </button>
              <button className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900">
                + Task
              </button>
            </div>
          </GlassCard>

          <section className="grid gap-6 xl:grid-cols-[1.6fr,0.8fr]">
            <GlassCard className="relative overflow-hidden border-white/10 bg-gradient-to-br from-white/10 via-slate-900/80 to-slate-950">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/60">Top missions</p>
                  <h2 className="mt-2 text-3xl font-semibold text-white">Active Ops Deck</h2>
                  <p className="mt-2 max-w-2xl text-sm text-white/70">
                    Live Tasks synchronised mit Supabase. Statuswechsel werden sofort gespiegelt,
                    dadurch entsteht die interaktive App statt einer starren Startseite.
                  </p>
                </div>
                {latestActivity && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                    <p className="text-xs uppercase tracking-[0.35em] text-white/40">Letztes Update</p>
                    <p className="mt-1 text-sm text-white">{latestActivity.event}</p>
                    <p className="text-xs text-white/60">{latestActivity.time} · {latestActivity.actor}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border border-white/5 bg-slate-950/60 p-5">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/40">Progress stream</p>
                  <Sparkline data={sparklineSeries} />
                  <div className="mt-4 flex items-center justify-between text-sm text-white/60">
                    <span>{tasks.length} missions</span>
                    <span>{missionHealth}% avg progress</span>
                  </div>
                </div>
                <div className="grid gap-4">
                  <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                    <p className="text-xs uppercase tracking-[0.35em] text-emerald-200/80">Ready to ship</p>
                    <p className="mt-2 text-3xl font-semibold text-emerald-50">{readyRatio}%</p>
                    <p className="text-sm text-emerald-100/80">Tasks im Status &ldquo;ready&rdquo;</p>
                  </div>
                  <div className="rounded-3xl border border-rose-400/20 bg-rose-400/10 p-4">
                    <p className="text-xs uppercase tracking-[0.35em] text-rose-100/80">Blocked</p>
                    <p className="mt-2 text-3xl font-semibold text-rose-50">{blockedRatio}%</p>
                    <p className="text-sm text-rose-100/80">Brauchen Input von Chris</p>
                  </div>
                </div>
              </div>

              {nextEvent && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-white/40">Nächster Slot</p>
                    <p className="text-base text-white">{nextEvent.title}</p>
                    <p className="text-xs text-white/60">{nextEvent.time} · {nextEvent.description}</p>
                  </div>
                  <button className="rounded-2xl border border-white/20 px-4 py-2 text-xs text-white/70">
                    Join prep room
                  </button>
                </div>
              )}
            </GlassCard>

            <div className="space-y-6">
              <GlassCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-white/50">Ops vitals</p>
                    <h3 className="mt-1 text-xl font-semibold text-white">Mission health</h3>
                  </div>
                  <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs text-emerald-200">
                    synced {timeFormatter.format(new Date())}
                  </span>
                </div>
                <DonutGauge value={missionHealth} />
                {focusTask && (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                    <p className="text-xs uppercase tracking-[0.35em] text-white/40">Focus task</p>
                    <p className="mt-1 text-base text-white">{focusTask.title}</p>
                    <p>{focusTask.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusBadge status={focusTask.status} />
                      <PriorityBadge priority={focusTask.priority} />
                      <span className="text-xs text-white/50">Due {focusTask.due}</span>
                    </div>
                  </div>
                )}
              </GlassCard>

              <GlassCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-white/50">Command</p>
                    <h3 className="mt-1 text-xl font-semibold text-white">Direct channel</h3>
                  </div>
                  <span className="text-xs text-white/50">Log → activity_feed</span>
                </div>
                <form action={logAgentMessage} className="mt-4 space-y-3 text-sm text-white/80">
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.35em] text-white/40">Headline</span>
                    <input
                      name="headline"
                      defaultValue="Direct message"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.35em] text-white/40">Nachricht</span>
                    <textarea
                      name="details"
                      required
                      rows={3}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                      placeholder="Was soll im Activity-Log landen?"
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs uppercase tracking-[0.35em] text-white/40">Actor</span>
                      <input
                        name="actor"
                        defaultValue="Chris"
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                      />
                    </label>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900"
                      >
                        Send to log
                      </button>
                    </div>
                  </div>
                </form>
              </GlassCard>

              <GlassCard className="border-emerald-400/20">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/50">Create</p>
                  <h3 className="mt-1 text-xl font-semibold text-white">Neue Mission</h3>
                </div>
                <form action={createTask} className="mt-4 space-y-3 text-sm text-white/80">
                  <input
                    name="title"
                    required
                    placeholder="Titel"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                  />
                  <textarea
                    name="description"
                    rows={3}
                    placeholder="Beschreibung"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      name="priority"
                      defaultValue="high"
                      className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <select
                      name="status"
                      defaultValue="in-progress"
                      className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                    >
                      <option value="ready">Ready</option>
                      <option value="in-progress">In progress</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="datetime-local"
                      name="due"
                      className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                    />
                    <input
                      name="tags"
                      placeholder="Product,Automation"
                      className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
                  >
                    Mission speichern
                  </button>
                </form>
              </GlassCard>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.4fr,0.9fr]">
            <GlassCard>
              <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/50">Tasks</p>
                  <h3 className="mt-1 text-2xl font-semibold text-white">Mission board</h3>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-white/60">
                  {["All", "Ready", "In progress", "Blocked"].map((filter, index) => (
                    <span
                      key={filter}
                      className={`rounded-2xl border border-white/10 px-3 py-1 ${
                        index === 0 ? "bg-white text-slate-900" : "bg-white/0"
                      }`}
                    >
                      {filter}
                    </span>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-white/50">
                    <tr>
                      <th className="pb-3 pr-4 font-medium">Task</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 pr-4 font-medium">Due</th>
                      <th className="pb-3 pr-4 font-medium">Tags</th>
                      <th className="pb-3 pr-4 font-medium">Progress</th>
                      <th className="pb-3 pr-4 font-medium">Update</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {tasks.map((task) => (
                      <tr key={`${task.id}-${task.title}`} className="align-top">
                        <td className="py-4 pr-4">
                          <p className="text-xs uppercase tracking-wide text-white/40">{task.id}</p>
                          <p className="text-base text-white">{task.title}</p>
                          <p className="text-sm text-white/60">{task.description}</p>
                        </td>
                        <td className="py-4 pr-4">
                          <div className="flex flex-col gap-2">
                            <StatusBadge status={task.status} />
                            <PriorityBadge priority={task.priority} />
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-white/70">{task.due}</td>
                        <td className="py-4 pr-4">
                          <div className="flex flex-wrap gap-2">
                            {task.tags.map((tag) => (
                              <span
                                key={`${task.id}-${tag}`}
                                className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-28 rounded-full bg-white/10">
                              <div
                                className="h-2 rounded-full bg-gradient-to-r from-emerald-300 via-sky-400 to-indigo-400"
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-white/50">{task.progress}%</span>
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <form
                            action={updateTaskProgress}
                            className="flex flex-col gap-2 text-xs text-white/70"
                          >
                            <input type="hidden" name="taskSlug" value={task.slug} />
                            <select
                              name="status"
                              defaultValue={task.status}
                              className="rounded-2xl border border-white/10 bg-slate-950/70 px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                            >
                              <option value="ready">Ready</option>
                              <option value="in-progress">In progress</option>
                              <option value="blocked">Blocked</option>
                            </select>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              name="progress"
                              defaultValue={task.progress}
                              className="w-full accent-emerald-400"
                            />
                            <div className="flex items-center justify-between">
                              <span>{task.progress}%</span>
                              <button
                                type="submit"
                                className="rounded-2xl border border-white/15 px-3 py-1 text-white"
                              >
                                Sync
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            <div className="space-y-6">
              <GlassCard>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-white/50">Activity</p>
                    <h3 className="mt-1 text-xl font-semibold text-white">Live feed</h3>
                  </div>
                  <button className="text-xs text-white/60 hover:text-white">Export log</button>
                </div>
                <div className="space-y-3">
                  {activity.map((item) => (
                    <div
                      key={`${item.event}-${item.time}`}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-3"
                    >
                      <div className="text-xs text-white/40">{item.time}</div>
                      <div>
                        <p className="text-sm font-medium text-white">{item.event}</p>
                        <p className="text-xs text-white/60">{item.detail}</p>
                        <p className="mt-1 text-xs text-white/40">{item.actor}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard>
                <div className="mb-4">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/50">Schedule</p>
                  <h3 className="mt-1 text-xl font-semibold text-white">Next 24h</h3>
                </div>
                <div className="space-y-4">
                  {schedule.map((slot) => (
                    <div
                      key={`${slot.time}-${slot.title}`}
                      className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                    >
                      <p className="text-sm text-white/50">{slot.time}</p>
                      <p className="text-base font-medium text-white">{slot.title}</p>
                      <p className="text-sm text-white/60">{slot.description}</p>
                    </div>
                  ))}
                </div>
                <button className="mt-4 w-full rounded-2xl border border-white/15 py-3 text-sm text-white/70">
                  Sync calendar blocks
                </button>
              </GlassCard>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

import { getSupabaseServerClient } from "@/lib/supabase-server";

const navItems = [
  { label: "Command", active: true },
  { label: "Projects", active: false },
  { label: "Tasks", active: false },
  { label: "Automations", active: false },
  { label: "Files", active: false },
];

export const revalidate = 60;

const statusMap = {
  ready: "text-emerald-300 bg-emerald-400/10",
  "in-progress": "text-sky-300 bg-sky-400/10",
  blocked: "text-rose-300 bg-rose-400/10",
};

type Status = keyof typeof statusMap;
type Priority = "high" | "medium" | "low";

type TaskCard = {
  id: string;
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

type PipelineMetric = {
  label: string;
  value: string;
  sub: string;
};

const priorityChip: Record<Priority, string> = {
  high: "text-rose-200 border-rose-500/40",
  medium: "text-amber-200 border-amber-500/40",
  low: "text-emerald-200 border-emerald-500/40",
};

const fallbackTasks: TaskCard[] = [
  {
    id: "OPS-231",
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
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusMap[status]}`}
    >
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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/5 bg-white/5 p-6 shadow-[0_20px_45px_rgba(10,10,20,0.45)] backdrop-blur-xl">
      {children}
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
      .select(
        "slug,title,description,status,priority,tags,due_at,progress"
      )
      .order("due_at", { ascending: true })
      .limit(20);

    if (error || !data) {
      console.error("Supabase tasks error:", error);
      return fallbackTasks;
    }

    const mapped = data.map((task) => ({
      id: (task.slug ?? task.title ?? "OPS").toUpperCase(),
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
      time: event.start_at
        ? timeFormatter.format(new Date(event.start_at))
        : "--:--",
      title: event.title ?? "Untitled",
      description: event.description ?? "",
    }));

    return mapped.length ? mapped : fallbackSchedule;
  } catch (err) {
    console.error("Supabase events fetch failed:", err);
    return fallbackSchedule;
  }
}

function buildPipelineMetrics(
  tasks: TaskCard[],
  activity: ActivityEntry[],
  schedule: ScheduleSlot[]
): PipelineMetric[] {
  const priorityCounts = tasks.reduce(
    (acc, task) => {
      acc[task.priority] += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  );

  return [
    {
      label: "Tasks in flight",
      value: tasks.length.toString().padStart(2, "0"),
      sub: `${priorityCounts.high} high · ${priorityCounts.medium} medium · ${priorityCounts.low} low`,
    },
    {
      label: "Activity log",
      value: activity.length.toString().padStart(2, "0"),
      sub: activity[0]
        ? `Letztes Update ${activity[0].time}`
        : "Noch keine Einträge",
    },
    {
      label: "Upcoming events",
      value: schedule.length.toString().padStart(2, "0"),
      sub: schedule[0]
        ? `${schedule[0].time} · ${schedule[0].title}`
        : "Kein Termin geplant",
    },
  ];
}

export default async function Home() {
  const [tasks, activity, schedule] = await Promise.all([
    fetchTasks(),
    fetchActivity(),
    fetchSchedule(),
  ]);

  const pipelineMetrics = buildPipelineMetrics(tasks, activity, schedule);
  const overallProgress = Math.round(
    tasks.reduce((sum, task) => sum + task.progress, 0) / (tasks.length || 1)
  );

  return (
    <div className="px-4 py-10 md:px-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[250px,1fr]">
        <aside className="rounded-3xl border border-white/5 bg-gradient-to-b from-white/8 to-white/3 p-6 backdrop-blur-2xl">
          <div className="mb-6">
            <p className="text-sm uppercase tracking-[0.35em] text-white/60">
              Control
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-white">
              Mission Desk
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Chris ↔ Agent · realtime ops
            </p>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.label}
                className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all ${
                  item.active
                    ? "bg-white/90 text-slate-900"
                    : "text-white/60 hover:bg-white/10"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm text-white/70">
            <p className="text-xs uppercase tracking-widest text-white/50">
              Agent focus
            </p>
            <p className="text-base text-white">
              MVP Dashboard build · Due 00:00
            </p>
            <div className="h-2 w-full rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <p className="text-xs text-white/50">
              Status synced {new Intl.DateTimeFormat("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date())}
            </p>
          </div>
        </aside>

        <div className="space-y-8">
          <header className="flex flex-col gap-5 rounded-3xl border border-white/5 bg-slate-950/40 p-6 backdrop-blur-2xl md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-white/60">
                Dashboard · Alpha
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-white">
                Build log · {new Intl.DateTimeFormat("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date())}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-white/60">
                Live view der Ops-Pipeline. Daten kommen direkt aus Supabase –
                fällt der Sync aus, springen automatisch Demodaten ein.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="rounded-2xl border border-white/20 px-4 py-2 text-sm text-white/70 hover:border-white/50">
                Share snapshot
              </button>
              <button className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-indigo-500/30">
                + Task
              </button>
            </div>
          </header>

          <section className="grid gap-6 md:grid-cols-3">
            {pipelineMetrics.map((metric) => (
              <Card key={metric.label}>
                <p className="text-xs uppercase tracking-wide text-white/50">
                  {metric.label}
                </p>
                <p className="mt-2 text-4xl font-semibold text-white">
                  {metric.value}
                </p>
                <p className="mt-1 text-sm text-white/60">{metric.sub}</p>
              </Card>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                    Tasks
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    Active missions
                  </h3>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                  {tasks.length} items
                </span>
              </div>
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div
                    key={`${task.id}-${task.title}`}
                    className="rounded-2xl border border-white/5 bg-slate-900/60 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-white/40">
                          {task.id}
                        </p>
                        <h4 className="mt-1 text-lg font-semibold text-white">
                          {task.title}
                        </h4>
                        <p className="text-sm text-white/60">{task.description}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <StatusBadge status={task.status} />
                        <PriorityBadge priority={task.priority} />
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-white/60">
                      <div className="flex items-center gap-2">
                        <span className="text-white/40">Due</span>
                        <span>{task.due}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {task.tags.map((tag) => (
                          <span
                            key={`${task.id}-${tag}`}
                            className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/40">Progress</span>
                        <div className="h-2 w-32 rounded-full bg-white/10">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-300"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="space-y-6">
              <Card>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                      Activity
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-white">
                      Live feed
                    </h3>
                  </div>
                  <button className="text-xs text-white/60 hover:text-white">
                    Export log
                  </button>
                </div>
                <div className="space-y-4">
                  {activity.map((item) => (
                    <div
                      key={`${item.event}-${item.time}`}
                      className="flex items-start gap-3 rounded-2xl border border-white/5 bg-slate-900/50 p-3"
                    >
                      <div className="text-xs text-white/50">{item.time}</div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {item.event}
                        </p>
                        <p className="text-xs text-white/60">{item.detail}</p>
                        <p className="mt-1 text-xs text-white/40">{item.actor}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <div className="mb-4">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                    Schedule
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    Next 24h
                  </h3>
                </div>
                <div className="space-y-4">
                  {schedule.map((slot) => (
                    <div
                      key={`${slot.time}-${slot.title}`}
                      className="rounded-2xl border border-white/5 bg-slate-900/50 p-4"
                    >
                      <p className="text-sm text-white/50">{slot.time}</p>
                      <p className="text-base font-medium text-white">
                        {slot.title}
                      </p>
                      <p className="text-sm text-white/60">{slot.description}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

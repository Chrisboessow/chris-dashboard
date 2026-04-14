import { FloatingChat } from "@/components/floating-chat";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: "home", active: true },
  { key: "calendar", label: "Calendar", icon: "calendar", active: false },
  { key: "tasks", label: "Tasks", icon: "check", active: false },
  { key: "settings", label: "Settings", icon: "settings", active: false },
];

const statusMap = {
  ready: "text-emerald-300 bg-emerald-400/15",
  "in-progress": "text-sky-300 bg-sky-400/15",
  blocked: "text-rose-300 bg-rose-400/15",
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

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl ${className}`}
      style={{ boxShadow: "0 25px 60px rgba(2, 6, 23, 0.65)" }}
    >
      {children}
    </div>
  );
}

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

function Icon({ type, active }: { type: string; active: boolean }) {
  const stroke = active ? "#020617" : "#f8fafc";
  const opacity = active ? 1 : 0.7;
  switch (type) {
    case "calendar":
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" style={{ stroke, opacity }} fill="none" strokeWidth="1.8">
          <rect x="3" y="5" width="18" height="16" rx="4" />
          <path d="M8 3v4M16 3v4M3 11h18" />
        </svg>
      );
    case "check":
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" style={{ stroke, opacity }} fill="none" strokeWidth="1.8">
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <path d="M8 12l3 3 5-6" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" style={{ stroke, opacity }} fill="none" strokeWidth="1.8">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" style={{ stroke, opacity }} fill="none" strokeWidth="1.8">
          <path d="M3 11l9-8 9 8" />
          <path d="M5 12v8h14v-8" />
        </svg>
      );
  }
}

export default async function Home() {
  const [tasks, activity, schedule] = await Promise.all([
    fetchTasks(),
    fetchActivity(),
    fetchSchedule(),
  ]);

  const nextEvent = schedule[0];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617] text-white">
      <div className="pointer-events-none">
        <div className="absolute inset-x-0 top-[-200px] h-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-y-0 left-[-200px] w-72 rounded-full bg-indigo-500/20 blur-[160px]" />
        <div className="absolute bottom-[-120px] right-[-100px] h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <nav className="fixed left-6 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-3 rounded-full border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
        {navItems.map((item) => (
          <button
            key={item.key}
            aria-label={item.label}
            className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all ${
              item.active
                ? "border-white bg-white text-slate-900 shadow-[0_15px_30px_rgba(255,255,255,0.35)]"
                : "border-white/10 text-white/70 hover:border-white/40"
            }`}
          >
            <Icon type={item.icon} active={item.active} />
          </button>
        ))}
      </nav>

      <main className="relative z-20 px-6 py-10 md:px-12 lg:pl-32 lg:pr-20">
        <header className="flex flex-col gap-6 rounded-[36px] border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-8 backdrop-blur-2xl">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">Mission Interface</p>
            <h1 className="mt-3 text-4xl font-semibold text-white">Command Dashboard</h1>
            <p className="mt-2 text-sm text-white/70">
              Clean, minimal, dark surface inspiriert von Börsen-UIs. Tabs folgen – zuerst steht das Framework:
              Floating Nav, Chat-Trigger und klare Sections.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <GlassCard className="border-white/5 bg-white/5 text-sm text-white/70">
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">Tasks</p>
              <p className="mt-2 text-3xl font-semibold text-white">{tasks.length.toString().padStart(2, "0")}</p>
              <p>tracked via Supabase</p>
            </GlassCard>
            <GlassCard className="border-white/5 bg-white/5 text-sm text-white/70">
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">Next event</p>
              <p className="mt-2 text-2xl font-semibold text-white">{nextEvent ? nextEvent.time : "--:--"}</p>
              <p>{nextEvent ? nextEvent.title : "No meetings"}</p>
            </GlassCard>
            <GlassCard className="border-white/5 bg-white/5 text-sm text-white/70">
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">Activity</p>
              <p className="mt-2 text-3xl font-semibold text-white">{activity.length}</p>
              <p>latest ops signals</p>
            </GlassCard>
          </div>
        </header>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <GlassCard className="border-white/5 bg-[#050b1f]/70">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">Focus</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Active missions</h2>
              </div>
              <span className="text-xs text-white/50">Modern dark mode · neon edges</span>
            </div>
            <div className="mt-4 space-y-4">
              {tasks.slice(0, 4).map((task) => (
                <div
                  key={task.slug}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-white/40">{task.id}</p>
                      <p className="text-lg text-white">{task.title}</p>
                      <p className="text-sm text-white/60">{task.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/60">
                    <span>{task.due}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-32 rounded-full bg-white/10">
                        <div
                          className="h-1.5 rounded-full bg-gradient-to-r from-emerald-300 via-sky-400 to-indigo-400"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-white/50">{task.progress}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="border-white/5 bg-[#050b1f]/70">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">Schedule</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Calendar preview</h2>
              </div>
              <span className="text-xs text-white/50">Swipe-ready shell</span>
            </div>
            <div className="mt-4 space-y-4">
              {schedule.map((slot) => (
                <div key={`${slot.time}-${slot.title}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-white/50">{slot.time}</p>
                  <p className="text-base font-medium text-white">{slot.title}</p>
                  <p className="text-sm text-white/60">{slot.description}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <GlassCard className="border-white/5 bg-[#050b1f]/70">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">Ops tape</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Activity feed</h2>
              </div>
              <span className="text-xs text-white/50">Realtime placeholder</span>
            </div>
            <div className="mt-4 space-y-4">
              {activity.map((item) => (
                <div key={`${item.event}-${item.time}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span>{item.time}</span>
                    <span>{item.actor}</span>
                  </div>
                  <p className="mt-1 text-base text-white">{item.event}</p>
                  <p className="text-sm text-white/60">{item.detail}</p>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="border-dashed border-white/20 bg-white/5 text-white/60">
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">Coming up</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Tab shells</h2>
            <p className="mt-2 text-sm">
              Dieser Bereich bleibt bewusst minimal – hier docken später Calendar-, Automation- oder Files-Screens
              an. Wichtig war erstmal das Jet-Black Canvas inkl. Floating Navigation & Chat-Trigger vorzubereiten.
            </p>
          </GlassCard>
        </section>
      </main>

      <FloatingChat thread={activity} />
    </div>
  );
}

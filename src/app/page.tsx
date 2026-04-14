import { DashboardSurface } from "@/components/dashboard-surface";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type {
  ActivityEntry,
  Priority,
  ScheduleSlot,
  Status,
  TaskCard,
} from "@/types/dashboard";

const supabaseReady = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
);

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
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("tasks")
    .select("slug,title,description,status,priority,tags,due_at,progress")
    .order("due_at", { ascending: true })
    .limit(20);

  if (error || !data) {
    console.error("Supabase tasks error:", error);
    return [];
  }

  return data.map((task) => ({
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
}

async function fetchActivity(): Promise<ActivityEntry[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("activity_log")
    .select("headline,details,actor,occurred_at")
    .order("occurred_at", { ascending: false })
    .limit(10);

  if (error || !data) {
    console.error("Supabase activity error:", error);
    return [];
  }

  return data.map((entry) => ({
    time: entry.occurred_at ? timeFormatter.format(new Date(entry.occurred_at)) : "--:--",
    event: entry.headline ?? "Update",
    detail: entry.details ?? "",
    actor: entry.actor ?? "Agent",
  }));
}

async function fetchSchedule(): Promise<ScheduleSlot[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("events")
    .select("title,description,start_at")
    .gte("start_at", new Date().toISOString())
    .order("start_at", { ascending: true })
    .limit(10);

  if (error || !data) {
    console.error("Supabase events error:", error);
    return [];
  }

  return data.map((event) => ({
    time: event.start_at ? timeFormatter.format(new Date(event.start_at)) : "--:--",
    title: event.title ?? "Untitled",
    description: event.description ?? "",
  }));
}

export default async function Home() {
  const [tasks, activity, schedule] = await Promise.all([
    fetchTasks(),
    fetchActivity(),
    fetchSchedule(),
  ]);

  return (
    <DashboardSurface
      tasks={tasks}
      activity={activity}
      schedule={schedule}
      supabaseReady={supabaseReady}
    />
  );
}

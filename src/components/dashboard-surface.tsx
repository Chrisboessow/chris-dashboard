'use client';

import { useMemo, useState } from "react";
import { FloatingChat } from "@/components/floating-chat";
import type { ActivityEntry, ScheduleSlot, TaskCard } from "@/types/dashboard";

type NavKey = "dashboard" | "calendar" | "tasks" | "settings";

type Props = {
  tasks: TaskCard[];
  activity: ActivityEntry[];
  schedule: ScheduleSlot[];
  supabaseReady: boolean;
};

const navItems: { key: NavKey; label: string; icon: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: "home" },
  { key: "calendar", label: "Calendar", icon: "calendar" },
  { key: "tasks", label: "Tasks", icon: "check" },
  { key: "settings", label: "Settings", icon: "settings" },
];

const statusMap = {
  ready: "text-emerald-300 bg-emerald-400/15",
  "in-progress": "text-sky-300 bg-sky-400/15",
  blocked: "text-rose-300 bg-rose-400/15",
} as const;

const priorityChip = {
  high: "text-rose-200 border-rose-500/40",
  medium: "text-amber-200 border-amber-500/40",
  low: "text-emerald-200 border-emerald-500/40",
} as const;

export function DashboardSurface({ tasks, activity, schedule, supabaseReady }: Props) {
  const [activeTab, setActiveTab] = useState<NavKey>("dashboard");
  const [selectedTask, setSelectedTask] = useState<TaskCard | null>(tasks[0] ?? null);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleSlot | null>(schedule[0] ?? null);
  const activeTask = selectedTask ?? tasks[0] ?? null;
  const activeEvent = selectedEvent ?? schedule[0] ?? null;

  const readyCount = useMemo(() => tasks.filter((task) => task.status === "ready").length, [tasks]);
  const blockedCount = useMemo(() => tasks.filter((task) => task.status === "blocked").length, [tasks]);
  const inProgressCount = useMemo(() => tasks.filter((task) => task.status === "in-progress").length, [tasks]);
  const avgProgress = useMemo(() => (
    tasks.length ? Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length) : 0
  ), [tasks]);

  const statusSummary = !supabaseReady
    ? "Supabase-Verbindung fehlt · .env prüfen"
    : tasks.length
    ? `Arbeite aktuell an ${activeTask?.title ?? tasks[0].title}`
    : "Keine Aufgaben eingetragen";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#01030c] text-white">
      <div className="pointer-events-none">
        <div className="absolute inset-x-0 top-[-220px] h-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-y-0 left-[-200px] w-72 rounded-full bg-indigo-500/15 blur-[160px]" />
        <div className="absolute bottom-[-140px] right-[-120px] h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 lg:px-10">
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#050816]/80 px-3 py-2 backdrop-blur-2xl">
            {navItems.map((item) => (
              <button
                key={item.key}
                aria-label={item.label}
                onClick={() => setActiveTab(item.key)}
                className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all ${
                  activeTab === item.key
                    ? "border-white bg-white text-slate-900 shadow-[0_15px_30px_rgba(255,255,255,0.35)]"
                    : "border-white/10 text-white/70 hover:border-white/40"
                }`}
              >
                <Icon type={item.icon} active={activeTab === item.key} />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {activeTab === "dashboard" && (
            <DashboardTab
              tasks={tasks}
              activity={activity}
              schedule={schedule}
              readyCount={readyCount}
              blockedCount={blockedCount}
              inProgressCount={inProgressCount}
              avgProgress={avgProgress}
              selectedTask={activeTask}
              onSelectTask={setSelectedTask}
              selectedEvent={activeEvent}
              onSelectEvent={setSelectedEvent}
              statusSummary={statusSummary}
              supabaseReady={supabaseReady}
            />
          )}
          {activeTab === "calendar" && (
            <CalendarTab
              schedule={schedule}
              selectedEvent={activeEvent}
              onSelectEvent={setSelectedEvent}
              supabaseReady={supabaseReady}
            />
          )}
          {activeTab === "tasks" && (
            <TasksTab
              tasks={tasks}
              selectedTask={activeTask}
              onSelectTask={setSelectedTask}
              supabaseReady={supabaseReady}
            />
          )}
          {activeTab === "settings" && <SettingsTab supabaseReady={supabaseReady} />}
        </div>
      </div>

      <FloatingChat thread={activity} />
    </div>
  );
}

function DashboardTab(props: {
  tasks: TaskCard[];
  activity: ActivityEntry[];
  schedule: ScheduleSlot[];
  readyCount: number;
  blockedCount: number;
  inProgressCount: number;
  avgProgress: number;
  selectedTask: TaskCard | null;
  onSelectTask: (task: TaskCard) => void;
  selectedEvent: ScheduleSlot | null;
  onSelectEvent: (event: ScheduleSlot) => void;
  statusSummary: string;
  supabaseReady: boolean;
}) {
  const {
    tasks,
    activity,
    schedule,
    readyCount,
    blockedCount,
    inProgressCount,
    avgProgress,
    selectedTask,
    onSelectTask,
    selectedEvent,
    onSelectEvent,
    statusSummary,
    supabaseReady,
  } = props;

  return (
    <div className="space-y-6">
      <GlassCard className="border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">Mission Interface</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Daily Overview</h1>
            <p className="mt-2 text-sm text-white/70">Status, Termine und Tasks – alles in einem dunklen, mobilen Layout.</p>
          </div>
          <div className="text-sm text-white/60">
            {!supabaseReady && (
              <span className="rounded-full border border-white/20 px-4 py-2 text-xs text-rose-200">
                Supabase env fehlt
              </span>
            )}
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="border-white/10 bg-[#050816]/80 text-sm text-white/70">
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">Progress</p>
          <p className="mt-2 text-3xl font-semibold text-white">{avgProgress}%</p>
          <p>Ø Fortschritt</p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
            <div>
              <p className="text-lg font-semibold text-white">{inProgressCount}</p>
              <p className="text-white/50">live</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-emerald-300">{readyCount}</p>
              <p className="text-white/50">ready</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-rose-300">{blockedCount}</p>
              <p className="text-white/50">blocked</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="border-white/10 bg-[#050816]/80 text-sm text-white/70">
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">Next events</p>
          <div className="mt-3 space-y-3">
            {schedule.slice(0, 2).map((slot) => (
              <button
                key={`${slot.time}-${slot.title}`}
                onClick={() => onSelectEvent(slot)}
                className={`w-full rounded-2xl border px-4 py-3 text-left ${
                  selectedEvent?.title === slot.title
                    ? "border-white/40 bg-white/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <p className="text-xs text-white/50">{slot.time}</p>
                <p className="text-base text-white">{slot.title}</p>
                <p className="text-xs text-white/60">{slot.description}</p>
              </button>
            ))}
            {!schedule.length && <p className="text-xs text-white/50">Keine Termine</p>}
          </div>
        </GlassCard>
        <GlassCard className="border-white/10 bg-[#050816]/80 text-sm text-white/70">
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">Status</p>
          <p className="mt-3 text-base text-white">{statusSummary}</p>
          {selectedTask && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/60">
              <p>{selectedTask.description}</p>
              <p className="mt-2">Due: {selectedTask.due}</p>
            </div>
          )}
        </GlassCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <GlassCard className="border-white/10 bg-[#050816]/80">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">Tasks</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Heute</h2>
            </div>
            <span className="text-xs text-white/50">Tap to inspect</span>
          </div>
          <div className="mt-4 space-y-4">
            {tasks.length ? (
              tasks.slice(0, 5).map((task) => (
                <button
                  key={task.slug}
                  onClick={() => onSelectTask(task)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedTask?.slug === task.slug
                      ? "border-white/40 bg-white/10"
                      : "border-white/10 bg-white/5"
                  }`}
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
                </button>
              ))
            ) : (
              <p className="text-sm text-white/50">Keine Aufgaben verfügbar.</p>
            )}
          </div>
        </GlassCard>

        <GlassCard className="border-white/10 bg-[#050816]/80">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">Kalender</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Next 24h</h2>
            </div>
            <span className="text-xs text-white/50">Tip für Details</span>
          </div>
          <div className="mt-4 space-y-3">
            {schedule.length ? (
              schedule.map((slot) => (
                <button
                  key={`${slot.time}-${slot.title}`}
                  onClick={() => onSelectEvent(slot)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left ${
                    selectedEvent?.title === slot.title
                      ? "border-white/40 bg-white/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <p className="text-xs text-white/50">{slot.time}</p>
                  <p className="text-base text-white">{slot.title}</p>
                  <p className="text-xs text-white/60">{slot.description}</p>
                </button>
              ))
            ) : (
              <p className="text-sm text-white/50">Keine Termine eingetragen.</p>
            )}
          </div>
          {selectedEvent && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
              <p className="text-xs text-white/50">Ausgewählt</p>
              <p className="text-white">{selectedEvent.title}</p>
              <p>{selectedEvent.time}</p>
              <p className="text-white/60">{selectedEvent.description}</p>
            </div>
          )}
        </GlassCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="border-white/10 bg-[#050816]/80">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">Activity</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Log</h2>
            </div>
            <span className="text-xs text-white/50">Latest updates</span>
          </div>
          <div className="mt-4 space-y-4">
            {activity.length ? (
              activity.slice(0, 6).map((item) => (
                <div key={`${item.event}-${item.time}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span>{item.time}</span>
                    <span>{item.actor}</span>
                  </div>
                  <p className="mt-1 text-base text-white">{item.event}</p>
                  <p className="text-sm text-white/60">{item.detail}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/50">Keine Activity Einträge.</p>
            )}
          </div>
        </GlassCard>
        <GlassCard className="border-white/10 bg-[#050816]/80">
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">Status Board</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Briefing</h2>
          <div className="mt-4 space-y-3 text-sm text-white/70">
            <p>• Fokus: {selectedTask ? selectedTask.title : "–"}</p>
            <p>• Blocker: {blockedCount}</p>
            <p>• Ready: {readyCount}</p>
            <p>• Nächster Termin: {selectedEvent ? `${selectedEvent.time} · ${selectedEvent.title}` : "–"}</p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function CalendarTab({
  schedule,
  selectedEvent,
  onSelectEvent,
  supabaseReady,
}: {
  schedule: ScheduleSlot[];
  selectedEvent: ScheduleSlot | null;
  onSelectEvent: (event: ScheduleSlot) => void;
  supabaseReady: boolean;
}) {
  return (
    <div className="space-y-6">
      <GlassCard className="border-white/10 bg-[#050816]/80">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Calendar</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Apple-style Day Sheet</h2>
          </div>
          {!supabaseReady && (
            <span className="text-xs text-white/50">Supabase fehlt</span>
          )}
        </div>
        <p className="mt-2 text-sm text-white/60">
          Events kommen direkt aus der `events`-Tabelle. Für iCloud-Sync: Cron/Automation → Supabase.
        </p>
      </GlassCard>
      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <GlassCard className="border-white/10 bg-[#050816]/80">
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">Timeline</p>
          <div className="mt-4 space-y-4">
            {schedule.length ? (
              schedule.map((slot) => (
                <button
                  key={`${slot.time}-${slot.title}`}
                  onClick={() => onSelectEvent(slot)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left ${
                    selectedEvent?.title === slot.title
                      ? "border-white/40 bg-white/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <p className="text-xs text-white/50">{slot.time}</p>
                  <p className="text-base text-white">{slot.title}</p>
                  <p className="text-xs text-white/60">{slot.description}</p>
                </button>
              ))
            ) : (
              <p className="text-sm text-white/50">Keine Termine hinterlegt.</p>
            )}
          </div>
        </GlassCard>
        <GlassCard className="border-white/10 bg-[#050816]/80">
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">Details</p>
          {selectedEvent ? (
            <div className="mt-4 space-y-2 text-sm text-white/70">
              <p className="text-2xl text-white">{selectedEvent.title}</p>
              <p className="text-white/60">{selectedEvent.time}</p>
              <p>{selectedEvent.description}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-white/50">Kein Termin ausgewählt.</p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

function TasksTab({
  tasks,
  selectedTask,
  onSelectTask,
  supabaseReady,
}: {
  tasks: TaskCard[];
  selectedTask: TaskCard | null;
  onSelectTask: (task: TaskCard) => void;
  supabaseReady: boolean;
}) {
  return (
    <div className="space-y-6">
      <GlassCard className="border-white/10 bg-[#050816]/80">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Tasks</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Board</h2>
          </div>
          {!supabaseReady && <span className="text-xs text-white/50">Supabase fehlt</span>}
        </div>
      </GlassCard>
      <GlassCard className="border-white/10 bg-[#050816]/80">
        {tasks.length ? (
          <div className="space-y-3">
            {tasks.map((task) => (
              <button
                key={task.slug}
                onClick={() => onSelectTask(task)}
                className={`w-full rounded-2xl border px-4 py-3 text-left ${
                  selectedTask?.slug === task.slug
                    ? "border-white/40 bg-white/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/40">{task.id}</p>
                    <p className="text-lg text-white">{task.title}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                  </div>
                </div>
                <p className="text-sm text-white/60">{task.description}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-white/50">
                  <span>{task.due}</span>
                  <span>· {task.progress}%</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/50">Keine Tasks vorhanden.</p>
        )}
      </GlassCard>
    </div>
  );
}

function SettingsTab({ supabaseReady }: { supabaseReady: boolean }) {
  return (
    <div className="space-y-6">
      <GlassCard className="border-white/10 bg-[#050816]/80">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">Settings</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Integration</h2>
        <p className="mt-3 text-sm text-white/70">
          Dieses Panel ist für Automations (Apples Kalender, Reminders, Cron) reserviert. Aktuell:
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/60">
          <li>Supabase Status: {supabaseReady ? "verbunden" : "nicht konfiguriert"}</li>
          <li>Calendar Sync: Bitte iCloud → Supabase Sync-Job aktivieren (Pear CLI).</li>
          <li>Tasks: CRUD folgt, sobald Schreibrechte live sind.</li>
        </ul>
      </GlassCard>
    </div>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[32px] border border-white/10 p-6 backdrop-blur-2xl ${className}`}
      style={{ boxShadow: "0 25px 60px rgba(2, 6, 23, 0.55)" }}
    >
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: keyof typeof statusMap }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusMap[status]}`}>
      {status.replace("-", " ")}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: keyof typeof priorityChip }) {
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

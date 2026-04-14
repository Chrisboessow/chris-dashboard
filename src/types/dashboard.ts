export type Status = "ready" | "in-progress" | "blocked";
export type Priority = "high" | "medium" | "low";

export type TaskCard = {
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

export type ActivityEntry = {
  time: string;
  event: string;
  detail: string;
  actor: string;
};

export type ScheduleSlot = {
  time: string;
  title: string;
  description: string;
};

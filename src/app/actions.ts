'use server';

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase-server";

function ensureClient() {
  const client = getSupabaseServerClient();
  if (!client) {
    throw new Error("Supabase credentials missing");
  }
  return client;
}

export async function createTask(formData: FormData) {
  const title = formData.get("title")?.toString().trim();
  const description = formData.get("description")?.toString().trim() ?? "";
  const priority = formData.get("priority")?.toString() ?? "medium";
  const status = formData.get("status")?.toString() ?? "ready";
  const due = formData.get("due")?.toString();
  const tagsInput = formData.get("tags")?.toString() ?? "";

  if (!title) {
    throw new Error("Titel erforderlich");
  }

  const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`.slice(0, 32);
  const tags = tagsInput
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const supabase = ensureClient();
  await supabase.from("tasks").insert({
    slug,
    title,
    description,
    status,
    priority,
    tags,
    due_at: due ? new Date(due).toISOString() : null,
    progress: status === "ready" ? 0 : 15,
  });

  revalidatePath("/");
}

export async function updateTaskProgress(formData: FormData) {
  const slug = formData.get("taskSlug")?.toString();
  const status = formData.get("status")?.toString();
  const progressValue = Number(formData.get("progress"));

  if (!slug || !status || Number.isNaN(progressValue)) {
    throw new Error("Ungültige Task-Daten");
  }

  const supabase = ensureClient();
  await supabase
    .from("tasks")
    .update({ status, progress: Math.max(0, Math.min(100, progressValue)) })
    .eq("slug", slug);

  revalidatePath("/");
}

export async function logAgentMessage(formData: FormData) {
  const headline = formData.get("headline")?.toString().trim() || "Direct message";
  const details = formData.get("details")?.toString().trim();
  const actor = formData.get("actor")?.toString().trim() || "Chris";

  if (!details) {
    throw new Error("Nachricht darf nicht leer sein");
  }

  const supabase = ensureClient();
  await supabase.from("activity_log").insert({
    headline,
    details,
    actor,
    occurred_at: new Date().toISOString(),
  });

  revalidatePath("/");
}

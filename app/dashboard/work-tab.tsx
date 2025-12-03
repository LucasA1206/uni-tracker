"use client";

import { useEffect, useState } from "react";

interface WorkTask {
  id: number;
  title: string;
  context: string | null;
  status: string;
  dueDate: string | null;
  followupPeople?: string[];
}

interface EmailMessage {
  id: number;
  subject: string;
  from: string;
  receivedAt: string;
  preview: string | null;
  isTask: boolean;
}

const FOLLOWUP_PEOPLE = [
  "Georgie",
  "Nic",
  "Jo",
  "Jarrah",
  "Kieren",
  "Ashley",
  "Erin",
  "Praj",
  "None",
] as const;

export default function WorkTab() {
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [form, setForm] = useState({ title: "", context: "", dueDate: "", followupPeople: [] as string[] });

  async function refresh() {
    try {
      const [tasksRes, emailsRes] = await Promise.all([
        fetch("/api/work/tasks"),
        fetch("/api/emails"),
      ]);
      const tasksData = tasksRes.ok ? await tasksRes.json().catch(() => ({ tasks: [] })) : { tasks: [] };
      const emailsData = emailsRes.ok ? await emailsRes.json().catch(() => ({ emails: [] })) : { emails: [] };
      setTasks(
        (tasksData.tasks ?? []).map((t: any) => ({
          ...t,
          followupPeople: t.followupPeople ? JSON.parse(t.followupPeople) : [],
        })),
      );
      setEmails(emailsData.emails ?? []);
    } catch (err) {
      console.error("Failed to refresh work data", err);
    }
  }

  const tasksByStatus: Record<string, WorkTask[]> = {
    todo: tasks.filter((t) => t.status === "todo"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    done: tasks.filter((t) => t.status === "done"),
  };

  useEffect(() => {
    void (async () => {
      try {
        await refresh();
      } catch {
        // ignore initial load errors
      }
    })();
  }, []);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title) return;
    await fetch("/api/work/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ title: "", context: "", dueDate: "", followupPeople: [] });
    void refresh();
  }

  async function toggleStatus(task: WorkTask) {
    const nextStatus =
      task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
    await fetch("/api/work/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, status: nextStatus }),
    });
    void refresh();
  }

  async function updateTaskPeople(id: number, people: string[]) {
    await fetch("/api/work/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, followupPeople: people }),
    });
    void refresh();
  }

  async function addEmailAsTask(emailId: number) {
    await fetch("/api/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailId }),
    });
    void refresh();
  }

  async function syncEmails() {
    await fetch("/api/emails/poll");
    void refresh();
  }

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Work tasks</h2>
        <form onSubmit={addTask} className="grid gap-2 rounded-lg border bg-card p-3 md:grid-cols-4">
          <input
            className="rounded-md bg-background border border-border px-2 py-1 text-sm md:col-span-1"
            placeholder="Task title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <input
            className="rounded-md bg-background border border-border px-2 py-1 text-sm md:col-span-2"
            placeholder="Context (what are you doing?)"
            value={form.context}
            onChange={(e) => setForm((f) => ({ ...f, context: e.target.value }))}
          />
          <div className="md:col-span-4 space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground">People to follow up</div>
            <div className="flex flex-wrap gap-2">
              {FOLLOWUP_PEOPLE.map((p) => {
                const checked = form.followupPeople.includes(p);
                return (
                  <label key={p} className="flex items-center gap-1 text-[11px] text-foreground">
                    <input
                      type="checkbox"
                      className="h-3 w-3 rounded border-border bg-background"
                      checked={checked}
                      onChange={() =>
                        setForm((f) => {
                          const set = new Set(f.followupPeople);
                          if (set.has(p)) {
                            set.delete(p);
                          } else {
                            set.add(p);
                          }
                          if (p === "None" && set.has("None")) {
                            return { ...f, followupPeople: ["None"] };
                          }
                          set.delete("None");
                          return { ...f, followupPeople: Array.from(set) };
                        })
                      }
                    />
                    <span>{p}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <input
            type="date"
            className="rounded-md bg-background border border-border px-2 py-1 text-sm md:col-span-1"
            value={form.dueDate}
            onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
          />
          <button
            type="submit"
            className="md:col-span-4 rounded-md bg-indigo-500 py-1.5 text-xs font-semibold hover:bg-indigo-400"
          >
            Add task
          </button>
        </form>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Your tasks</h3>
          <button
            type="button"
            className="rounded-full border px-3 py-1 text-[11px] hover:bg-muted"
            onClick={() => void syncEmails()}
          >
            Sync Outlook emails
          </button>
        </div>
        <div className="space-y-2 rounded-lg border bg-card p-3 max-h-80 overflow-auto text-xs">
          {tasks.length === 0 && <p className="text-muted-foreground">No tasks yet.</p>}
          <div className="grid gap-3 md:grid-cols-3">
            {(["todo", "in_progress", "done"] as const).map((statusKey) => (
              <div key={statusKey} className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {statusKey === "todo"
                    ? "To-Do"
                    : statusKey === "in_progress"
                    ? "In Progress"
                    : "Done"}
                </div>
                {tasksByStatus[statusKey].length === 0 && (
                  <p className="text-[11px] text-muted-foreground">No items.</p>
                )}
                {tasksByStatus[statusKey].map((t) => (
                  <div
                    key={t.id}
                    className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0"
                  >
                    <div>
                      <div className="font-medium">{t.title}</div>
                      {t.context && <div className="text-muted-foreground whitespace-pre-line">{t.context}</div>}
                      {t.dueDate && (
                        <div className="text-muted-foreground">Due {new Date(t.dueDate).toLocaleDateString()}</div>
                      )}
                      {t.followupPeople && t.followupPeople.length > 0 && (
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          People: {t.followupPeople.join(", ")}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex flex-wrap gap-1">
                        {FOLLOWUP_PEOPLE.map((p) => {
                          const selected = t.followupPeople?.includes(p) ?? false;
                          return (
                            <button
                              key={p}
                              type="button"
                              className={`rounded-full border px-2 py-0.5 text-[9px] ${
                                selected
                                  ? "border-indigo-400 bg-indigo-500/20 text-indigo-100"
                                  : "border-slate-600 text-slate-300"
                              }`}
                              onClick={() => {
                                const set = new Set(t.followupPeople ?? []);
                                if (set.has(p)) {
                                  set.delete(p);
                                } else {
                                  set.add(p);
                                }
                                if (p === "None" && set.has("None")) {
                                  updateTaskPeople(t.id, ["None"]);
                                } else {
                                  set.delete("None");
                                  updateTaskPeople(t.id, Array.from(set));
                                }
                              }}
                            >
                              {p}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        className="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-200"
                        onClick={() => void toggleStatus(t)}
                      >
                        {t.status}
                      </button>
                      <button
                        className="rounded-full border border-red-600 px-2 py-0.5 text-[10px] text-red-200 hover:bg-red-900/40"
                        onClick={() => void fetch(`/api/work/tasks?id=${t.id}`, { method: "DELETE" }).then(() => refresh())}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-200">Recent emails</h3>
        <div className="space-y-2 rounded-lg bg-slate-900/60 p-3 max-h-80 overflow-auto text-xs">
          {emails.length === 0 && <p className="text-slate-500">No emails synced yet. Trigger a sync from Outlook.</p>}
          {emails.map((e) => (
            <div
              key={e.id}
              className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-2 last:border-0 last:pb-0"
            >
              <div>
                <div className="font-medium">{e.subject}</div>
                <div className="text-slate-400">
                  From {e.from} · {new Date(e.receivedAt).toLocaleString()}
                </div>
                {e.preview && <div className="text-slate-500 line-clamp-2">{e.preview}</div>}
              </div>
              <button
                className="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-200 disabled:opacity-40"
                disabled={e.isTask}
                onClick={() => void addEmailAsTask(e.id)}
              >
                {e.isTask ? "Added" : "Add as task"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

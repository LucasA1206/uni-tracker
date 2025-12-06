"use client";

import { useEffect, useState, useMemo, useCallback } from "react";

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
  hidden?: boolean;
}

interface EmailDetail extends EmailMessage {
  fullContent?: string;
}

export default function WorkTab() {
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [form, setForm] = useState({ title: "", context: "", dueDate: "", followupPeople: [] as string[] });
  const [people, setPeople] = useState<string[]>([]);
  const [newPersonName, setNewPersonName] = useState("");
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [loadingEmail, setLoadingEmail] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [tasksRes, emailsRes, peopleRes] = await Promise.all([
        fetch("/api/work/tasks"),
        fetch("/api/emails"),
        fetch("/api/work/people"),
      ]);
      const tasksData = tasksRes.ok ? await tasksRes.json().catch(() => ({ tasks: [] })) : { tasks: [] };
      const emailsData = emailsRes.ok ? await emailsRes.json().catch(() => ({ emails: [] })) : { emails: [] };
      const peopleData = peopleRes.ok ? await peopleRes.json().catch(() => ({ people: [] })) : { people: [] };
      setTasks(
        (tasksData.tasks ?? []).map((t: any) => ({
          ...t,
          followupPeople: t.followupPeople ? JSON.parse(t.followupPeople) : [],
        })),
      );
      setEmails(emailsData.emails ?? []);
      setPeople(peopleData.people ?? []);
    } catch (err) {
      console.error("Failed to refresh work data", err);
    }
  }, []);

  const addPerson = useCallback(async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName || people.includes(trimmedName)) return;

    try {
      const res = await fetch("/api/work/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });

      if (res.ok) {
        setPeople((prev) => [...prev, trimmedName]);
        setNewPersonName("");
      } else {
        const error = await res.json().catch(() => ({ error: "Failed to add person" }));
        console.error("Failed to add person:", error.error);
      }
    } catch (err) {
      console.error("Failed to add person", err);
    }
  }, [people]);

  const tasksByStatus = useMemo<Record<string, WorkTask[]>>(() => ({
    todo: tasks.filter((t) => t.status === "todo"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    done: tasks.filter((t) => t.status === "done"),
  }), [tasks]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addTask = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return;
    
    const taskData = { ...form };
    setForm({ title: "", context: "", dueDate: "", followupPeople: [] });
    
    // Optimistic update
    const tempId = Date.now();
    const newTask: WorkTask = {
      id: tempId,
      title: taskData.title,
      context: taskData.context || null,
      status: "todo",
      dueDate: taskData.dueDate || null,
      followupPeople: taskData.followupPeople,
    };
    setTasks((prev) => [newTask, ...prev]);
    
    try {
      await fetch("/api/work/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });
      void refresh();
    } catch (err) {
      // Revert on error
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      void refresh();
    }
  }, [form, refresh]);

  const toggleStatus = useCallback(async (task: WorkTask) => {
    const nextStatus =
      task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
    
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );
    
    try {
      await fetch("/api/work/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: nextStatus }),
      });
    } catch (err) {
      // Revert on error
      void refresh();
    }
  }, [refresh]);

  const updateTaskPeople = useCallback(async (id: number, people: string[]) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, followupPeople: people } : t))
    );
    
    try {
      await fetch("/api/work/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, followupPeople: people }),
      });
    } catch (err) {
      // Revert on error
      void refresh();
    }
  }, [refresh]);

  const addEmailAsTask = useCallback(async (emailId: number) => {
    try {
      await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId }),
      });
      void refresh();
    } catch (err) {
      console.error("Failed to add email as task", err);
    }
  }, [refresh]);

  const syncEmails = useCallback(async () => {
    try {
      await fetch("/api/emails/poll");
      void refresh();
    } catch (err) {
      console.error("Failed to sync emails", err);
    }
  }, [refresh]);

  const viewEmail = useCallback(async (email: EmailMessage) => {
    setLoadingEmail(true);
    try {
      const res = await fetch(`/api/emails/${email.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedEmail(data.email);
      } else {
        // Fallback to preview if full content fetch fails
        setSelectedEmail({ ...email, fullContent: email.preview || "No content available" });
      }
    } catch (err) {
      console.error("Failed to load email", err);
      setSelectedEmail({ ...email, fullContent: email.preview || "No content available" });
    } finally {
      setLoadingEmail(false);
    }
  }, []);

  const hideEmail = useCallback(async (emailId: number) => {
    // Optimistic update
    setEmails((prev) => prev.filter((e) => e.id !== emailId));
    
    try {
      await fetch(`/api/emails/${emailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: true }),
      });
    } catch (err) {
      // Revert on error
      void refresh();
    }
  }, [refresh]);

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
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-medium text-muted-foreground">People to follow up</div>
              <button
                type="button"
                onClick={() => setShowAddPerson(!showAddPerson)}
                className="rounded-md border border-border bg-background px-2 py-1 text-[11px] hover:bg-muted"
              >
                Add People
              </button>
            </div>
            {showAddPerson && (
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  className="rounded-md bg-background border border-border px-2 py-1 text-sm flex-1"
                  placeholder="Enter person name"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void addPerson(newPersonName);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => void addPerson(newPersonName)}
                  className="rounded-md bg-indigo-500 px-3 py-1 text-xs font-semibold hover:bg-indigo-400"
                >
                  Add
                </button>
              </div>
            )}
            {people.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {people.map((p) => {
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
                            return { ...f, followupPeople: Array.from(set) };
                          })
                        }
                      />
                      <span>{p}</span>
                    </label>
                  );
                })}
              </div>
            )}
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
            Sync emails
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
                      {people.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {people.map((p) => {
                            const selected = t.followupPeople?.includes(p) ?? false;
                            return (
                              <label
                                key={p}
                                className="flex items-center gap-1 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  className="h-3 w-3 rounded border-border bg-background"
                                  checked={selected}
                                  onChange={() => {
                                    const set = new Set(t.followupPeople ?? []);
                                    if (set.has(p)) {
                                      set.delete(p);
                                    } else {
                                      set.add(p);
                                    }
                                    updateTaskPeople(t.id, Array.from(set));
                                  }}
                                />
                                <span className="text-[9px] text-foreground">{p}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                      <button
                        className="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-200"
                        onClick={() => void toggleStatus(t)}
                      >
                        {t.status}
                      </button>
                      <button
                        className="rounded-full border border-red-600 px-2 py-0.5 text-[10px] text-red-200 hover:bg-red-900/40"
                        onClick={async () => {
                          // Optimistic update
                          setTasks((prev) => prev.filter((task) => task.id !== t.id));
                          try {
                            await fetch(`/api/work/tasks?id=${t.id}`, { method: "DELETE" });
                          } catch (err) {
                            // Revert on error
                            void refresh();
                          }
                        }}
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
        <h3 className="text-sm font-semibold text-foreground">Recent emails</h3>
        <div className="space-y-2 rounded-lg border bg-card p-3 max-h-[600px] overflow-auto text-xs">
          {emails.length === 0 && <p className="text-muted-foreground">No emails synced yet. Click "Sync emails" to fetch emails.</p>}
          {emails.map((e) => (
            <div
              key={e.id}
              className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
              onClick={() => void viewEmail(e)}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">{e.subject}</div>
                <div className="text-muted-foreground text-[11px]">
                  From {e.from} · {new Date(e.receivedAt).toLocaleString()}
                </div>
                {e.preview && <div className="text-muted-foreground line-clamp-2 mt-1">{e.preview}</div>}
              </div>
              <div className="flex gap-1 items-start" onClick={(event) => event.stopPropagation()}>
                <button
                  className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-foreground hover:bg-muted disabled:opacity-40"
                  disabled={e.isTask}
                  onClick={() => void addEmailAsTask(e.id)}
                >
                  {e.isTask ? "Added" : "Add as task"}
                </button>
                <button
                  className="rounded-full border border-red-600 px-2 py-0.5 text-[10px] text-red-200 hover:bg-red-900/40"
                  onClick={() => void hideEmail(e.id)}
                  title="Hide email"
                >
                  Hide
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSelectedEmail(null)}>
          <div
            className="w-full max-w-3xl max-h-[90vh] rounded-xl bg-card border border-border p-6 text-sm shadow-xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-foreground truncate">{selectedEmail.subject}</h3>
                <div className="text-xs text-muted-foreground mt-1">
                  From: {selectedEmail.from} · {new Date(selectedEmail.receivedAt).toLocaleString()}
                </div>
              </div>
              <button
                className="rounded-full border border-border px-3 py-1 text-xs text-foreground hover:bg-muted ml-4"
                onClick={() => setSelectedEmail(null)}
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-auto border-t border-border pt-4">
              {loadingEmail ? (
                <p className="text-muted-foreground">Loading email content...</p>
              ) : (
                <div className="text-foreground whitespace-pre-wrap break-words">
                  {selectedEmail.fullContent || selectedEmail.preview || "No content available"}
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-border">
              <button
                className="rounded-md bg-indigo-500 px-4 py-2 text-xs font-semibold hover:bg-indigo-400 disabled:opacity-40"
                disabled={selectedEmail.isTask}
                onClick={() => {
                  void addEmailAsTask(selectedEmail.id);
                  setSelectedEmail(null);
                }}
              >
                {selectedEmail.isTask ? "Already Added" : "Add as Task"}
              </button>
              <button
                className="rounded-md border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                onClick={() => {
                  void hideEmail(selectedEmail.id);
                  setSelectedEmail(null);
                }}
              >
                Hide Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

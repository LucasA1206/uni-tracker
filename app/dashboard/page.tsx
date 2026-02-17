"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/ui/vision/Shell";
import Card from "@/components/ui/vision/Card";
import UniTab from "./uni-tab";
import WorkTab from "./work-tab";
import CalendarTab from "./calendar-tab";
import FinanceTab from "./finance-tab";
import NotesTab from "./notes-tab";

const TABS = ["Uni", "Work", "Calendar", "Finance", "Notes"] as const;
type Tab = (typeof TABS)[number];

interface AccountInfo {
  name: string;
  username: string;
  universityEmail: string;
  canvasApiToken?: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Uni");
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  const [accountOpen, setAccountOpen] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  async function loadAccount() {
    try {
      setAccountLoading(true);
      setAccountError(null);
      const res = await fetch("/api/account/me");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          // Unauthorized - redirect to login
          router.replace("/login");
          return;
        }
        setAccountError(data.error ?? "Failed to load account");
        return;
      }
      setAccount({
        name: data.user.name,
        username: data.user.username,
        universityEmail: data.user.universityEmail,
        canvasApiToken: data.user.canvasApiToken ?? "",
      });
    } catch (err) {
      console.error(err);
      // On error, try to redirect to login if it's an auth issue
      router.replace("/login");
    } finally {
      setAccountLoading(false);
    }
  }

  useEffect(() => {
    void loadAccount();
    try {
      const stored = typeof window !== "undefined" ? window.localStorage.getItem("theme") : null;
      setTheme(stored === "light" ? "light" : "dark");
    } catch { }
  }, []);

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    setAccountSaving(true);
    setAccountError(null);
    setAccountSuccess(null);

    try {
      const res = await fetch("/api/account/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: account.name,
          username: account.username,
          universityEmail: account.universityEmail,
          canvasApiToken: account.canvasApiToken ?? "",
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
          confirmNewPassword: confirmNewPassword || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAccountError(data.error ?? "Failed to update account");
        return;
      }
      setAccount({
        name: data.user.name,
        username: data.user.username,
        universityEmail: data.user.universityEmail,
        canvasApiToken: data.user.canvasApiToken ?? "",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setAccountSuccess("Account updated");
    } catch (err) {
      console.error(err);
      setAccountError("Failed to update account");
    } finally {
      setAccountSaving(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      router.replace("/login");
    }
  }

  async function deleteAccount() {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Are you sure you want to delete your account? This will permanently remove all of your data."
      );
      if (!confirmed) return;
    }

    setAccountError(null);
    setAccountSuccess(null);

    try {
      const res = await fetch("/api/account/me", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAccountError(data.error ?? "Failed to delete account");
        return;
      }
      router.replace("/signup");
    } catch (err) {
      console.error("Delete account failed", err);
      setAccountError("Failed to delete account");
    }
  }

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <Shell tab={tab} onTabChange={setTab} onOpenAccount={() => setAccountOpen(true)}>
        {tab === "Uni" && (
          <Card className="p-4">
            <UniTab />
          </Card>
        )}
        {tab === "Work" && (
          <Card className="p-4">
            <WorkTab />
          </Card>
        )}
        {tab === "Calendar" && (
          <Card className="p-4">
            <CalendarTab />
          </Card>
        )}
        {tab === "Finance" && (
          <Card className="p-4">
            <FinanceTab />
          </Card>
        )}
        {tab === "Notes" && (
          <Card className="p-4">
            <NotesTab />
          </Card>
        )}

        {accountOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-lg rounded-xl bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2E] p-6 text-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Account details</h2>
                <button
                  type="button"
                  className="rounded-full border border-gray-200 dark:border-[#2A2A2E] px-3 py-1 text-xs text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => {
                    setAccountOpen(false);
                    setAccountError(null);
                    setAccountSuccess(null);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmNewPassword("");
                  }}
                >
                  Close
                </button>
              </div>

              {accountLoading && <p className="text-gray-500 dark:text-gray-400">Loading account details...</p>}
              {!accountLoading && account && (
                <form onSubmit={saveAccount} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Name
                    </label>
                    <input
                      className="w-full rounded-md bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2E] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={account.name}
                      onChange={(e) =>
                        setAccount((prev) =>
                          prev ? { ...prev, name: e.target.value } : prev
                        )
                      }
                    />
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium mb-1">Theme</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setTheme("light");
                            try { window.localStorage.setItem("theme", "light"); } catch { }
                          }}
                          className={`rounded-md border px-3 py-1 text-xs ${theme === "light" ? "bg-gray-200 dark:bg-gray-700" : ""}`}
                        >
                          Light
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTheme("dark");
                            try { window.localStorage.setItem("theme", "dark"); } catch { }
                          }}
                          className={`rounded-md border px-3 py-1 text-xs ${theme === "dark" ? "bg-gray-200 dark:bg-gray-700" : ""}`}
                        >
                          Dark
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Choose your preferred color mode for the dashboard.</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Username
                    </label>
                    <input
                      className="w-full rounded-md bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2E] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={account.username}
                      onChange={(e) =>
                        setAccount((prev) =>
                          prev ? { ...prev, username: e.target.value } : prev
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      University email
                    </label>
                    <input
                      type="email"
                      className="w-full rounded-md bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2E] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={account.universityEmail}
                      onChange={(e) =>
                        setAccount((prev) =>
                          prev
                            ? { ...prev, universityEmail: e.target.value }
                            : prev
                        )
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Canvas API Key
                    </label>
                    <input
                      type="password"
                      className="w-full rounded-md bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2E] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={account.canvasApiToken ?? ""}
                      onChange={(e) =>
                        setAccount((prev) =>
                          prev
                            ? { ...prev, canvasApiToken: e.target.value }
                            : prev
                        )
                      }
                    />
                    <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                      This key is stored per-account and used to sync your
                      courses and assignments from Canvas.
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-200 dark:border-[#2A2A2E] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-900 dark:text-white">Password</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Hidden for security</span>
                    </div>
                    <p className="text-sm tracking-[0.3em] text-gray-500 dark:text-gray-400">********</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      To change your password, enter your current password and a
                      new one below.
                    </p>
                    <div className="grid gap-2 md:grid-cols-3 mt-2">
                      <input
                        type="password"
                        placeholder="Current password"
                        className="rounded-md bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2E] px-2 py-1 text-xs"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                      <input
                        type="password"
                        placeholder="New password"
                        className="rounded-md bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2E] px-2 py-1 text-xs"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <input
                        type="password"
                        placeholder="Confirm new password"
                        className="rounded-md bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2E] px-2 py-1 text-xs"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  {accountError && (
                    <p className="text-sm text-red-400">{accountError}</p>
                  )}
                  {accountSuccess && !accountError && (
                    <p className="text-sm text-emerald-400">
                      {accountSuccess}
                    </p>
                  )}

                  <div className="flex flex-col gap-2 mt-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="submit"
                        disabled={accountSaving}
                        className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold hover:bg-indigo-400 disabled:opacity-60"
                      >
                        {accountSaving ? "Saving..." : "Save changes"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void logout()}
                        className="rounded-md border border-gray-200 dark:border-[#1F1F23] px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        Log out
                      </button>
                    </div>
                    <div className="flex flex-col items-start gap-1 text-left sm:items-end">
                      <button
                        type="button"
                        onClick={() => void deleteAccount()}
                        className="rounded-md border border-red-700 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-900/60"
                      >
                        Delete account
                      </button>
                      <a
                        href="/privacy-policy"
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline-offset-2 hover:underline mt-1"
                      >
                        Privacy Policy
                      </a>
                    </div>
                  </div>
                </form>
              )}

              {!accountLoading && !account && !accountError && (
                <p className="text-gray-500 dark:text-gray-400">No account information found.</p>
              )}

              {accountError && !account && (
                <p className="mt-2 text-sm text-red-400">{accountError}</p>
              )}
            </div>
          </div>
        )}
      </Shell>
    </div>
  );
}

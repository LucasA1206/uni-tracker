"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import UniTab from "./uni-tab";
import WorkTab from "./work-tab";
import CalendarTab from "./calendar-tab";

const TABS = ["Uni", "Work", "Calendar"] as const;
type Tab = (typeof TABS)[number];

interface AccountInfo {
  name: string;
  username: string;
  universityEmail: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Uni");

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
        setAccountError(data.error ?? "Failed to load account");
        return;
      }
      setAccount({
        name: data.user.name,
        username: data.user.username,
        universityEmail: data.user.universityEmail,
      });
    } catch (err) {
      console.error(err);
      setAccountError("Failed to load account");
    } finally {
      setAccountLoading(false);
    }
  }

  useEffect(() => {
    void loadAccount();
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
        "Are you sure you want to delete your account? This will permanently remove all of your data.",
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
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAccountOpen(true)}
            className="flex items-center gap-2 rounded-full border border-slate-600 px-3 py-1 text-sm text-slate-100 hover:bg-slate-800"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Account</span>
          </button>
          <h1 className="text-xl font-semibold">Uni &amp; Work Tracker</h1>
        </div>
        <nav className="flex gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                tab === t
                  ? "bg-indigo-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>

      <main className="p-6 space-y-4">
        {tab === "Uni" && <UniTab />}
        {tab === "Work" && <WorkTab />}
        {tab === "Calendar" && <CalendarTab />}
      </main>

      {accountOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 p-6 text-sm shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Account details</h2>
              <button
                type="button"
                className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
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

            {accountLoading && <p className="text-slate-300">Loading account			details...</p>}
            {!accountLoading && account && (
              <form onSubmit={saveAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Name</label>
                  <input
                    className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={account.name}
                    onChange={(e) => setAccount((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Username</label>
                  <input
                    className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={account.username}
                    onChange={(e) => setAccount((prev) => (prev ? { ...prev, username: e.target.value } : prev))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">University email</label>
                  <input
                    type="email"
                    className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={account.universityEmail}
                    onChange={(e) =>
                      setAccount((prev) => (prev ? { ...prev, universityEmail: e.target.value } : prev))
                    }
                  />
                </div>

                <div className="rounded-md bg-slate-900/80 border border-slate-700 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">Password</span>
                    <span className="text-xs text-slate-500">Hidden for security</span>
                  </div>
                  <p className="text-sm tracking-[0.3em] text-slate-400">********</p>
                  <p className="text-xs text-slate-400">
                    To change your password, enter your current password and a new one below.
                  </p>
                  <div className="grid gap-2 md:grid-cols-3 mt-2">
                    <input
                      type="password"
                      placeholder="Current password"
                      className="rounded-md bg-slate-800 border border-slate-700 px-2 py-1 text-xs"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <input
                      type="password"
                      placeholder="New password"
                      className="rounded-md bg-slate-800 border border-slate-700 px-2 py-1 text-xs"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      className="rounded-md bg-slate-800 border border-slate-700 px-2 py-1 text-xs"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                    />
                  </div>
                </div>

                {accountError && <p className="text-sm text-red-400">{accountError}</p>}
                {accountSuccess && !accountError && (
                  <p className="text-sm text-emerald-400">{accountSuccess}</p>
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
                      className="rounded-md border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
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
                  </div>
                </div>
              </form>
            )}

            {!accountLoading && !account && !accountError && (
              <p className="text-slate-400">No account information found.</p>
            )}

            {accountError && !account && (
              <p className="mt-2 text-sm text-red-400">{accountError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MinimalAuthPage } from "@/components/ui/minimal-auth-page";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        router.replace("/dashboard");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Login failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MinimalAuthPage
      title="Login"
      description="Log in to manage uni assignments, grades, notes, work tasks, and your calendar."
    >
      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
        <div>
          <label className="block text-sm font-medium mb-1 text-white">
            Username
          </label>
          <input
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
            name="username"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-white">
            Password
          </label>
          <input
            type="password"
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
            name="password"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-white text-black hover:bg-gray-200"
        >
          {loading ? "Logging in..." : "Log in"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-white">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={() => router.push("/signup")}
          className="text-white hover:text-gray-300 underline-offset-2 hover:underline"
        >
          Sign up here
        </button>
      </p>
    </MinimalAuthPage>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MinimalAuthPage } from "@/components/ui/minimal-auth-page";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function startSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          username,
          universityEmail: email,
          password,
          confirmPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Could not sign up");
        return;
      }

      // User is created and logged in by the API; go to dashboard
      router.replace("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MinimalAuthPage
      title="Create your account"
      description="Sign up with your email to use a University & Work Tracker which will sync your Canvas data."
    >
      <form onSubmit={startSignup} className="space-y-4" autoComplete="off">
        <div>
          <label className="block text-sm font-medium mb-1 text-white">
            Name
          </label>
          <input
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            name="name"
          />
        </div>

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
            Email
          </label>
          <input
            type="email"
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            name="email"
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
            autoComplete="new-password"
            name="password"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-white">
            Confirm password
          </label>
          <input
            type="password"
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            name="confirmPassword"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-white text-black hover:bg-gray-200"
        >
          {loading ? "Creating account..." : "Sign up"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-white">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="text-white hover:text-gray-300 underline-offset-2 hover:underline"
        >
          Log in here
        </button>
      </p>
    </MinimalAuthPage>
  );
}
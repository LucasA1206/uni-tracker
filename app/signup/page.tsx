"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ParticlesBackground from "@/components/ParticlesBackground";

type Step = "form" | "verify";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [universityEmail, setUniversityEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [code, setCode] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function startSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, universityEmail, password, confirmPassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Could not start sign-up");
        return;
      }

      setStep("verify");
      setInfo("We have sent a verification code to your university email. Enter it below to finish creating your account.");
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, universityEmail, code }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Verification failed");
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
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 -z-10">
        <ParticlesBackground />
      </div>

      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md rounded-2xl bg-slate-900/70 p-8 shadow-xl backdrop-blur">
          <h1 className="mb-2 text-2xl font-bold text-center">Create your account</h1>
          <p className="mb-6 text-sm text-center text-slate-300">
            Sign up with your university email to use Uni &amp; Work Tracker and sync your Canvas data.
          </p>

          {step === "form" && (
            <form onSubmit={startSignup} className="space-y-4" autoComplete="off">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  name="name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="off"
                  name="username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">University email</label>
                <input
                  type="email"
                  className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={universityEmail}
                  onChange={(e) => setUniversityEmail(e.target.value)}
                  autoComplete="off"
                  name="universityEmail"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  name="password"
                />
                <p className="mt-1 text-xs text-slate-400">
                  At least 8 characters, including letters and numbers.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Confirm password</label>
                <input
                  type="password"
                  className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  name="confirmPassword"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
              {info && !error && <p className="text-sm text-emerald-400">{info}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-indigo-500 py-2 text-sm font-semibold hover:bg-indigo-400 transition-colors disabled:opacity-60"
              >
                {loading ? "Sending code..." : "Send verification code"}
              </button>

              <p className="mt-4 text-center text-sm text-slate-300">
                Already have an account?{
                  " "
                }
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="text-indigo-300 hover:text-indigo-200 underline-offset-2 hover:underline"
                >
                  Log in
                </button>
              </p>
            </form>
          )}

          {step === "verify" && (
            <form onSubmit={verifyCode} className="space-y-4" autoComplete="off">
              <p className="text-sm text-slate-300">
                Enter the 6-digit code we sent to <span className="font-semibold">{universityEmail}</span>.
              </p>

              <div>
                <label className="block text-sm font-medium mb-1">Verification code</label>
                <input
                  className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={code}
                  onChange={(e) => setCode(e.target.value.trim())}
                  maxLength={6}
                  autoComplete="off"
                  name="code"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
              {info && !error && <p className="text-sm text-emerald-400">{info}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-indigo-500 py-2 text-sm font-semibold hover:bg-indigo-400 transition-colors disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify and create account"}
              </button>

              <button
                type="button"
                onClick={() => setStep("form")}
                className="w-full mt-2 rounded-md border border-slate-700 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
              >
                Back to details
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

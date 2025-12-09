"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function OAuthConsentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [provider, setProvider] = useState<string | null>(null);

  useEffect(() => {
    const providerParam = searchParams.get("provider");
    setProvider(providerParam);
  }, [searchParams]);

  const handleConnect = () => {
    if (provider === "gmail") {
      window.location.href = "/api/integrations/gmail/login";
    } else if (provider === "outlook") {
      window.location.href = "/api/integrations/microsoft/login";
    } else {
      router.push("/dashboard");
    }
  };

  const handleCancel = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl rounded-lg border bg-card p-6 md:p-8">
        <h1 className="mb-6 text-2xl font-bold text-foreground">Connect {provider === "gmail" ? "Gmail" : provider === "outlook" ? "Outlook" : "Account"}</h1>

        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">What We'll Access</h2>
            <div className="space-y-3 text-foreground">
              {provider === "gmail" ? (
                <>
                  <div className="rounded-lg border border-border bg-muted/50 p-4">
                    <h3 className="mb-2 font-semibold">Gmail (Read-Only)</h3>
                    <ul className="ml-4 list-disc space-y-1 text-sm">
                      <li>Read your emails to identify task-related messages</li>
                      <li>Display recent emails in your work dashboard</li>
                      <li>Convert emails with keywords (due, assignment, task) into actionable tasks</li>
                      <li>Allow you to read full email content and hide processed emails</li>
                    </ul>
                    <p className="mt-2 text-xs text-muted-foreground">
                      We never send, modify, or delete emails. You can revoke access anytime.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/50 p-4">
                    <h3 className="mb-2 font-semibold">Google Calendar (Read-Only)</h3>
                    <ul className="ml-4 list-disc space-y-1 text-sm">
                      <li>Read your calendar events to display them alongside assignments and tasks</li>
                      <li>Sync events when you connect your account</li>
                      <li>Show a unified calendar view with all your commitments</li>
                    </ul>
                    <p className="mt-2 text-xs text-muted-foreground">
                      We never create, modify, or delete calendar events. You can revoke access anytime.
                    </p>
                  </div>
                </>
              ) : provider === "outlook" ? (
                <>
                  <div className="rounded-lg border border-border bg-muted/50 p-4">
                    <h3 className="mb-2 font-semibold">Outlook Mail (Read-Only)</h3>
                    <ul className="ml-4 list-disc space-y-1 text-sm">
                      <li>Read your emails to identify task-related messages</li>
                      <li>Display recent emails in your work dashboard</li>
                      <li>Convert emails with keywords into actionable tasks</li>
                    </ul>
                    <p className="mt-2 text-xs text-muted-foreground">
                      We never send, modify, or delete emails. You can revoke access anytime.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/50 p-4">
                    <h3 className="mb-2 font-semibold">Outlook Calendar (Read-Only)</h3>
                    <ul className="ml-4 list-disc space-y-1 text-sm">
                      <li>Read your calendar events to display them in your calendar view</li>
                      <li>Show events alongside assignments and tasks</li>
                    </ul>
                    <p className="mt-2 text-xs text-muted-foreground">
                      We never create, modify, or delete calendar events. You can revoke access anytime.
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Please select a provider to see what we'll access.</p>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">How We Use Your Data</h2>
            <ul className="ml-4 list-disc space-y-2 text-sm text-foreground">
              <li>All data is stored securely and associated only with your account</li>
              <li>We never share your email or calendar data with third parties</li>
              <li>You can disconnect your account at any time through your account settings</li>
              <li>You can revoke access through your Google or Microsoft account settings</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">Privacy & Security</h2>
            <p className="text-sm text-foreground">
              We use industry-standard security measures to protect your data. All access tokens are encrypted and stored securely. 
              For more details, please review our{" "}
              <a href="/privacy-policy" className="text-indigo-500 hover:underline">
                Privacy Policy
              </a>
              .
            </p>
          </section>

          <div className="flex gap-4 pt-4">
            <button
              onClick={handleConnect}
              disabled={!provider}
              className="flex-1 rounded-md bg-indigo-500 px-4 py-2 font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
            >
              Connect {provider === "gmail" ? "Gmail" : provider === "outlook" ? "Outlook" : "Account"}
            </button>
            <button
              onClick={handleCancel}
              className="rounded-md border border-border px-4 py-2 font-semibold text-foreground hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OAuthConsentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-2xl rounded-lg border bg-card p-6 md:p-8">
          <p className="text-foreground">Loading...</p>
        </div>
      </div>
    }>
      <OAuthConsentContent />
    </Suspense>
  );
}


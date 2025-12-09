import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Uni Tracker",
  description: "Privacy Policy for Uni Tracker",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl rounded-lg border bg-card p-6 md:p-8">
        <h1 className="mb-6 text-3xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mb-4 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
          <p className="text-foreground">
            Uni Tracker ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our application.
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">2. Information We Collect</h2>
          <div className="space-y-2 text-foreground">
            <h3 className="font-semibold">2.1 Account Information</h3>
            <p>When you create an account, we collect:</p>
            <ul className="ml-6 list-disc space-y-1">
              <li>Name</li>
              <li>Username</li>
              <li>University email address</li>
              <li>Password (stored as a hashed value)</li>
            </ul>

            <h3 className="mt-4 font-semibold">2.2 Academic Data</h3>
            <p>You may choose to provide:</p>
            <ul className="ml-6 list-disc space-y-1">
              <li>University courses and assignments</li>
              <li>Grades and academic notes</li>
              <li>Work tasks and deadlines</li>
            </ul>

            <h3 className="mt-4 font-semibold">2.3 Email and Calendar Integration</h3>
            <p>If you connect your Gmail or Outlook account, we access:</p>
            <ul className="ml-6 list-disc space-y-1">
              <li>Email messages (read-only) for task detection and display</li>
              <li>Calendar events (read-only) for unified calendar view</li>
            </ul>
            <p className="mt-2 text-sm text-muted-foreground">
              We only access data with your explicit permission. You can revoke access at any time through your Google or Microsoft account settings.
            </p>
          </div>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">3. How We Use Your Information</h2>
          <ul className="ml-6 list-disc space-y-2 text-foreground">
            <li>To provide and maintain our service</li>
            <li>To identify task-related emails and convert them to tasks</li>
            <li>To display your calendar events alongside assignments and tasks</li>
            <li>To personalize your experience</li>
            <li>To communicate with you about your account</li>
          </ul>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">4. Data Storage and Security</h2>
          <div className="space-y-2 text-foreground">
            <p>Your data is stored securely in our database and is:</p>
            <ul className="ml-6 list-disc space-y-1">
              <li>Associated only with your user account</li>
              <li>Never shared with third parties</li>
              <li>Protected using industry-standard security measures</li>
              <li>Accessible only to you when logged in</li>
            </ul>
            <p className="mt-2">
              We use secure authentication tokens for email and calendar access. These tokens are stored encrypted and can be revoked by you at any time.
            </p>
          </div>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">5. Third-Party Services</h2>
          <div className="space-y-2 text-foreground">
            <p>We integrate with the following third-party services:</p>
            <ul className="ml-6 list-disc space-y-1">
              <li><strong>Google (Gmail & Calendar)</strong>: For email and calendar access. Subject to Google's Privacy Policy.</li>
              <li><strong>Microsoft (Outlook)</strong>: For email and calendar access. Subject to Microsoft's Privacy Policy.</li>
              <li><strong>Canvas LMS</strong>: For syncing course and assignment data (if you provide your API token).</li>
            </ul>
            <p className="mt-2">
              We only access data you explicitly authorize. We do not share your data with these services beyond what is necessary for integration.
            </p>
          </div>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">6. Your Rights</h2>
          <p className="text-foreground">You have the right to:</p>
          <ul className="ml-6 list-disc space-y-1 text-foreground">
            <li>Access your personal data</li>
            <li>Update or correct your information</li>
            <li>Delete your account and all associated data</li>
            <li>Revoke access to email and calendar integrations</li>
            <li>Export your data</li>
          </ul>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">7. Data Retention</h2>
          <p className="text-foreground">
            We retain your data for as long as your account is active. When you delete your account, all associated data is permanently removed from our systems.
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">8. Children's Privacy</h2>
          <p className="text-foreground">
            Our service is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13.
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">9. Changes to This Policy</h2>
          <p className="text-foreground">
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">10. Contact Us</h2>
          <p className="text-foreground">
            If you have questions about this Privacy Policy, please contact us through your account settings or by emailing the support address associated with your account.
          </p>
        </section>
      </div>
    </div>
  );
}


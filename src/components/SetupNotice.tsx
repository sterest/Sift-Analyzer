import Link from "next/link";

/** Shown in place of account pages until the Supabase project is connected. */
export function SetupNotice() {
  // Visitors to the live site see a short notice; the setup steps are only for the developer's own machine.
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="panel stack setup">
        <h1>Accounts are coming soon</h1>
        <p>Signing in and saving dashboards aren&apos;t available yet.</p>
        <p>You can already <Link href="/try">analyze a file without an account</Link>. It&apos;s read in your browser and never uploaded.</p>
      </div>
    );
  }
  return (
    <div className="panel stack setup">
      <h1>Accounts aren&apos;t connected yet</h1>
      <p>Sign-in and saved dashboards need a Supabase project. To connect one:</p>
      <ol>
        <li>Create a free project at supabase.com.</li>
        <li>In its SQL Editor, run the file <code>supabase/schema.sql</code> from this project.</li>
        <li>Copy <code>.env.example</code> to <code>.env.local</code> and fill in the project URL and publishable key from Project Settings → API Keys.</li>
        <li>Restart the dev server.</li>
      </ol>
      <p>Until then you can still <Link href="/try">analyze a file without an account</Link>.</p>
    </div>
  );
}

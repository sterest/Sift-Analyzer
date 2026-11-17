import { Suspense } from "react";
import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Sift home">
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="13" width="4" height="8" rx="1.5" fill="currentColor" opacity=".45" />
        <rect x="10" y="8" width="4" height="13" rx="1.5" fill="currentColor" opacity=".7" />
        <rect x="17" y="3" width="4" height="18" rx="1.5" fill="currentColor" />
      </svg>
      Sift
    </Link>
  );
}

function SignedOutNav() {
  return (
    <>
      <Link href="/try">Try it</Link>
      <Link href="/login">Sign in</Link>
      <Link href="/signup" className="btn btn-primary">Create account</Link>
    </>
  );
}

/** Reads the session cookie, so it streams in behind a Suspense boundary. */
async function AccountNav() {
  if (!isSupabaseConfigured) return <SignedOutNav />;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) return <SignedOutNav />;
  return (
    <>
      <Link href="/app">Your datasets</Link>
      <span className="who" title={email}>{email}</span>
      <form action={signOut}><button className="btn btn-quiet" type="submit">Sign out</button></form>
    </>
  );
}

export function SiteHeader() {
  return (
    <header className="sitehead">
      <div className="wrap sitehead-in">
        <Brand />
        <nav className="sitenav" aria-label="Account">
          <Suspense fallback={<span className="who" aria-hidden="true" />}>
            <AccountNav />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}

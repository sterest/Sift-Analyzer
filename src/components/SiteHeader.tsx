import { Suspense } from "react";
import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Sift home">
      <svg width="22" height="22" viewBox="0 0 512 512" aria-hidden="true">
        <rect width="512" height="512" rx="112" fill="#111"/>
        <rect x="102" y="78"  width="205" height="36" rx="18" fill="#fff" opacity=".95"/>
        <rect x="154" y="148" width="256" height="36" rx="18" fill="#fff" opacity=".85"/>
        <rect x="205" y="218" width="205" height="36" rx="18" fill="#fff" opacity=".75"/>
        <rect x="154" y="288" width="256" height="36" rx="18" fill="#fff" opacity=".65"/>
        <rect x="102" y="358" width="205" height="36" rx="18" fill="#fff" opacity=".55"/>
        <rect x="205" y="428" width="205" height="36" rx="18" fill="#fff" opacity=".45"/>
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
      <Link href="/app/account" className="who" title={`Account: ${email}`}>{email}</Link>
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

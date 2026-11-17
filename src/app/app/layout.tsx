import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SetupNotice } from "@/components/SetupNotice";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/** Checks the session on the server too; the proxy's redirect is only a fast first check. */
async function RequireUser({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return <>{children}</>;
}

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <>
      <SiteHeader />
      {isSupabaseConfigured ? (
        <main className="wrap page">
          <Suspense fallback={<p className="emptymsg" role="status">Loading…</p>}>
            <RequireUser>{children}</RequireUser>
          </Suspense>
        </main>
      ) : (
        <main className="wrap auth"><SetupNotice /></main>
      )}
      <SiteFooter />
    </>
  );
}

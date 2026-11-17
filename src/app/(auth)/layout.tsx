import { Suspense } from "react";
import { SetupNotice } from "@/components/SetupNotice";
import { SiteHeader } from "@/components/SiteHeader";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="wrap auth">
        {isSupabaseConfigured ? (
          <div className="panel authcard">
            <Suspense fallback={null}>{children}</Suspense>
          </div>
        ) : (
          <SetupNotice />
        )}
      </main>
    </>
  );
}

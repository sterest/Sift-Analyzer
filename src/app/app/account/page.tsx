import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AccountTools } from "./AccountTools";

export const metadata: Metadata = { title: "Account" };

const when = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "–";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user!;
  const { count: datasets } = await supabase.from("datasets").select("id", { count: "exact", head: true });
  const { count: views } = await supabase.from("dashboards").select("id", { count: "exact", head: true });

  return (
    <div className="stack-lg">
      <div className="pagehead">
        <h1>Account</h1>
        <p className="muted">Your details, your data and how to delete it. See the <Link href="/privacy">privacy policy</Link> for the full picture.</p>
      </div>
      <section className="panel stack" aria-labelledby="h-details">
        <h2 id="h-details">Your details</h2>
        <dl className="kv">
          <dt>Email</dt><dd>{user.email}</dd>
          <dt>Account created</dt><dd>{when(user.created_at)}</dd>
          <dt>Last sign-in</dt><dd>{when(user.last_sign_in_at)}</dd>
          <dt>Stored</dt><dd>{datasets ?? 0} dataset{datasets === 1 ? "" : "s"}, {views ?? 0} saved view{views === 1 ? "" : "s"}</dd>
        </dl>
      </section>
      <AccountTools />
    </div>
  );
}

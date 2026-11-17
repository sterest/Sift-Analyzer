import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="wrap auth">
        <div className="panel authcard">
          <h1>Page not found</h1>
          <p className="muted">This page doesn&apos;t exist, or it belongs to another account.</p>
          <p><Link href="/app">Go to your datasets</Link></p>
        </div>
      </main>
    </>
  );
}

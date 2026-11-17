import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TryWorkspace } from "./TryWorkspace";

export const metadata: Metadata = { title: "Try Sift" };

export default function TryPage() {
  return (
    <>
      <SiteHeader />
      <main className="wrap page">
        <TryWorkspace />
      </main>
      <SiteFooter />
    </>
  );
}

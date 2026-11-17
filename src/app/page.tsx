import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

const FEATURES = [
  {
    title: "Findings in plain words",
    body: "Missing values, duplicate rows, outliers, lopsided columns and the pairs of numbers that move together, each written as a sentence you can act on.",
  },
  {
    title: "A dashboard that builds itself",
    body: "Headline totals, a trend over time and breakdowns by every category column. Filter by region, product or period and every chart follows.",
  },
  {
    title: "Saved to your account",
    body: "Upload once and come back later. Save the views you use as named dashboards. Files are stored privately and only you can open them.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="wrap hero-in">
            <h1>Open a spreadsheet. See what&apos;s in it.</h1>
            <p className="lede">
              Sift reads CSV, Excel and JSON files, profiles every column and turns them into a dashboard you can filter, save and come back to.
            </p>
            <div className="actions">
              <Link href="/signup" className="btn btn-primary btn-lg">Create a free account</Link>
              <Link href="/try" className="btn btn-lg">Try it without an account</Link>
            </div>
          </div>
        </section>
        <section className="wrap features" aria-label="What Sift does">
          {FEATURES.map((f) => (
            <article key={f.title} className="feature">
              <h2>{f.title}</h2>
              <p>{f.body}</p>
            </article>
          ))}
        </section>
      </main>
      <footer className="wrap sitefoot">
        <span>Sift</span>
        <span>Files you try without an account are read in your browser and never uploaded.</span>
      </footer>
    </>
  );
}

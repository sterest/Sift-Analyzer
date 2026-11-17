import Link from "next/link";
import { InstallButton } from "./InstallButton";

export function SiteFooter() {
  return (
    <footer className="sitefoot">
      <div className="wrap sitefoot-in">
        <span>Sift</span>
        <nav className="sitefoot-nav" aria-label="Site">
          <Link href="/try">Try it</Link>
          <Link href="/privacy">Privacy policy</Link>
          <InstallButton />
        </nav>
      </div>
    </footer>
  );
}

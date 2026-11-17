import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { LEGAL, legalIsDraft } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Sift collects, why, who it is shared with, how long it is kept and how to delete it.",
};

const SECTIONS = [
  ["who", "Who we are"],
  ["collect", "What we collect"],
  ["use", "How we use it"],
  ["share", "Who we share it with"],
  ["where", "Where it is stored"],
  ["keep", "How long we keep it"],
  ["security", "How we protect it"],
  ["rights", "Your rights and choices"],
  ["cookies", "Cookies"],
  ["children", "Children"],
  ["changes", "Changes to this policy"],
  ["contact", "Contact"],
] as const;

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="wrap page">
        <article className="legal">
          <header className="legal-head">
            <h1>Privacy policy</h1>
            <p className="muted">Effective {LEGAL.effectiveDate}</p>
            {legalIsDraft && (
              <p className="chip-warn legal-draft" role="note">
                Draft. The operator&apos;s details in <code>src/lib/legal.ts</code> are still placeholders. Fill them in and have the policy reviewed before launch.
              </p>
            )}
          </header>

          <section className="legal-summary" aria-labelledby="summary">
            <h2 id="summary">The short version</h2>
            <ul>
              <li>We collect your email address (and, if you sign in with Google, your name and profile picture), the files you upload and the dashboard views you save, so we can run Sift for you.</li>
              <li>Your files are private to your account. We don&apos;t sell your data, show ads or use tracking or analytics tools.</li>
              <li>Files you open on the <Link href="/try">Try it</Link> page never leave your browser.</li>
              <li>You can download your data and delete your account yourself, at any time, from your account page.</li>
            </ul>
          </section>

          <nav className="legal-toc" aria-label="Contents">
            <ol>{SECTIONS.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}</ol>
          </nav>

          <section id="who">
            <h2>Who we are</h2>
            <p>
              Sift is run by {LEGAL.operator}, {LEGAL.address} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). We decide how your personal data is used
              for the service, which makes us responsible for it (the &ldquo;controller&rdquo;) under the data protection law of {LEGAL.country}.
              You can reach us about anything in this policy at <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
            </p>
          </section>

          <section id="collect">
            <h2>What we collect</h2>
            <h3>Information you give us</h3>
            <ul>
              <li><b>Account details:</b> your email address and password. Your password is stored only as a one-way hash by our authentication provider; we can&apos;t read it.</li>
              <li><b>If you sign in with Google:</b> Google tells us your email address, your name and the address of your profile picture, and confirms your email is verified. We don&apos;t get your Google password or access to your Gmail, Drive or contacts. You can remove Sift&apos;s access at any time in your Google Account under Security, Third-party apps.</li>
              <li><b>Files you upload:</b> the CSV, Excel, TSV or JSON files you add to your account, their names, and the number of rows and columns in each. These files can contain any information you choose to put in them, including other people&apos;s personal data. See <a href="#your-files">Files that contain personal data</a>.</li>
              <li><b>Saved views:</b> the names and settings (measure, filters, period) of dashboard views you save.</li>
              <li><b>Messages:</b> anything you send us by email.</li>
            </ul>
            <h3>Information collected automatically</h3>
            <ul>
              <li><b>Sign-in records:</b> when your account was created and when you last signed in.</li>
              <li><b>Server logs:</b> like any website, our hosting and database providers record technical details of requests, such as IP address, browser type, the page requested and the time. These logs are used to run and secure the service.</li>
              <li><b>A sign-in cookie:</b> see <a href="#cookies">Cookies</a>.</li>
            </ul>
            <h3>What we don&apos;t collect</h3>
            <p>
              Sift has no advertising, analytics or tracking tools, and no social media plugins. Files you analyze on the Try it page are read
              by your own browser and are never sent to us.
            </p>
          </section>

          <section id="use">
            <h2>How we use it</h2>
            <table className="legal-table">
              <thead><tr><th scope="col">What we do</th><th scope="col">Data used</th><th scope="col">Why we&apos;re allowed to</th></tr></thead>
              <tbody>
                <tr><td>Create and run your account, sign you in, reset your password</td><td>Email, password hash or Google profile, sign-in records</td><td>Needed to provide the service you asked for (contract)</td></tr>
                <tr><td>Store your files and saved views and show them back to you</td><td>Files, file details, saved views</td><td>Needed to provide the service (contract)</td></tr>
                <tr><td>Send emails about your account (confirmation, password reset, important changes)</td><td>Email</td><td>Needed to provide the service (contract)</td></tr>
                <tr><td>Keep Sift secure, prevent abuse and fix problems</td><td>Server logs, sign-in records</td><td>Our legitimate interest in a safe, working service</td></tr>
                <tr><td>Answer your questions and requests</td><td>Email, messages</td><td>Our legitimate interest in helping you, or a legal obligation for rights requests</td></tr>
                <tr><td>Meet legal obligations</td><td>Whatever the law requires</td><td>Legal obligation</td></tr>
              </tbody>
            </table>
            <p>
              We don&apos;t look inside your files except when you ask us to help with a problem, or when the law requires it. We don&apos;t use your files
              to train machine-learning models, and we don&apos;t make automated decisions about you that have legal or similar effects.
            </p>
            <h3 id="your-files">Files that contain personal data</h3>
            <p>
              If you upload files containing information about other people (customers or staff, for example), you decide what goes in them
              and why. For that data we act on your behalf only to store it and show it to you. You are responsible for having the right to use it.
              Please don&apos;t upload sensitive data (such as health records, government ID numbers or payment card numbers) unless you need to.
            </p>
          </section>

          <section id="share">
            <h2>Who we share it with</h2>
            <p>We don&apos;t sell or rent personal data. We share it only with the service providers that run Sift for us, under contracts that limit them to doing so:</p>
            <ul>
              <li><b>Supabase:</b> accounts and sign-in, the database, file storage and account emails.</li>
              <li><b>Vercel:</b> hosting the website and its server code, including server logs.</li>
            </ul>
            <p>
              If you choose to sign in with <b>Google</b>, Google learns that you signed in to Sift, under Google&apos;s own privacy policy.
              We don&apos;t send Google your files or anything else from Sift.
            </p>
            <p>
              We may also disclose data if the law requires it, to protect people&apos;s safety or our legal rights, or to a buyer if Sift is
              sold or merged, in which case this policy would continue to apply to your data.
            </p>
          </section>

          <section id="where">
            <h2>Where it is stored</h2>
            <p>
              Your account, files and saved views are stored with Supabase in the {LEGAL.dataRegion} region. Vercel serves the website from data
              centres around the world, so requests and logs may be processed in other countries. Where data is transferred out of {LEGAL.country},
              we rely on the safeguards the law requires, such as the providers&apos; standard contractual clauses.
            </p>
          </section>

          <section id="keep">
            <h2>How long we keep it</h2>
            <ul>
              <li><b>Files and saved views:</b> until you delete them, or delete your account.</li>
              <li><b>Account details:</b> until you delete your account. Deleting your account removes your files, saved views and account straight away.</li>
              <li><b>Backups:</b> our database provider keeps backups for a limited period. Deleted data disappears from them as they expire.</li>
              <li><b>Server logs:</b> kept by our providers for a short period for security and troubleshooting, then deleted.</li>
              <li><b>Emails with us:</b> as long as needed to deal with your request, and longer only if the law requires.</li>
            </ul>
          </section>

          <section id="security">
            <h2>How we protect it</h2>
            <p>
              Connections to Sift are encrypted (HTTPS). Uploaded files are kept in private storage, in a folder that only your account can open,
              and the database enforces that each account can reach only its own records, whatever the browser sends. Passwords are stored only
              as hashes. No system is perfectly secure; if a breach affects your data, we will tell you and the authorities as the law requires.
            </p>
          </section>

          <section id="rights">
            <h2>Your rights and choices</h2>
            <p>Depending on where you live, you have the right to:</p>
            <ul>
              <li><b>Access and portability:</b> get a copy of your data. You can download your files and a summary of your account from your <Link href="/app/account">account page</Link>.</li>
              <li><b>Correction:</b> ask us to correct inaccurate data.</li>
              <li><b>Deletion:</b> delete any dataset from its page, or your whole account from your account page.</li>
              <li><b>Objection and restriction:</b> object to, or ask us to limit, how we use your data where we rely on legitimate interests.</li>
              <li><b>Complaint:</b> complain to {LEGAL.regulator}, or to the data protection authority where you live. We&apos;d appreciate the chance to put things right first.</li>
            </ul>
            <p>
              For anything you can&apos;t do in the app, email <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>. We may need to confirm
              it&apos;s you, and we&apos;ll reply within the time the law allows (normally one month).
            </p>
          </section>

          <section id="cookies">
            <h2>Cookies</h2>
            <p>
              Sift sets only the cookies needed to keep you signed in. They hold your session and are removed when you sign out or the session
              expires. Because they are strictly necessary, we don&apos;t ask for consent to them. We use no advertising, analytics or tracking cookies.
              Fonts are served from Sift itself, so loading a page doesn&apos;t contact any font provider.
            </p>
          </section>

          <section id="children">
            <h2>Children</h2>
            <p>Sift is not meant for children under 16, and we don&apos;t knowingly collect their data. If you think a child has given us their data, contact us and we&apos;ll delete it.</p>
          </section>

          <section id="changes">
            <h2>Changes to this policy</h2>
            <p>If we change this policy, we&apos;ll update the date at the top. If the change matters, we&apos;ll tell account holders by email before it takes effect.</p>
          </section>

          <section id="contact">
            <h2>Contact</h2>
            <p>{LEGAL.operator}, {LEGAL.address}. Email <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.</p>
          </section>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}

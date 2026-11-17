import type { Metadata } from "next";
import Link from "next/link";
import { signUp } from "../actions";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Create an account" };

export default function SignupPage() {
  return (
    <>
      <h1>Create an account</h1>
      <p className="muted">Your account keeps your uploaded files and saved dashboards. Only you can see them.</p>
      <AuthForm action={signUp} submit="Create account" fields={[
        { name: "email", label: "Email address", autoComplete: "email" },
        { name: "password", label: "Password", autoComplete: "new-password", hint: "At least 8 characters." },
      ]} />
      <p className="note">
        We use your email address to run your account and store your files privately. Read the <Link href="/privacy">privacy policy</Link> for
        what we collect and how to delete it.
      </p>
      <p className="authlinks"><span>Already have an account? <Link href="/login">Sign in</Link></span></p>
    </>
  );
}

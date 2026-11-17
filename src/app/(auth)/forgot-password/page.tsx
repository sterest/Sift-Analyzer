import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordReset } from "../actions";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1>Reset your password</h1>
      <p className="muted">We&apos;ll email you a link to choose a new one.</p>
      <AuthForm action={requestPasswordReset} submit="Send reset link" fields={[
        { name: "email", label: "Email address", autoComplete: "email" },
      ]} />
      <p className="authlinks"><Link href="/login">Back to sign in</Link></p>
    </>
  );
}

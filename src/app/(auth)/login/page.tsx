import type { Metadata } from "next";
import Link from "next/link";
import { signIn } from "../actions";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { error } = await props.searchParams;
  return (
    <>
      <h1>Sign in</h1>
      {error === "link" && <p className="error" role="alert">That link has expired or was already used. Sign in, or ask for a new link.</p>}
      <AuthForm action={signIn} submit="Sign in" fields={[
        { name: "email", label: "Email address", autoComplete: "email" },
        { name: "password", label: "Password", autoComplete: "current-password" },
      ]} />
      <p className="authlinks">
        <Link href="/forgot-password">Forgot your password?</Link>
        <span>No account yet? <Link href="/signup">Create one</Link></span>
      </p>
    </>
  );
}

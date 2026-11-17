import type { Metadata } from "next";
import Link from "next/link";
import { signIn } from "../actions";
import { AuthForm } from "../AuthForm";
import { GoogleButton, OrDivider } from "../GoogleButton";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  link: "That link has expired or was already used. Sign in, or ask for a new link.",
  google: "Signing in with Google didn't finish. Try again, or use your email and password.",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const { error } = await props.searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;
  return (
    <>
      <h1>Sign in</h1>
      {message && <p className="error" role="alert">{message}</p>}
      <GoogleButton />
      <OrDivider />
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

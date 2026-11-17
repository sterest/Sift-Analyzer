import type { Metadata } from "next";
import { updatePassword } from "../actions";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <>
      <h1>Choose a new password</h1>
      <AuthForm action={updatePassword} submit="Save password" fields={[
        { name: "password", label: "New password", autoComplete: "new-password", hint: "At least 8 characters." },
      ]} />
    </>
  );
}

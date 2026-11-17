"use client";

import { useActionState } from "react";
import type { AuthState } from "./actions";

export function AuthForm({ action, submit, fields }: {
  action: (prev: AuthState, fd: FormData) => Promise<AuthState>;
  submit: string;
  fields: { name: "email" | "password"; label: string; autoComplete: string; hint?: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  if (state?.message) return <p className="notice" role="status">{state.message}</p>;
  return (
    <form action={formAction} className="authform">
      {fields.map((f) => (
        <label key={f.name} htmlFor={`auth-${f.name}`}>
          {f.label}
          <input id={`auth-${f.name}`} name={f.name} type={f.name === "email" ? "email" : "password"} autoComplete={f.autoComplete}
            required minLength={f.name === "password" && f.autoComplete === "new-password" ? 8 : undefined} />
          {f.hint && <span className="hint">{f.hint}</span>}
        </label>
      ))}
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Please wait…" : submit}</button>
    </form>
  );
}

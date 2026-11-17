"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string } | undefined;

const MIN_PASSWORD = 8;

function field(fd: FormData, name: string) {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim() : "";
}

async function siteOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL ?? "";
}

export async function signIn(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const email = field(fd, "email");
  const password = fd.get("password");
  if (!email || typeof password !== "string" || !password) return { error: "Enter your email address and password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/invalid login credentials/i.test(error.message)) return { error: "That email address and password don't match an account." };
    if (/email not confirmed/i.test(error.message)) return { error: "Confirm your email address first. The link is in the email we sent when you signed up." };
    return { error: error.message };
  }
  redirect("/app");
}

export async function signUp(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const email = field(fd, "email");
  const password = fd.get("password");
  if (!email) return { error: "Enter your email address." };
  if (typeof password !== "string" || password.length < MIN_PASSWORD) return { error: `Use a password of at least ${MIN_PASSWORD} characters.` };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/confirm` },
  });
  if (error) return { error: error.message };
  if (data.session) redirect("/app");
  return { message: `Check ${email} for a confirmation link. Open it to finish creating your account.` };
}

export async function requestPasswordReset(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const email = field(fd, "email");
  if (!email) return { error: "Enter your email address." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/confirm?next=/reset-password`,
  });
  if (error) return { error: error.message };
  // Same answer whether or not the address has an account, so the form can't be used to find accounts.
  return { message: `If ${email} has an account, a link to choose a new password is on its way.` };
}

export async function updatePassword(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const password = fd.get("password");
  if (typeof password !== "string" || password.length < MIN_PASSWORD) return { error: `Use a password of at least ${MIN_PASSWORD} characters.` };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: /session/i.test(error.message) ? "This reset link has expired. Ask for a new one." : error.message };
  redirect("/app");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

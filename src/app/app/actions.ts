"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DATASET_BUCKET } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/** Deletes a dataset's file and its row (saved dashboards go with it). Row-level security limits this to the owner. */
export async function deleteDataset(id: string) {
  const supabase = await createClient();
  const { data: ds } = await supabase.from("datasets").select("id, storage_path").eq("id", id).maybeSingle();
  if (!ds) return { error: "That dataset no longer exists." };
  const { error: fileError } = await supabase.storage.from(DATASET_BUCKET).remove([ds.storage_path]);
  if (fileError) return { error: "The file could not be deleted: " + fileError.message };
  const { error } = await supabase.from("datasets").delete().eq("id", id);
  if (error) return { error: "The dataset could not be deleted: " + error.message };
  revalidatePath("/app");
  redirect("/app");
}

export type DeleteAccountState = { error?: string } | undefined;

/**
 * Deletes every file in the person's storage folder, then their account.
 * Their datasets and dashboards rows are removed by the database's cascade.
 */
export async function deleteAccount(_prev: DeleteAccountState, fd: FormData): Promise<DeleteAccountState> {
  if (String(fd.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") {
    return { error: "Type DELETE in the box to confirm." };
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/login");

  const bucket = supabase.storage.from(DATASET_BUCKET);
  for (;;) {
    const { data: files, error } = await bucket.list(user.id, { limit: 100 });
    if (error) return { error: "Your files could not be listed, so nothing was deleted: " + error.message };
    if (!files.length) break;
    const { error: rmError } = await bucket.remove(files.map((f) => `${user.id}/${f.name}`));
    if (rmError) return { error: "Some files could not be deleted. Your account is still there; try again: " + rmError.message };
  }

  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: "Your files were deleted, but the account could not be: " + error.message + ". Try again or contact us." };
  await supabase.auth.signOut();
  redirect("/?account=deleted");
}

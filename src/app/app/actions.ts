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

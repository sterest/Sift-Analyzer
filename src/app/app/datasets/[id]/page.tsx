import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DashboardRecord, DatasetRecord } from "@/lib/types";
import { DatasetView } from "./DatasetView";

// The dataset's own name becomes the tab title once it loads (see DatasetView).
export const metadata: Metadata = { title: "Dataset" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DatasetPage(props: PageProps<"/app/datasets/[id]">) {
  const { id } = await props.params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: dataset } = await supabase
    .from("datasets")
    .select("id, name, storage_path, file_type, row_count, column_count, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!dataset) notFound();
  const { data: views } = await supabase
    .from("dashboards")
    .select("id, dataset_id, name, config, created_at, updated_at")
    .eq("dataset_id", id)
    .order("created_at");
  return <DatasetView dataset={dataset as DatasetRecord} initialViews={(views ?? []) as DashboardRecord[]} />;
}

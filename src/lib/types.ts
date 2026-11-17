import type { DashConfig } from "@/components/Dashboard";

/** A row of public.datasets. The file itself lives in the private "datasets" storage bucket. */
export interface DatasetRecord {
  id: string;
  name: string;
  storage_path: string;
  file_type: "csv" | "tsv" | "txt" | "json" | "xlsx";
  row_count: number;
  column_count: number;
  created_at: string;
}

/** A row of public.dashboards: a named, saved dashboard view of one dataset. */
export interface DashboardRecord {
  id: string;
  dataset_id: string;
  name: string;
  config: DashConfig;
  created_at: string;
  updated_at: string;
}

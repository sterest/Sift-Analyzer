-- Sift database schema. Run once in the Supabase SQL Editor (safe to re-run).
-- Every table has row-level security: each person can only read and change their own rows and files.

-- Datasets: one row per uploaded file. The file itself lives in the private "datasets" storage bucket.
create table if not exists public.datasets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  storage_path text not null,
  file_type text not null check (file_type in ('csv', 'tsv', 'txt', 'json', 'xlsx')),
  row_count integer not null default 0 check (row_count >= 0),
  column_count integer not null default 0 check (column_count >= 0),
  created_at timestamptz not null default now(),
  -- A dataset can only point at a file inside its owner's own folder.
  constraint datasets_path_in_own_folder check (storage_path like user_id::text || '/%')
);
create index if not exists datasets_user_created_idx on public.datasets (user_id, created_at desc);

-- Dashboards: named, saved views (measure, filters, period) of one dataset.
create table if not exists public.dashboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  dataset_id uuid not null references public.datasets (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dashboards_dataset_idx on public.dashboards (dataset_id, created_at);

alter table public.datasets enable row level security;
alter table public.dashboards enable row level security;

drop policy if exists "Own datasets: read" on public.datasets;
drop policy if exists "Own datasets: add" on public.datasets;
drop policy if exists "Own datasets: change" on public.datasets;
drop policy if exists "Own datasets: delete" on public.datasets;
create policy "Own datasets: read" on public.datasets for select to authenticated using ((select auth.uid()) = user_id);
create policy "Own datasets: add" on public.datasets for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Own datasets: change" on public.datasets for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own datasets: delete" on public.datasets for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Own dashboards: read" on public.dashboards;
drop policy if exists "Own dashboards: add" on public.dashboards;
drop policy if exists "Own dashboards: change" on public.dashboards;
drop policy if exists "Own dashboards: delete" on public.dashboards;
create policy "Own dashboards: read" on public.dashboards for select to authenticated using ((select auth.uid()) = user_id);
-- A dashboard may only be attached to a dataset the same person owns.
create policy "Own dashboards: add" on public.dashboards for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.datasets d where d.id = dataset_id and d.user_id = (select auth.uid()))
);
create policy "Own dashboards: change" on public.dashboards for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own dashboards: delete" on public.dashboards for delete to authenticated using ((select auth.uid()) = user_id);

-- Lets a signed-in person delete their own account. Their datasets and dashboards go with it (on delete cascade).
-- The app removes their stored files through the Storage API first, because deleting storage rows in SQL leaves the files behind.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Private storage bucket for uploaded files, 25 MB each. Files go in a folder named after the owner's user id.
insert into storage.buckets (id, name, public, file_size_limit)
values ('datasets', 'datasets', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists "Own files: read" on storage.objects;
drop policy if exists "Own files: upload" on storage.objects;
drop policy if exists "Own files: delete" on storage.objects;
create policy "Own files: read" on storage.objects for select to authenticated
  using (bucket_id = 'datasets' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Own files: upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'datasets' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Own files: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'datasets' and (storage.foldername(name))[1] = (select auth.uid())::text);

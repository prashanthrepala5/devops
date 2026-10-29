-- Run this once in the Supabase SQL Editor for the ReachOps project.
create table if not exists public.profiles (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null check (category in ('frontend-web','backend-java','full-stack','data-engineering','qa-testing','devops-cloud','mobile-development','dotnet','custom')),
  custom_category text not null default '',
  email text not null default '',
  phone text not null default '',
  linkedin text not null default '',
  location text not null default '',
  work_authorization text not null default '',
  availability text not null default '',
  experience text not null default '',
  skills text not null default '',
  expected_salary text not null default '',
  resume_name text not null,
  resume_path text not null,
  resume_size bigint not null check (resume_size between 1 and 10485760),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_user_updated_idx on public.profiles (user_id, updated_at desc);
alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, public;
grant select, insert, update, delete on table public.profiles to authenticated;
create or replace function public.reachops_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists reachops_profiles_updated_at on public.profiles;
create trigger reachops_profiles_updated_at
  before update on public.profiles
  for each row execute function public.reachops_touch_updated_at();
drop policy if exists "Users manage their own ReachOps profiles" on public.profiles;
create policy "Users manage their own ReachOps profiles"
  on public.profiles for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reachops-resumes', 'reachops-resumes', false, 10485760,
  array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users manage their own ReachOps resumes" on storage.objects;
create policy "Users manage their own ReachOps resumes"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'reachops-resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'reachops-resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

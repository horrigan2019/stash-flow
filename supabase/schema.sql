-- Izzy — Supabase schema (Postgres + Auth + RLS)
-- Apply in Supabase SQL editor or via CLI migration.

-- Extensions
create extension if not exists "pgcrypto";

-- Policy line categories (5-line pocket vault)
do $$ begin
  create type public.policy_category as enum (
    'auto',
    'home',
    'commercial',
    'life',
    'health'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.policy_doc_type as enum (
    'dec_page',
    'carrier_letter',
    'audit',
    'bill'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.chat_role as enum ('user', 'assistant');
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  is_subscribed boolean not null default false,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- policies (pocket vault)
-- ---------------------------------------------------------------------------
create table if not exists public.policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category public.policy_category not null default 'auto',
  carrier_name text,
  policy_number text,
  state text,
  claims_phone text,
  roadside_phone text,
  extracted_json jsonb not null default '{}'::jsonb,
  plain_english_summary text,
  created_at timestamptz not null default now()
);

create index if not exists policies_user_id_idx on public.policies (user_id);
create index if not exists policies_category_idx on public.policies (category);

-- ---------------------------------------------------------------------------
-- policy_documents (Supabase Storage URLs for encrypted uploads)
-- ---------------------------------------------------------------------------
create table if not exists public.policy_documents (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.policies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  file_name text not null,
  file_url text not null,
  doc_type public.policy_doc_type not null default 'dec_page',
  created_at timestamptz not null default now()
);

create index if not exists policy_documents_policy_id_idx
  on public.policy_documents (policy_id);
create index if not exists policy_documents_user_id_idx
  on public.policy_documents (user_id);

-- ---------------------------------------------------------------------------
-- chat_messages (Ask Izzy Pro)
-- ---------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid references public.policies (id) on delete set null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.chat_role not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_user_id_idx
  on public.chat_messages (user_id);
create index if not exists chat_messages_policy_id_idx
  on public.chat_messages (policy_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.policies enable row level security;
alter table public.policy_documents enable row level security;
alter table public.chat_messages enable row level security;

-- profiles: users read/update self; service role handles Stripe webhook writes
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- policies
drop policy if exists "policies_select_own" on public.policies;
create policy "policies_select_own"
  on public.policies for select
  using (auth.uid() = user_id);

drop policy if exists "policies_insert_own" on public.policies;
create policy "policies_insert_own"
  on public.policies for insert
  with check (auth.uid() = user_id);

drop policy if exists "policies_update_own" on public.policies;
create policy "policies_update_own"
  on public.policies for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "policies_delete_own" on public.policies;
create policy "policies_delete_own"
  on public.policies for delete
  using (auth.uid() = user_id);

-- policy_documents
drop policy if exists "policy_documents_select_own" on public.policy_documents;
create policy "policy_documents_select_own"
  on public.policy_documents for select
  using (auth.uid() = user_id);

drop policy if exists "policy_documents_insert_own" on public.policy_documents;
create policy "policy_documents_insert_own"
  on public.policy_documents for insert
  with check (auth.uid() = user_id);

drop policy if exists "policy_documents_delete_own" on public.policy_documents;
create policy "policy_documents_delete_own"
  on public.policy_documents for delete
  using (auth.uid() = user_id);

-- chat_messages
drop policy if exists "chat_messages_select_own" on public.chat_messages;
create policy "chat_messages_select_own"
  on public.chat_messages for select
  using (auth.uid() = user_id);

drop policy if exists "chat_messages_insert_own" on public.chat_messages;
create policy "chat_messages_insert_own"
  on public.chat_messages for insert
  with check (auth.uid() = user_id);

-- Storage bucket hint (create in dashboard if missing):
--   name: policy-docs
--   private; path prefix: {user_id}/...

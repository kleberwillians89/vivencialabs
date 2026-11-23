-- OBSOLETE: DO NOT APPLY. Leads now go to Google Sheets. Historical local reference only.
begin;
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  name text not null check (char_length(btrim(name)) between 2 and 160),
  email text not null check (char_length(email) between 3 and 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  company text not null check (char_length(btrim(company)) between 1 and 200),
  role text not null check (char_length(btrim(role)) between 1 and 160),
  support text not null default '' check (char_length(support) <= 3000),
  material text not null check (material in ('brandbook', 'study')),
  created_at timestamptz not null default now(),
  contact_consent boolean not null check (contact_consent = true),
  newsletter_consent boolean not null default false,
  consent_version text not null
);
alter table public.leads enable row level security;
-- No client policies: neither anonymous visitors nor authenticated site users read/write leads.
revoke all on table public.leads from public, anon, authenticated;
grant select, insert on table public.leads to service_role;
create index leads_created_at_idx on public.leads (created_at desc);
comment on table public.leads is 'Material requests. Team access through Supabase Dashboard only; CSV export in Table Editor.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vivencia-materials', 'vivencia-materials', false, 104857600, array['application/pdf']);
-- No public storage policies are added. Server secret signs private downloads.
commit;

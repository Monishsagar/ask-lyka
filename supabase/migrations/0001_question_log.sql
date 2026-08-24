-- Question log: mirrors the /api/ask response shape field-for-field.
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).

create table if not exists question_log (
  id              bigint generated always as identity primary key,
  question        text        not null,
  outcome         text        not null check (outcome in ('ANSWERED', 'DECLINED_NOT_GROUNDED', 'DECLINED_OUT_OF_POLICY')),
  answer          text,
  citations       jsonb       not null default '[]',
  reason          text        not null,
  verified_claims jsonb       not null default '[]',
  mode            text        not null check (mode in ('stub', 'live', 'stub-fallback')),
  created_at      timestamptz not null default now()
);

create index if not exists question_log_created_at_idx on question_log (created_at);


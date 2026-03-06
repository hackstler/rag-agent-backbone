CREATE TABLE IF NOT EXISTS organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      text NOT NULL UNIQUE,
  slug        text UNIQUE,
  name        text,
  address     text,
  phone       text,
  email       text,
  nif         text,
  logo        text,
  vat_rate    numeric(5,4),
  currency    text NOT NULL DEFAULT '€',
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Backfill: create a row for each distinct orgId in users
INSERT INTO organizations (org_id)
SELECT DISTINCT org_id FROM users
ON CONFLICT (org_id) DO NOTHING;

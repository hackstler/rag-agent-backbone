-- Add name and surname columns to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "surname" text;

-- Backfill: for existing users whose email column contains a non-email value
-- (legacy "username"), copy it to name so they have a display name,
-- then keep email as-is (login still works by matching the email column value).
UPDATE "users"
SET name = email
WHERE email IS NOT NULL
  AND email NOT LIKE '%@%';

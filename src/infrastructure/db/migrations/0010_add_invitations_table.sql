CREATE TABLE IF NOT EXISTS "invitations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" text NOT NULL,
  "role" text NOT NULL DEFAULT 'user',
  "email" text,
  "token_hash" text NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "used_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "invitations_token_hash_idx" ON "invitations" ("token_hash");
CREATE INDEX IF NOT EXISTS "invitations_org_id_idx" ON "invitations" ("org_id");

CREATE TABLE "auth_rate_limits" (
  "key_hash" varchar(64) PRIMARY KEY,
  "count" integer NOT NULL CHECK ("count" > 0),
  "expires_at" timestamptz NOT NULL
);
CREATE INDEX "auth_rate_limits_expiry_idx" ON "auth_rate_limits" ("expires_at");

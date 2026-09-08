ALTER TABLE "session" ADD COLUMN "remember_me" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "session"
SET "expires_at" = LEAST("expires_at", "updated_at" + INTERVAL '1 hour');

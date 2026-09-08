CREATE TYPE "public"."target_scope" AS ENUM('self', 'self_and_others', 'others');--> statement-breakpoint
ALTER TYPE "public"."target_policy" ADD VALUE 'self';--> statement-breakpoint
ALTER TABLE "spells" ADD COLUMN "target_scope" "target_scope";--> statement-breakpoint
UPDATE "spells" SET "target_scope" = 'self_and_others' WHERE "target_scope" IS NULL;--> statement-breakpoint
ALTER TABLE "spells" ALTER COLUMN "target_scope" SET DEFAULT 'self_and_others';--> statement-breakpoint
ALTER TABLE "spells" ALTER COLUMN "target_scope" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "spells" ADD CONSTRAINT "self_priority_requires_self_eligible_scope" CHECK ("spells"."target_scope" != 'others' OR "spells"."target_policy"::text != 'self');

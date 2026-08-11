ALTER TABLE "effects" RENAME COLUMN "interval_ticks" TO "trigger_every_actions";--> statement-breakpoint
ALTER TABLE "effects" RENAME COLUMN "duration_ticks" TO "lasts_for_actions";--> statement-breakpoint
ALTER TABLE "effects" DROP CONSTRAINT "interval_ticks_positive";--> statement-breakpoint
ALTER TABLE "effects" DROP CONSTRAINT "duration_ticks_positive";--> statement-breakpoint
ALTER TABLE "effects" DROP CONSTRAINT "interval_fields_required";--> statement-breakpoint
ALTER TABLE "effects" DROP CONSTRAINT "instant_fields_forbidden";--> statement-breakpoint
UPDATE "effects" SET "trigger_every_actions" = NULL;--> statement-breakpoint
UPDATE "effects" SET "lasts_for_actions" = NULL;--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "trigger_every_actions_positive" CHECK ("effects"."trigger_every_actions" IS NULL OR "effects"."trigger_every_actions" > 0);--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "lasts_for_actions_positive" CHECK ("effects"."lasts_for_actions" IS NULL OR "effects"."lasts_for_actions" > 0);

ALTER TABLE "effects" RENAME COLUMN "interval_ms" TO "interval_ticks";--> statement-breakpoint
ALTER TABLE "effects" RENAME COLUMN "duration_ms" TO "duration_ticks";--> statement-breakpoint
ALTER TABLE "effects" DROP CONSTRAINT "interval_ms_positive";--> statement-breakpoint
ALTER TABLE "effects" DROP CONSTRAINT "duration_ms_positive";--> statement-breakpoint
ALTER TABLE "effects" DROP CONSTRAINT "interval_fields_required";--> statement-breakpoint
ALTER TABLE "effects" DROP CONSTRAINT "instant_fields_forbidden";--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "interval_ticks_positive" CHECK ("effects"."interval_ticks" IS NULL OR "effects"."interval_ticks" > 0);--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "duration_ticks_positive" CHECK ("effects"."duration_ticks" IS NULL OR "effects"."duration_ticks" > 0);--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "interval_fields_required" CHECK ("effects"."timing_type" != 'interval' OR ("effects"."interval_ticks" IS NOT NULL AND "effects"."trigger_count" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "instant_fields_forbidden" CHECK ("effects"."timing_type" != 'instant' OR ("effects"."interval_ticks" IS NULL AND "effects"."trigger_count" IS NULL));
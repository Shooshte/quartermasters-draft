ALTER TABLE "spells" DROP CONSTRAINT "requires_adjacent_whole_row";--> statement-breakpoint
ALTER TABLE "spells" DROP CONSTRAINT "requires_adjacent_min_targets";--> statement-breakpoint
ALTER TABLE "spells" RENAME COLUMN "requires_adjacent" TO "target_only_adjacent";--> statement-breakpoint
ALTER TABLE "spells" ADD CONSTRAINT "target_only_adjacent_whole_row" CHECK ("spells"."max_targets_per_row" IS NOT NULL OR "spells"."target_only_adjacent" = false);--> statement-breakpoint
ALTER TABLE "spells" ADD CONSTRAINT "target_only_adjacent_min_targets" CHECK ("spells"."target_only_adjacent" = false OR "spells"."max_targets_per_row" >= 2);

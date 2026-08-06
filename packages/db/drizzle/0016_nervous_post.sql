CREATE TYPE "public"."target_priority" AS ENUM('highest_health', 'lowest_health', 'highest_damage', 'support', 'random');--> statement-breakpoint
CREATE TYPE "public"."target_scope" AS ENUM('self', 'self_allies', 'self_enemies', 'allies', 'enemies', 'both');--> statement-breakpoint
CREATE TYPE "public"."target_selection_shape" AS ENUM('individual', 'adjacent');--> statement-breakpoint
CREATE TABLE "items_allowed_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"row_type" "row_type" NOT NULL,
	CONSTRAINT "items_allowed_rows_item_id_row_type_unique" UNIQUE("item_id","row_type")
);
--> statement-breakpoint
ALTER TABLE "units" DROP CONSTRAINT "units_target_row_count_range";--> statement-breakpoint
ALTER TABLE "units" DROP CONSTRAINT "units_max_targets_per_row_positive";--> statement-breakpoint
ALTER TABLE "units" DROP CONSTRAINT "units_target_only_adjacent_whole_row";--> statement-breakpoint
ALTER TABLE "units" DROP CONSTRAINT "units_target_only_adjacent_min_targets";--> statement-breakpoint
ALTER TABLE "units" DROP CONSTRAINT "units_self_policy_requires_non_enemy_side";--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "target_scope" "target_scope" DEFAULT 'enemies' NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "target_priority" "target_priority" DEFAULT 'highest_health' NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "target_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "selection_shape" "target_selection_shape" DEFAULT 'individual' NOT NULL;--> statement-breakpoint
UPDATE "units"
SET
	"target_scope" = CASE
		WHEN "target_policy"::text = 'self' THEN 'self'::"target_scope"
		ELSE ("target_side"::text)::"target_scope"
	END,
	"target_priority" = CASE
		WHEN "target_policy"::text = 'self' THEN 'highest_health'::"target_priority"
		ELSE ("target_policy"::text)::"target_priority"
	END,
	"target_count" = COALESCE("max_targets_per_row", 1),
	"selection_shape" = CASE WHEN "target_only_adjacent" THEN 'adjacent'::"target_selection_shape" ELSE 'individual'::"target_selection_shape" END;--> statement-breakpoint
ALTER TABLE "items_allowed_rows" ADD CONSTRAINT "items_allowed_rows_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "items_allowed_rows_item_id_idx" ON "items_allowed_rows" USING btree ("item_id");--> statement-breakpoint
INSERT INTO "items_allowed_rows" ("item_id", "row_type")
SELECT "items"."id", "allowed_rows"."row_type"
FROM "items"
CROSS JOIN (
	VALUES
		('support'::"row_type"),
		('ranged'::"row_type"),
		('melee'::"row_type"),
		('tank'::"row_type")
) AS "allowed_rows"("row_type");--> statement-breakpoint
DO $$
BEGIN
	IF (SELECT COUNT(*) FROM "items_allowed_rows") != (SELECT COUNT(*) * 4 FROM "items") THEN
		RAISE EXCEPTION 'Item allowed-row backfill did not create all four rows for every existing item.';
	END IF;
END;
$$;--> statement-breakpoint
ALTER TABLE "units_allowed_rows" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "units_allowed_rows" CASCADE;--> statement-breakpoint
ALTER TABLE "units" DROP COLUMN "target_side";--> statement-breakpoint
ALTER TABLE "units" DROP COLUMN "target_policy";--> statement-breakpoint
ALTER TABLE "units" DROP COLUMN "target_row_count";--> statement-breakpoint
ALTER TABLE "units" DROP COLUMN "max_targets_per_row";--> statement-breakpoint
ALTER TABLE "units" DROP COLUMN "target_only_adjacent";--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_target_count_positive" CHECK ("units"."target_count" >= 1);--> statement-breakpoint
DROP TYPE "public"."target_policy";--> statement-breakpoint
DROP TYPE "public"."target_side";

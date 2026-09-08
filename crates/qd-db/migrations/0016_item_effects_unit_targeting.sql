CREATE TYPE "public"."target_side" AS ENUM('allies', 'enemies', 'self');--> statement-breakpoint
CREATE TABLE "items_effects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"effect_template_id" uuid NOT NULL,
	"sequence_order" integer NOT NULL,
	CONSTRAINT "items_effects_item_id_sequence_order_unique" UNIQUE("item_id","sequence_order"),
	CONSTRAINT "items_effects_sequence_order_positive" CHECK ("items_effects"."sequence_order" > 0)
);
--> statement-breakpoint
CREATE TABLE "units_allowed_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"row_type" "row_type" NOT NULL,
	CONSTRAINT "units_allowed_rows_unit_id_row_type_unique" UNIQUE("unit_id","row_type")
);
--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "target_side" "target_side" DEFAULT 'enemies' NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "target_policy" "target_policy" DEFAULT 'highest_health' NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "target_row_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "max_targets_per_row" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "target_only_adjacent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "items_effects" ADD CONSTRAINT "items_effects_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items_effects" ADD CONSTRAINT "items_effects_effect_template_id_effects_id_fk" FOREIGN KEY ("effect_template_id") REFERENCES "public"."effects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units_allowed_rows" ADD CONSTRAINT "units_allowed_rows_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "items_effects_item_id_idx" ON "items_effects" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "items_effects_effect_template_id_idx" ON "items_effects" USING btree ("effect_template_id");--> statement-breakpoint
CREATE INDEX "units_allowed_rows_unit_id_idx" ON "units_allowed_rows" USING btree ("unit_id");--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_target_row_count_range" CHECK ("units"."target_row_count" >= 1 AND "units"."target_row_count" <= 4);--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_max_targets_per_row_positive" CHECK ("units"."max_targets_per_row" IS NULL OR "units"."max_targets_per_row" >= 1);--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_target_only_adjacent_whole_row" CHECK ("units"."max_targets_per_row" IS NOT NULL OR "units"."target_only_adjacent" = false);--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_target_only_adjacent_min_targets" CHECK ("units"."target_only_adjacent" = false OR "units"."max_targets_per_row" >= 2);--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_self_policy_requires_non_enemy_side" CHECK ("units"."target_side" != 'enemies' OR "units"."target_policy"::text != 'self');--> statement-breakpoint
DO $$
DECLARE
	multi_spell_item record;
BEGIN
	FOR multi_spell_item IN
		SELECT "item_id", COUNT(*) AS "spell_count"
		FROM "items_spells"
		GROUP BY "item_id"
		HAVING COUNT(*) > 1
		ORDER BY "item_id"
	LOOP
		RAISE NOTICE 'Item % linked to % spells; effects will be flattened in spell ID order.',
			multi_spell_item."item_id",
			multi_spell_item."spell_count";
	END LOOP;
END;
$$;--> statement-breakpoint
DO $$
DECLARE
	disagreeing_unit record;
BEGIN
	FOR disagreeing_unit IN
		WITH "spell_configurations" AS (
			SELECT
				"spells"."id" AS "spell_id",
				jsonb_build_object(
					'targetPolicy', "spells"."target_policy",
					'targetScope', "spells"."target_scope",
					'targetRowCount', "spells"."target_row_count",
					'maxTargetsPerRow', "spells"."max_targets_per_row",
					'targetOnlyAdjacent', "spells"."target_only_adjacent",
					'allowedRows', COALESCE(
						(
							SELECT jsonb_agg("spells_allowed_rows"."row_type" ORDER BY "spells_allowed_rows"."row_type")
							FROM "spells_allowed_rows"
							WHERE "spells_allowed_rows"."spell_id" = "spells"."id"
						),
						'[]'::jsonb
					)
				) AS "configuration"
			FROM "spells"
		)
		SELECT
			"units_items"."unit_id",
			COUNT(DISTINCT "spell_configurations"."configuration") AS "configuration_count"
		FROM "units_items"
		INNER JOIN "items_spells"
			ON "items_spells"."item_id" = "units_items"."item_id"
		INNER JOIN "spell_configurations"
			ON "spell_configurations"."spell_id" = "items_spells"."spell_id"
		GROUP BY "units_items"."unit_id"
		HAVING COUNT(DISTINCT "spell_configurations"."configuration") > 1
		ORDER BY "units_items"."unit_id"
	LOOP
		RAISE NOTICE 'Unit % equips source spells with % distinct targeting configurations; review its new default targeting.',
			disagreeing_unit."unit_id",
			disagreeing_unit."configuration_count";
	END LOOP;
END;
$$;--> statement-breakpoint
INSERT INTO "items_effects" ("item_id", "effect_template_id", "sequence_order")
SELECT
	"legacy_effects"."item_id",
	"legacy_effects"."effect_template_id",
	row_number() OVER (
		PARTITION BY "legacy_effects"."item_id"
		ORDER BY "legacy_effects"."spell_id", "legacy_effects"."sequence_order"
	)::integer
FROM (
	SELECT
		"items_spells"."item_id",
		"items_spells"."spell_id",
		"spells_effects"."effect_template_id",
		"spells_effects"."sequence_order"
	FROM "items_spells"
	INNER JOIN "spells_effects"
		ON "spells_effects"."spell_id" = "items_spells"."spell_id"
	ORDER BY
		"items_spells"."item_id",
		"items_spells"."spell_id",
		"spells_effects"."sequence_order"
) AS "legacy_effects"
ORDER BY
	"legacy_effects"."item_id",
	"legacy_effects"."spell_id",
	"legacy_effects"."sequence_order";--> statement-breakpoint
DO $$
BEGIN
	IF (SELECT COUNT(*) FROM "items_effects") != (
		SELECT COUNT(*)
		FROM "items_spells"
		INNER JOIN "spells_effects"
			ON "spells_effects"."spell_id" = "items_spells"."spell_id"
	) THEN
		RAISE EXCEPTION 'Item-effect backfill count does not match the legacy item-spell-effect graph.';
	END IF;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS "spell_requires_linked_effect_after_spell_change" ON "spells";--> statement-breakpoint
DROP TRIGGER IF EXISTS "spell_requires_linked_effect_after_link_change" ON "spells_effects";--> statement-breakpoint
DROP FUNCTION IF EXISTS "public"."check_spell_has_effects_after_spell_change"();--> statement-breakpoint
DROP FUNCTION IF EXISTS "public"."check_spell_has_effects_after_link_change"();--> statement-breakpoint
DROP FUNCTION IF EXISTS "public"."raise_if_spell_has_no_effects"(uuid);--> statement-breakpoint
DROP TABLE "items_spells";--> statement-breakpoint
DROP TABLE "spells_allowed_rows";--> statement-breakpoint
DROP TABLE "spells_effects";--> statement-breakpoint
DROP TABLE "spells";--> statement-breakpoint
DROP TYPE "public"."target_scope";

CREATE TABLE "spells_allowed_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spell_id" uuid NOT NULL,
	"row_type" "row_type" NOT NULL,
	CONSTRAINT "spells_allowed_rows_spell_id_row_type_unique" UNIQUE("spell_id","row_type")
);
--> statement-breakpoint
ALTER TABLE "items_spells" DROP CONSTRAINT "items_spells_spell_id_spells_id_fk";
--> statement-breakpoint
ALTER TABLE "spells_effects" DROP CONSTRAINT "spells_effects_effect_template_id_effects_id_fk";
--> statement-breakpoint
ALTER TABLE "spells" ADD COLUMN "target_row_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "spells" ADD COLUMN "max_targets_per_row" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "spells" ADD COLUMN "requires_adjacent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "spells_allowed_rows" ADD CONSTRAINT "spells_allowed_rows_spell_id_spells_id_fk" FOREIGN KEY ("spell_id") REFERENCES "public"."spells"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "spells_allowed_rows_spell_id_idx" ON "spells_allowed_rows" USING btree ("spell_id");--> statement-breakpoint
ALTER TABLE "items_spells" ADD CONSTRAINT "items_spells_spell_id_spells_id_fk" FOREIGN KEY ("spell_id") REFERENCES "public"."spells"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spells_effects" ADD CONSTRAINT "spells_effects_effect_template_id_effects_id_fk" FOREIGN KEY ("effect_template_id") REFERENCES "public"."effects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_activation_mana_cost_nonnegative" CHECK ("items"."activation_mana_cost" >= 0);--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_activation_health_cost_nonnegative" CHECK ("items"."activation_health_cost" >= 0);--> statement-breakpoint
ALTER TABLE "spells" ADD CONSTRAINT "target_row_count_positive" CHECK ("spells"."target_row_count" >= 1);--> statement-breakpoint
ALTER TABLE "spells" ADD CONSTRAINT "max_targets_per_row_positive" CHECK ("spells"."max_targets_per_row" IS NULL OR "spells"."max_targets_per_row" >= 1);--> statement-breakpoint
ALTER TABLE "spells" ADD CONSTRAINT "requires_adjacent_whole_row" CHECK ("spells"."max_targets_per_row" IS NOT NULL OR "spells"."requires_adjacent" = false);--> statement-breakpoint
ALTER TABLE "spells" ADD CONSTRAINT "requires_adjacent_min_targets" CHECK ("spells"."requires_adjacent" = false OR "spells"."max_targets_per_row" >= 2);
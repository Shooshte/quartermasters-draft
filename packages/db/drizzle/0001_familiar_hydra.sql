CREATE TYPE "public"."target_policy" AS ENUM('highest_health', 'lowest_health', 'highest_damage', 'random');--> statement-breakpoint
CREATE TABLE "spells" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"target_policy" "target_policy" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spells_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "spells_effects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spell_id" uuid NOT NULL,
	"effect_template_id" uuid NOT NULL,
	"sequence_order" integer NOT NULL,
	CONSTRAINT "sequence_order_positive" CHECK ("spells_effects"."sequence_order" > 0)
);
--> statement-breakpoint
ALTER TABLE "spells_effects" ADD CONSTRAINT "spells_effects_spell_id_spells_id_fk" FOREIGN KEY ("spell_id") REFERENCES "public"."spells"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spells_effects" ADD CONSTRAINT "spells_effects_effect_template_id_effects_id_fk" FOREIGN KEY ("effect_template_id") REFERENCES "public"."effects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "spells_effects_spell_id_idx" ON "spells_effects" USING btree ("spell_id");--> statement-breakpoint
CREATE INDEX "spells_effects_effect_template_id_idx" ON "spells_effects" USING btree ("effect_template_id");
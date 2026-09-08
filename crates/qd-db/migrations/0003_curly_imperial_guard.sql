CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"melee_dmg" real DEFAULT 0 NOT NULL,
	"ranged_dmg" real DEFAULT 0 NOT NULL,
	"mana_regen" real DEFAULT 0 NOT NULL,
	"spell_dmg" real DEFAULT 0 NOT NULL,
	"dodge" real DEFAULT 0 NOT NULL,
	"critical_chance" real DEFAULT 0 NOT NULL,
	"activation_mana_cost" real DEFAULT 0 NOT NULL,
	"activation_health_cost" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "items_spells" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"spell_id" uuid NOT NULL,
	CONSTRAINT "items_spells_item_id_spell_id_unique" UNIQUE("item_id","spell_id")
);
--> statement-breakpoint
ALTER TABLE "items_spells" ADD CONSTRAINT "items_spells_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items_spells" ADD CONSTRAINT "items_spells_spell_id_spells_id_fk" FOREIGN KEY ("spell_id") REFERENCES "public"."spells"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "items_spells_item_id_idx" ON "items_spells" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "items_spells_spell_id_idx" ON "items_spells" USING btree ("spell_id");
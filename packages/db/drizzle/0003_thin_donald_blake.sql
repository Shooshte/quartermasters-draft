CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"melee_dmg" real DEFAULT 0 NOT NULL,
	"health" real DEFAULT 0 NOT NULL,
	"ranged_dmg" real DEFAULT 0 NOT NULL,
	"mana_regen" real DEFAULT 0 NOT NULL,
	"spell_dmg" real DEFAULT 0 NOT NULL,
	"speed" real DEFAULT 0 NOT NULL,
	"dodge" real DEFAULT 0 NOT NULL,
	"critical_chance" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "units_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "units_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "units_items_unit_id_priority_unique" UNIQUE("unit_id","priority"),
	CONSTRAINT "units_items_priority_positive" CHECK ("units_items"."priority" > 0)
);
--> statement-breakpoint
ALTER TABLE "units_items" ADD CONSTRAINT "units_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units_items" ADD CONSTRAINT "units_items_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "units_items_item_id_idx" ON "units_items" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "units_items_unit_id_idx" ON "units_items" USING btree ("unit_id");
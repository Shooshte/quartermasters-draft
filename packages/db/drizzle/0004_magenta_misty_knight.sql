CREATE TYPE "public"."row_type" AS ENUM('support', 'ranged', 'melee', 'tank');--> statement-breakpoint
CREATE TABLE "scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scenarios_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "scenarios_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scenario_id" uuid NOT NULL,
	"row_type" "row_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenarios_rows_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"row_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"slot" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scenarios_rows_units_row_id_slot_unique" UNIQUE("row_id","slot"),
	CONSTRAINT "scenarios_rows_units_slot_positive" CHECK ("scenarios_rows_units"."slot" >= 1)
);
--> statement-breakpoint
ALTER TABLE "scenarios_rows" ADD CONSTRAINT "scenarios_rows_scenario_id_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios_rows_units" ADD CONSTRAINT "scenarios_rows_units_row_id_scenarios_rows_id_fk" FOREIGN KEY ("row_id") REFERENCES "public"."scenarios_rows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios_rows_units" ADD CONSTRAINT "scenarios_rows_units_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scenarios_rows_scenario_id_idx" ON "scenarios_rows" USING btree ("scenario_id");--> statement-breakpoint
CREATE INDEX "scenarios_rows_units_row_id_idx" ON "scenarios_rows_units" USING btree ("row_id");--> statement-breakpoint
CREATE INDEX "scenarios_rows_units_unit_id_idx" ON "scenarios_rows_units" USING btree ("unit_id");
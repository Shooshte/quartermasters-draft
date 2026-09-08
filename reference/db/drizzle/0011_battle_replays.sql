CREATE TABLE "battle_replays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scenario_a_id" uuid NOT NULL,
	"scenario_b_id" uuid NOT NULL,
	"seed" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "battle_replays_distinct_scenarios" CHECK ("battle_replays"."scenario_a_id" <> "battle_replays"."scenario_b_id")
);
--> statement-breakpoint
ALTER TABLE "battle_replays" ADD CONSTRAINT "battle_replays_scenario_a_id_scenarios_id_fk" FOREIGN KEY ("scenario_a_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_replays" ADD CONSTRAINT "battle_replays_scenario_b_id_scenarios_id_fk" FOREIGN KEY ("scenario_b_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "battle_replays_scenario_a_id_idx" ON "battle_replays" USING btree ("scenario_a_id");--> statement-breakpoint
CREATE INDEX "battle_replays_scenario_b_id_idx" ON "battle_replays" USING btree ("scenario_b_id");
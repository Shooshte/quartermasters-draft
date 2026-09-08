ALTER TABLE "effects" ADD COLUMN "mana" real;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "mana" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "mana" real DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_mana_nonnegative" CHECK ("units"."mana" >= 0);
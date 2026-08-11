ALTER TABLE "effects" ADD COLUMN "shield" real;--> statement-breakpoint
ALTER TABLE "effects" ADD COLUMN "bypasses_shield" boolean DEFAULT false NOT NULL;
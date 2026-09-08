ALTER TABLE "spells_effects" DROP CONSTRAINT "spells_effects_effect_template_id_effects_id_fk";
--> statement-breakpoint
ALTER TABLE "spells_effects" ADD CONSTRAINT "spells_effects_effect_template_id_effects_id_fk"
FOREIGN KEY ("effect_template_id") REFERENCES "public"."effects"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "items_spells" DROP CONSTRAINT "items_spells_spell_id_spells_id_fk";
--> statement-breakpoint
ALTER TABLE "items_spells" ADD CONSTRAINT "items_spells_spell_id_spells_id_fk"
FOREIGN KEY ("spell_id") REFERENCES "public"."spells"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
DELETE FROM "items" i
WHERE NOT EXISTS (
	SELECT 1
	FROM "items_spells" "is"
	WHERE "is"."item_id" = i."id"
);
--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_activation_mana_cost_nonnegative" CHECK ("items"."activation_mana_cost" >= 0);
--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_activation_health_cost_nonnegative" CHECK ("items"."activation_health_cost" >= 0);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."raise_if_item_has_no_spells"("target_item_id" uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
	IF target_item_id IS NULL THEN
		RETURN;
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "items"
		WHERE "id" = target_item_id
	) AND NOT EXISTS (
		SELECT 1
		FROM "items_spells"
		WHERE "item_id" = target_item_id
	) THEN
		RAISE EXCEPTION 'Item % must have at least one linked spell.', target_item_id
			USING ERRCODE = '23514', CONSTRAINT = 'item_requires_linked_spell';
	END IF;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."check_item_has_spells_after_item_change"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	PERFORM "public"."raise_if_item_has_no_spells"(COALESCE(NEW."id", OLD."id"));
	RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."check_item_has_spells_after_link_change"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF TG_OP IN ('DELETE', 'UPDATE') THEN
		PERFORM "public"."raise_if_item_has_no_spells"(OLD."item_id");
	END IF;

	IF TG_OP IN ('INSERT', 'UPDATE') AND (TG_OP <> 'UPDATE' OR NEW."item_id" IS DISTINCT FROM OLD."item_id") THEN
		PERFORM "public"."raise_if_item_has_no_spells"(NEW."item_id");
	END IF;

	RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "item_requires_linked_spell_after_item_change"
AFTER INSERT OR UPDATE ON "items"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "public"."check_item_has_spells_after_item_change"();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "item_requires_linked_spell_after_link_change"
AFTER INSERT OR UPDATE OR DELETE ON "items_spells"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "public"."check_item_has_spells_after_link_change"();

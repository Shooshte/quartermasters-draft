DELETE FROM "spells" s
WHERE NOT EXISTS (
	SELECT 1
	FROM "spells_effects" se
	WHERE se."spell_id" = s."id"
);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."raise_if_spell_has_no_effects"("target_spell_id" uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
	IF target_spell_id IS NULL THEN
		RETURN;
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "spells"
		WHERE "id" = target_spell_id
	) AND NOT EXISTS (
		SELECT 1
		FROM "spells_effects"
		WHERE "spell_id" = target_spell_id
	) THEN
		RAISE EXCEPTION 'Spell % must have at least one linked effect.', target_spell_id
			USING ERRCODE = '23514', CONSTRAINT = 'spell_requires_linked_effect';
	END IF;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."check_spell_has_effects_after_spell_change"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	PERFORM "public"."raise_if_spell_has_no_effects"(COALESCE(NEW."id", OLD."id"));
	RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."check_spell_has_effects_after_link_change"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF TG_OP IN ('DELETE', 'UPDATE') THEN
		PERFORM "public"."raise_if_spell_has_no_effects"(OLD."spell_id");
	END IF;

	IF TG_OP IN ('INSERT', 'UPDATE') AND (TG_OP <> 'UPDATE' OR NEW."spell_id" IS DISTINCT FROM OLD."spell_id") THEN
		PERFORM "public"."raise_if_spell_has_no_effects"(NEW."spell_id");
	END IF;

	RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "spell_requires_linked_effect_after_spell_change"
AFTER INSERT OR UPDATE ON "spells"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "public"."check_spell_has_effects_after_spell_change"();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "spell_requires_linked_effect_after_link_change"
AFTER INSERT OR UPDATE OR DELETE ON "spells_effects"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "public"."check_spell_has_effects_after_link_change"();

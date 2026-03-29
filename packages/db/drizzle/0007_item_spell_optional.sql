DROP TRIGGER IF EXISTS "item_requires_linked_spell_after_item_change" ON "items";
--> statement-breakpoint
DROP TRIGGER IF EXISTS "item_requires_linked_spell_after_link_change" ON "items_spells";
--> statement-breakpoint
DROP FUNCTION IF EXISTS "public"."check_item_has_spells_after_item_change"();
--> statement-breakpoint
DROP FUNCTION IF EXISTS "public"."check_item_has_spells_after_link_change"();
--> statement-breakpoint
DROP FUNCTION IF EXISTS "public"."raise_if_item_has_no_spells"(uuid);

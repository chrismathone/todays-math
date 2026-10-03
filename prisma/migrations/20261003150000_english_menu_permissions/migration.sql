-- Preserve the legacy whole-English deny key while allowing the split English menus.
-- Additive constraint expansion only; existing account rows are not rewritten.
-- The live database also accepts textbook; preserve that compatibility value.
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "user_disabled_menus_valid";

ALTER TABLE "user" ADD CONSTRAINT "user_disabled_menus_valid"
  CHECK ("disabled_menus" <@ ARRAY['home','bank','studio','export','library','textbook','teaching','concept','conceptBlank','srs','english','english-school','english-maker','english-library','english-listening','english-bank']::TEXT[]);

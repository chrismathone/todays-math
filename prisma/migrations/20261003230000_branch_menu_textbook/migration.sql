-- The independently merged textbook feature adds a workspace menu.
-- Keep branch policy exact and permit disabling that menu as well.
ALTER TABLE "branch" DROP CONSTRAINT "branch_disabled_menus_valid";
ALTER TABLE "branch" ADD CONSTRAINT "branch_disabled_menus_valid"
  CHECK (
    "disabled_menus" <@ ARRAY['home','bank','studio','export','library','textbook','teaching','concept','conceptBlank','srs','english-school','english-maker','english-library','english-listening','english-bank']::TEXT[]
    AND array_position("disabled_menus", NULL) IS NULL
  );

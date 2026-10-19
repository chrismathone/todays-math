-- «연산대장»(arithmetic) becomes a managed workspace menu (owner, 2026-10-16).
-- Until now it rode on «시험지 만들기»(bank), so the admin console could not add
-- or remove it. Both menu lists are deny lists, so existing branches and
-- accounts keep the menu on, exactly as today.
ALTER TABLE "user" DROP CONSTRAINT "user_disabled_menus_valid";
ALTER TABLE "user" ADD CONSTRAINT "user_disabled_menus_valid"
  CHECK ("disabled_menus" <@ ARRAY['home','bank','arithmetic','studio','export','library','textbook','teaching','concept','conceptBlank','srs','english','english-school','english-maker','english-library','english-listening','english-bank']::TEXT[]);
ALTER TABLE "branch" DROP CONSTRAINT "branch_disabled_menus_valid";
ALTER TABLE "branch" ADD CONSTRAINT "branch_disabled_menus_valid"
  CHECK (
    "disabled_menus" <@ ARRAY['home','bank','arithmetic','studio','export','library','textbook','teaching','concept','conceptBlank','srs','english-school','english-maker','english-library','english-listening','english-bank']::TEXT[]
    AND array_position("disabled_menus", NULL) IS NULL
  );

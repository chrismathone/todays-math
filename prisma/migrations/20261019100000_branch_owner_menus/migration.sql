-- Branch owner menu layer (owner, 2026-10-19 «관리자가 오픈한 메뉴에 한해서» · «원장만»).
-- The super admin ceiling stays in "disabled_menus"; the branch owner (and the
-- eywa director through the signed channel) turns menus off inside it here.
-- Additive deny list: every branch keeps exactly today's menus. Both layers share
-- "menu_revision", so a change on either side refreshes sessions and conflicts.
ALTER TABLE "branch"
  ADD COLUMN "owner_disabled_menus" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "branch" ADD CONSTRAINT "branch_owner_disabled_menus_valid"
  CHECK (
    "owner_disabled_menus" <@ ARRAY['home','bank','arithmetic','studio','export','library','textbook','teaching','concept','conceptBlank','srs','english-school','english-maker','english-library','english-listening','english-bank']::TEXT[]
    AND array_position("owner_disabled_menus", NULL) IS NULL
  );

-- Additive branch ceilings; preserve every existing personal menu policy.
ALTER TABLE "branch"
  ADD COLUMN "disabled_menus" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "menu_revision" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "branch" ADD CONSTRAINT "branch_disabled_menus_valid"
  CHECK (
    "disabled_menus" <@ ARRAY['home','bank','studio','export','library','teaching','concept','conceptBlank','srs','english-school','english-maker','english-library','english-listening','english-bank']::TEXT[]
    AND array_position("disabled_menus", NULL) IS NULL
  );
ALTER TABLE "branch" ADD CONSTRAINT "branch_menu_revision_positive"
  CHECK ("menu_revision" > 0);

-- NextAuth/server Prisma uses the owner/server role, not Supabase Auth.
-- No FORCE RLS and no public client policies or grants.
ALTER TABLE "branch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "branch", "user" FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL PRIVILEGES ON TABLE "branch", "user" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL PRIVILEGES ON TABLE "branch", "user" FROM authenticated;
  END IF;
END
$$;

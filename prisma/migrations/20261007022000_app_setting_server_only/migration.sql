-- Settings include per-student menu authorization. Next/Auth.js checks scope on the
-- server; no browser role should access these rows through Supabase's Data API.
-- Prisma connects as the table owner; RLS is deliberately not forced on the owner.
ALTER TABLE public.app_setting ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.app_setting FROM anon, authenticated;

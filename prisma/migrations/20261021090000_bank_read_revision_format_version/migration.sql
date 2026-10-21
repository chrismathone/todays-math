-- Classifier fingerprint transition for the bank revision counter. DB first, ONE transaction.
-- 20261019160000_bank_read_revision baked the previous classifier version; the parser changed
-- (formula lines · sub-question markers, display only) so ACTUAL_FORMAT_VERSION moved.
-- The operator tool scripts/db/apply-bank-format-version-migration.ts sets lock_timeout 3s,
-- takes the advisory lock, and after the LOCK below re-classifies every shared row stamped with
-- the previous version using the new classifier IN THIS SAME TRANSACTION. It refuses unless every
-- stored format and input digest agrees, so restamping the version string changes no fact.
-- Any RAISE below aborts the whole transaction: no row, counter or history changes survive.
-- statement
LOCK TABLE public.problem, public.unit, public.source_material, public.source_book
  IN SHARE ROW EXCLUSIVE MODE;
-- statement
DO $$
DECLARE
  from_version constant text := 'format-v1:1c653f6c01b41e1c9e9a78edab82a2e3373923af6d6c88aa9f21233aafa0e42a';
  to_version constant text := 'format-v1:c2f3c1cde46aea4199bda8ead78a0d557f6d9ed733e5821b8407a7701c3b0fc8';
  stored_version text;
  stored_invalid bigint;
  recount_old bigint;
  recount_new bigint;
BEGIN
  SELECT format_version, invalid_format_count INTO STRICT stored_version, stored_invalid
    FROM public.bank_read_revision WHERE id = 1 FOR UPDATE;
  IF stored_version IS DISTINCT FROM from_version THEN
    RAISE EXCEPTION 'BANK_FORMAT_TRANSITION_FROM_MISMATCH';
  END IF;
  SELECT count(*) INTO recount_old FROM public.problem
    WHERE pool = 'shared' AND (actual_format IS NULL OR actual_format_version IS DISTINCT FROM from_version);
  IF recount_old <> stored_invalid THEN
    RAISE EXCEPTION 'BANK_FORMAT_TRANSITION_COUNTER_DRIFT';
  END IF;
  UPDATE public.problem SET actual_format_version = to_version
    WHERE pool = 'shared' AND actual_format IS NOT NULL AND actual_format_version = from_version;
  SELECT count(*) INTO recount_new FROM public.problem
    WHERE pool = 'shared' AND (actual_format IS NULL OR actual_format_version IS DISTINCT FROM to_version);
  IF recount_new <> recount_old THEN
    RAISE EXCEPTION 'BANK_FORMAT_TRANSITION_RECOUNT_MISMATCH';
  END IF;
  UPDATE public.bank_read_revision
    SET format_version = to_version, invalid_format_count = recount_new, revision = revision + 1
    WHERE id = 1;
END;
$$;

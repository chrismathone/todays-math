-- Deploy compatible readers with ARITHMETIC_SHEET_WRITE off before enabling writes.
-- One ALTER keeps the previous kinds constrained throughout this widening.
ALTER TABLE "workspace_document"
  DROP CONSTRAINT "workspace_document_kind_check",
  ADD CONSTRAINT "workspace_document_kind_check"
    CHECK ("kind" IN ('draft', 'extraction', 'conceptBlank', 'arithmeticSheet'));

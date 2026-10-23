-- PROPOSAL ONLY; never executed by the source importer or this task.
-- Requires explicit platform-admin read approval and an existing server authorization context.
-- No student names, credentials, payloads, answers, bodies or images are exported.
-- Private student/event/plan overlays must use existing authenticated, enrollment/branch-scoped helpers;
-- this global source census SQL is not an alternative authorization path.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT txid_current_snapshot()::text AS source_watermark;
SELECT id, grade, chapter, section, order_index FROM unit ORDER BY order_index, id;
SELECT source::text, review_status::text, direct_use_allowed, COUNT(*) AS rows
  FROM problem GROUP BY source, review_status, direct_use_allowed ORDER BY 1,2,3;
SELECT curriculum, kind, COUNT(*) AS rows FROM source_book GROUP BY curriculum,kind ORDER BY 1,2;
SELECT COUNT(*) AS rows, COUNT(DISTINCT book_id) AS source_books FROM source_material;
COMMIT;

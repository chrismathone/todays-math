Fresh r5 source extraction: metadata-only findings

The unchanged scripts/import/exam-twin/extract-fresh-sources-20261019.py read actual selected HWP/PDF bytes on N: for three inventory-eligible completed 2025 middle3 pairs. Explicit IDs were checked against all previous fresh receipt entries, the captured next-* source-manifest IDs, the existing Bumil exclusion, the four protected schools, and the inventory's existingExamIds/existingQuestionCount exclusions. No protected source was selected. This is eligibility evidence, not source identity approval.

| Inventory school / ID | HWP / PDF parsed parents | Question pages | Withheld endnotes | Region overlaps / flagged question observations |
| --- | --- | --- | --- | --- |
| 구남중 / personal-88d4c2e60054c08b0ef79329b37b8b0f | 22 / 22 | 4 | 22 | 3 / 6 |
| 구암중 / personal-9e4b86577f80955351a792bd72b70775 | 20 / 20 | 6 | 20 | 2 / 3 |
| 능인중 / personal-467deaaa710780b475bd4e50f6fa24bc | 20 / 20 | 4 | 20 | 4 / 8 |

The current parsed-observation count is **568 = 506 previous + 62 new parent observations**. It is not a content-certified total, a deduplicated content count, a complete inventory extraction claim, or a release count. All three sources remain parsed-quarantined. Components approved, new twins, whole-pair/source identity/math/grade/rights approvals, DB writes and loadable items are all zero.

Actual rendered header/footer observations were made with view_image, not inferred only from filenames or text extraction. For each completed selected PDF, the header visibly says 2025 first-semester midterm and the inventory school / grade 3. Each readable footer context crop instead says the same school followed by 26년 1학기 중간고사 대비. This 2025/2026 preparation-label conflict is retained explicitly; the unchanged HWP header/footer extraction also records the conflicting year labels. Nothing was silently relabeled.

The first original scan chosen by the existing extractor was also viewed for each source. 구남중's upright original header shows 2025, first-semester midterm, grade 3 and 2025-04-24; its footer prints 구남중학교. The source PDF initially rendered sideways with rotation 270; two additional upright crops were rendered by changing rotation only in memory, with no PDF save. 구암중's original header shows 2025, semester 1, midterm evaluation, grade 3 and April 30; its footer has a handwritten 구암 note, not a printed school name. That note does not establish school identity. 능인중's original header shows grade 3 and its footer prints 능인중학교 / 1 of 4; no year, semester or round is visible in those original crops. Its 2025 classification is therefore wrapper/inventory evidence, not independently confirmed original-header evidence. Alternative original scans listed in the inventory were not adjudicated.

All six initial original header/footer crops were inspected. The three initial selected-footer crops were too tightly clipped to read the footer; those bytes were retained, and three new selected-footer-context crops were rendered and viewed. The selected headers, readable footer contexts and both upright 구남중 original crops were also inspected. Crops and source text remain ignored and local, with no original page or question image committed.

Source-region holds: 구남중 flags q2/q3, q5/q6 (page 1) and q19/q20 (page 4). 구암중 flags q6/q9 and q7/q9 (page 2), with substantial overlapping regions. 능인중 flags q4/q5 (page 1), q10/q11 (page 2), q12/q13 (page 3) and q19/q20 (page 4). Total: 9 overlaps and 17 flagged question observations. These require shared-material/misrouting review; no regions were edited. An unflagged box does not certify correct text/figure ownership.

Parser uncertainty remains for whole-question text, formula equivalence, figures, choices, printed score, source identity, grade and rights. Unknown-control and unmapped-item counters are zero, and HWP/PDF choice counts match for these 62 parsed parents; neither fact proves equivalence. HWP formula-record totals are 196 / 175 / 184. HWP figure-record versus PDF correspondence totals are 1/1, 2/2 and 7/6 respectively; the 능인중 discrepancy remains unapproved. Printed-score occurrence totals are 28 / 24 / 20, not validated question scores. No answer key was used for approval and no math or grade review was performed.

Preservation: aggregate-receipt.json retains the extractor's original/tool/inventory/prior-receipt preservation hashes, with matching before/after values. A separate ignored old-evidence-preservation.local.json records all before/after hashes for the 6,026 pre-existing evidence files; all were rechecked unchanged. Its own raw SHA-256 is recorded in reviewerMetadata.oldEvidencePreservation. Source manifests and original crops were not rewritten after extraction. The source manifests retain the extractor's pre-observation pending/viewed=false fields; later visual observations live only in the new aggregate receipt. The extractor and all imported tool files remain unchanged. No existing report, script, ledger or source was edited.

Only this FINDINGS.md and aggregate-receipt.json are committed. The aggregate contains only metadata, counts, digests, uncertainty/hold descriptions and file references; question text, formula text and image pixels remain local. All written metadata was reopened from actual bytes using strict UTF-8 and reparsed. No paid API, model call, install, DB, push, main update, new agent/worktree or other session was used.

Parent byte-exact local copy inventory: reviewerMetadata.localFilesForByteExactParentCopy in the aggregate lists all **22** ignored files with exact absolute paths, byte lengths and SHA-256. Within this r5 directory, copy:

- For each of the three personal-* IDs in the table: source-manifest.local.json and reviewer-only/header.png, footer.png, selected-header.png, selected-footer.png, selected-footer-context.png (18 files).
- For personal-88d4c2e60054c08b0ef79329b37b8b0f only: reviewer-only/original-upright-header.png and original-upright-footer.png (2 files).
- At the r5 root: old-evidence-preservation.local.json and finalize-metadata.local.py (2 files).

Retain the clipped and sideways initial crops as captured evidence; use the supplemental readable crops for interpretation. No ignored raw file is staged. This scope ends after the metadata commit.

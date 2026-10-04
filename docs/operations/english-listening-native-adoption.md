# Adopt native listening questions

Prepare the local stage from the verified source PDFs first:

```powershell
python scripts/import/prepare-native-listening-questions.py --root C:/Creative/testautocreator
python scripts/import/prepare-native-listening-questions.py --root C:/Creative/testautocreator --write
```

The first command reports conversions without writing files. `--write` changes only local staging under `output/listening-assessments/prepared-native-registration`; it never connects to a database. The Python environment needs PyMuPDF. `--source-id SOURCE_ID` limits either command to one archived original. Inspect `manifest.json` for errors and preserved-image reasons before adopting. Preparation preserves original IDs and answer references, recovers encoded text from character geometry, and keeps figures/tables as separate source crops. Short rules underneath encoded text are treated as text typography rather than empty graphics. Outlined fonts, missing choice markers and ambiguous continuations keep the complete original question image. OCR output alone is not proof of an accurate editable question.

Run from the repository root with the operator's existing environment:

```powershell
node --conditions=react-server --env-file=.env --import=tsx scripts/import/adopt-native-listening-questions.mts ebs-middle-1-2026-1
```

The default is a PostgreSQL **read-only transaction**. Add `--apply` after reviewing the result to update the existing imported set. `--archive-root PATH` changes only the local artifact directory; its default is `output/listening-assessments`. There is no owner or project override. `DATABASE_URL` must identify `jyaguxwuaxgdnovtulna`; Storage credentials are unnecessary because this command never uploads or rewrites audio.

The command loads `prepared-native-registration/SOURCE_ID.json`, verifies its original prepared-file SHA, the source question PDF SHA, every question and choice ID, the original answer reference, image hashes and conversion counts. Referenced files must resolve inside the archive. It does not reread original audio; it verifies the current ready media's immutable original SHA against the original prepared manifest. Optional conversion evidence (`originalPrompt`, `visualBounds`, `reason`) remains local; the audit records the complete stage SHA and parser/counts.

The staged artifact is trusted output from the separate PDF conversion process. A SHA proves exact bytes, not correctness of OCR or permission to distribute. Native conversion does not create a human review or rights approval.

Inside the same advisory lock and transaction used by listening-set updates, adoption rejects any publication history, human content/audio/alignment review, different group/question identities, or question content edited since the original import. Exact already-adopted content is skipped. Missing registered sets report `pending_registration` without creating anything.

Only prompt, optional instruction, image and choice text change. Missing staged images remove the former full question crop; `role: visual` retains the graphic; `original_image_preserved` keeps the exact original full crop with `role: question`. Current metadata, provenance, rights, title, explanation, evidence, audio, IDs and answers are retained. The existing runtime validates and increments the revision, and a `native_questions_adopted` audit is inserted atomically. Re-running an unchanged stage returns `already_native` without a new revision or audit.

The isolated PostgreSQL tests cover read-only execution, idempotency, immutable asset preservation, refusal of edited/reviewed sources, and a publication committed while adoption waits for the set lock without changing the set revision. No operating database is used by these tests.

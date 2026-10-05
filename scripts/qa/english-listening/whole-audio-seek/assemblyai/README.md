# Private whole-recording listening transcripts

This pipeline creates an AI reading/search library for the 193 imported national listening assessments. It keeps the complete original recordings, official scripts, source questions, ownership, and already verified question starts unchanged. No audio clips are generated. AssemblyAI word times are estimates and never authorize question seek starts.

## Models and durable receipts

The English pass uses `universal-3-5-pro` with `language_code: en`. A separate `universal-2` pass uses `language_codes: [en, ko]` for Korean announcements and English speech. The models have complementary omissions; neither produces a human-reviewed official script. Model choices and language parameters were checked against the [AssemblyAI model documentation](https://www.assemblyai.com/docs/getting-started/models) and [code-switching documentation](https://www.assemblyai.com/docs/pre-recorded-audio/code-switching).

Set `ASSEMBLYAI_API_KEY` in the ignored local `.env`, then run the CLI with `node --env-file=.env`. Credentials, uploaded URLs, original source paths and full provider responses stay in ignored QA output. Do not commit or send those files to browser code. Local profiles keep distinct configuration hashes, provider IDs, exact original and playback hashes, native duration and raw-response hashes.

Before the paid submission, the job is durably marked `submission_pending`. An unknown submission result cannot automatically retry. Confirmed transcript IDs are resumed by GET; completed receipts are reused without provider calls. Active locks require ownership inspection, and provider-error jobs require investigation before any new paid job. Never delete jobs or locks to bypass these guards.

```powershell
node --env-file=.env scripts/qa/english-listening/whole-audio-seek/assemblyai/transcribe.mjs --inventory <reviewed-inventory.json> --certificate <complete-certificate.json> --sources all --output <ignored-transcript-directory> --profile both --purpose library --concurrency 4 --max-audio-minutes 7700
```

The explicit minute cap includes both passes. The current 193 originals total about 63.4 hours; both passes total about 126.8 provider audio hours. No key, upload URL, or private provider response is printed in progress output.

## Reading quality and timing quality are separate

Raw text and words remain unchanged in private append-only storage. A derived `display_text` excludes words outside the actual complete original recording. Zero-duration estimates inside the recording keep their text: an imprecise word interval does not prove the word was never spoken. Nothing is translated, corrected, interpolated, shifted, or clamped. Exclusions and timing concerns are counted separately in `timing_quality`; search uses the derived display text so impossible trailing recognitions do not appear as search matches.

A provider duration difference greater than 1,500 ms disables paragraph seek for that transcript. Its reading text remains available with a timing warning. Valid transcript paragraphs can move the same original player and continue playback; their labels explicitly say the times are AI estimates. They neither create separate media nor replace the independently verified question starts.

The strict `validateWords` path and diagnostic alignment retain their original clock/bounds rules. `--purpose library` is a reading-only acceptance path. It must not be used as proof for question alignment or for the separate admission/register-starts pipeline.

## Database adoption

`apply-migration.mts` applies only `20261005142000_listening_source_transcripts`, requires the reviewed SQL file hash, and checks the correct Supabase project, RLS, denied direct client roles, RESTRICT foreign keys and append-only trigger. Its default transaction rolls back, including its Prisma migration receipt. Use `--apply` only for the actual adoption.

`register-transcripts.mts` independently verifies every original file, raw response, completed job, profile, owner, current source document, original asset and frozen baseline. Default is a read-only plan/readback. With `--apply`, it appends the 386 source/profile rows and checks the entire 193-document/media scope again. Duplicate provider IDs are read back and must match exactly; old versions are never updated or deleted. The operator is intentionally restricted to project `jyaguxwuaxgdnovtulna`.

```powershell
node --env-file=.env --import tsx scripts/qa/english-listening/whole-audio-seek/assemblyai/apply-migration.mts --file prisma/migrations/20261005142000_listening_source_transcripts/migration.sql --sha256 <reviewed-sql-sha256>
node --conditions=react-server --env-file=.env --import tsx scripts/qa/english-listening/whole-audio-seek/assemblyai/register-transcripts.mts --inventory <reviewed-inventory.json> --baseline <current-source-baseline.json> --baseline-sha256 <baseline-sha256> --transcripts <ignored-transcript-directory> --owner <existing-teacher-uuid>
```

Add `--apply` for the reviewed actual migration and library adoption. Do not run general pending-migration deployment or rewrite existing official `group.transcript` fields.

## Application scope

The existing teacher runtime exposes `GET /api/english/listening/sets/:id/source-transcripts` only to authorized bank users within the same source ownership/branch scope as `compose-source`. Reads and transcript search require the current whole-original asset, completion, original/playback hashes, duration and owner to match. Student/publication/print responses do not include the new private transcripts.

The bank display is collapsed and loaded only on expansion. English and Korean/English transcriptions are separate, visibly labeled **AI 음성 전사 · 미검수**, with excluded-word and timing notices where applicable. Existing official scripts stay separately labeled. Search uses a scoped `EXISTS`, so multiple versions/profiles cannot duplicate source rows.

## Verification

```powershell
node --test scripts/qa/english-listening/whole-audio-seek/assemblyai/client.test.mjs scripts/qa/english-listening/whole-audio-seek/assemblyai/import-plan.test.mjs
```

The tests cover paid-submit uncertainty, known-ID resume without new billing, original/hash/clock/model/receipt tampering, lock ownership, raw-data preservation, impossible trailing text exclusion, reading-only duration mismatch and credential redaction. Runtime tests additionally exercise scoped SQL, current media bindings, privacy, route methods and whole-player behavior. See `ALIGNMENT.md` for the independent diagnostic alignment rules and remaining holds.

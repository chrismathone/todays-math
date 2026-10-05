# 193-source transcript adoption — 2026-10-05 UTC

The complete 193 original recordings were transcribed twice: English with Universal 3.5 Pro, and Korean/English with Universal 2. All 386 actual provider jobs completed. The library contains 540,022 raw word estimates and 2,730,396 raw text characters. Transcriptions remain **AI 음성 전사 · 미검수**.

The reviewed single migration and all 386 private source/profile rows were adopted in the existing `jyaguxwuaxgdnovtulna` Supabase project. A full readback matched the provider receipts and import payloads. All 193 original documents and audio asset records remained identical to the frozen baseline; 2,727 existing verified question starts and 972 held questions remain unchanged.

Actual current-source teacher queries returned both profiles for every one of the 193 sources. A scoped dialogue-content search returned the expected source without duplicate source rows. Student and unknown-teacher reads were denied. Actual PostgreSQL `anon` and `authenticated` role reads were denied, and an attempted transcript update was rejected by the immutable trigger and rolled back. Direct client grants and policies are absent.

There were 117 word estimates outside the complete original recordings. Their raw evidence was preserved, but the words are excluded from display and search. There were also 645 zero-duration word estimates: their in-bounds text is preserved, with timing uncertainty indicated. Six transcripts, corresponding to three recordings, differed from the original duration by more than 1,500 ms; they provide reading text without paragraph seek. No intervals were shifted or clamped.

The independent diagnostic ran on all 193 sources and preserved all 2,727 starts. It found 35 additional question-to-original-passage candidates and kept 937 other questions held; these candidates are not measured onsets or admission certificates. Provider clocks can leave a number token seconds before its actual speech. Native onset and question-to-passage verification are still required before applying a new question start. The pilot number-confidence threshold is uncalibrated; see `ALIGNMENT.md` for its observed limitations.

Validation passed: 80 Node tests covering receipt integrity, resumability, raw-data preservation and alignment; 102 runtime/HTTP/SQL/UI and existing listening regression tests; scoped ESLint; and full TypeScript checking with an 8 GB heap. The default Node heap was insufficient for the full project check. The push still runs the repository's complete required pre-push checks.

Private raw jobs, baseline, adoption receipts, live-query evidence and diagnostic reports are retained under ignored `.qa-artifacts/assemblyai-seek-20261005/`. The 25 Claude pilot artifacts were archived with identical hashes before cleanup. The two completed, merged worker checkouts were removed and their Git branches preserved.

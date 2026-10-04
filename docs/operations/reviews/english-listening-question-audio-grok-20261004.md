# Independent audit: listening question-audio cuts (Grok, 2026-10-04)

Baseline `2549915f3bf2bf229986a39856fecd7231e80d02`. Source under review: `src/lib/english/listening/questionAudioProof.ts`, `src/lib/english/listening/runtime/questionAudio.ts`, `src/lib/english/listening/media/sampleClip.ts`, `scripts/import/adopt-listening-question-audio.mts`. No source file was edited. No database, Storage, or paid API call was made. `.env` was not read. This report was written before any other reviewer's verdict was opened.

## Verdict

The first 20 cuts are not safe to treat as automatically complete speech. Re-running `verifyQuestionAudioEvidence` on the hash-checked files returns 20 groups, so the current gate does pass `ebsi-high-1-2022-2`. That pass is the defect. Answer-critical numerals are absent from both ASR caches and the gate still succeeds. Question 5's cut contains two speech islands while the proof counts one broadcast copy. Every leading "400 ms silence" pad is loud on the boundary WAVs, and 12 trailing pads are loud as well.

Boundary energy does not show a loud waveform in the 400 ms before any of the 20 starts, so this audit does not claim that a word was sliced off before the cut. Nothing here was heard. RMS is a sample measurement, not listening. `humanReviewed` is `false` on the alignment, the raw activity, the boundary manifest, the official summary, and the verification artifact. The other 2,397 original questions and 1,282 reconstructed questions stay uncertified. Do not lower these gates to admit them.

The local apply artifact says `status: "applied"` for set `7cf3ff69-6467-4184-8f46-5b0f8b06dfbc`, and the verification artifact's read-only rerun says `already_split`. This audit did not open the database, so those claims are file claims.

## How the counts and hashes were checked

Playbook `docs/planning/18-qa-playbook.md` §2: the pass flag is not the ground truth. Referenced files were re-hashed. Token recall was recomputed with the same normalizer and LCS as `questionAudioProof.ts` lines 249-279. VAD edges were read from the raw activity, not from the producer status. WAV headers and int16 payloads were hashed and windowed locally.

| Check | Result |
| --- | --- |
| `ebsi-high-1-2022-2.strict-alignment.json` SHA-256 | `95b92ef64d6c931dfd7a6c6708c4abcf34f9e545fedce5b39a3fa8ada3298bf7` (matches the named baseline) |
| Official script file SHA-256 | `c76cb2bfa75502c15450f25d172a53664647f985b9965778cec99c8123665205` |
| Script text SHA-256 vs `sourceTranscriptSha256` | match (`bf1e1c86b9712e1e5974272b872262753b2f71fe55d044e2aef6a73051363dcc`) |
| Source MP3 SHA-256 | `25e538c3aab0fc10c57d0d8ac80ad4a3d47921e17b1b03c46f9cdada1590b27d`, 35,444,194 bytes |
| Alignment, script, activity, raw activity, prepared registration, three ASR caches, and derived-ASR origins | 0 hash mismatches |
| `verifyQuestionAudioEvidence` | success, 20 groups |
| MP3 Xing/gapless expected length | 48,000 Hz, stereo, 60,758,667 samples. `round(samples * 16000 / 48000) = 20,252,889`, delta 0 against `decodedSampleCount`. Untrimmed frame sum maps 807 samples higher. |
| Apply vs verification plan hash | both `9a7c508c104e8e112e50a0cdcacbf3f4fc1894d3781867dad0f667cada3978f8` |
| Native frames | all 20 are `startSample * 3` and `endSample * 3`, bytes `44 + frames * 4`, duration `ceil(frames * 1000 / 48000)` |
| 40 boundary WAVs | file SHA-256 and int16 PCM SHA-256 match `manifest.json`. Header is 16,000 Hz, mono, 16-bit. Boundary frame is 48,000 (3.0 s into a 6.0 s snippet). |

`parseMp3` supplied the gapless length. The mpg123 PCM SHA-256 and the 20 clip payload SHA-256 values were not recomputed from decoder output. `apply.json` records source PCM SHA-256 `fcf73e6f1fe64534003cdd4f905ed2a6a78eb410be472073e6a07e4b8ddb6ded`. The PyAV float32 SHA-256 on the raw activity and the boundary manifest is `f2c6d76ad36c2632e55a4043c4c6171bef10941f0f9692aefe3c30de8fe0ab05`. Those are different identities. The manifest says so.

Population, counted from directories and prepared JSON rather than from the summary prose:

- `official-asr-stage` has 121 source directories. `final-summary.json` says `sourceVerifiedOriginalAsrCaches: 121`, `invalidOriginalAsrCaches: 0`, `humanReviewed: false`, `writesDatabase: false`.
- Exactly one `*.strict-alignment.json`: this round. Summary `strictWholeRoundProofsPassed: 1`, `strictOriginalQuestionsPassed: 20`, `strictSourceRecordIds` length 1.
- `prepared-historical-registration`: 186 files, 2,280 questions. `prepared-registration`: 137 questions in 7 set files; `audio-preflight.json` and `operating-registration.json` have no question array. 2,280 + 137 = 2,417 = summary `originalQuestions`. 2,417 − 20 = 2,397 = `otherOriginalQuestionBoundariesUncertified`.
- `prepared-reconstructed-registration`: 72 set files plus `manifest.json`, 1,282 questions. Summary `reconstructedQuestionBoundariesUncertified: 1,282`. None of those are in the strict alignment.

## Findings

### 1. Blocker. Numeral tokens that decide the item are missing from both ASR caches, and recall still passes

The full-dialogue gate is LCS recall ≥ 0.9 and precision ≥ 0.7 (`questionAudioProof.ts` 825-835). A whole-cache search of `asr-medium-english-evidence.json` and `asr-medium-multilingual.json` is what the "absent" column uses.

| Item | Official line in `strict-script-complete.json` | What the caches contain | Selected recall |
| --- | --- | --- | --- |
| 7 | "It's originally 50 dollars. But it's on sale right now for 10 percent off." | No segment contains `50`. The only `10` tokens are "10 a.m." at about 747 s and a Korean "10번" at about 596 s, neither in Q7 (426.96–475.98 s). | 0.976 |
| 10 | "Spending more than 200 dollars is too much." | No "200 dollars". The only `200` is Q11 "200 kilograms" at about 689 s, outside Q10 (596.43–648.72 s). | 0.970 |
| 15 | "That'll be 55 dollars." | No segment contains `55`. | 0.986 |
| 18 | "26?" / "No. It's 20." / "Just 20? That low?" | No segment contains `26` or `20`. | 0.947 |

Question 18 is the temperature item. The proof says the dialogue is covered while neither cache contains the two temperatures. `strict-script.json` (SHA-256 `57144237cb2a41bfe5d599d31f2b2e3675e90887e99dc9ebbbec90b71a330b2a`) is a different segmentation of this section: 8 utterances, and the standalone "26?" turn is not at the same index. The alignment binds the complete file, which has 9 utterances and does contain "26?". The gate still passes.

This is not a listening claim that the waveform lacks those words. It is a claim that the automatic evidence used to prove the dialogue does not contain them. The unit test "checks the whole official middle dialogue" replaces a whole segment with unrelated text. It does not drop a numeral inside a 10% budget.

Fix: fail if any official numeral token is absent from the selected token multiset. Keep the 0.9 floor from papering over that. Do not retune 0.9 downward.

Other misses are not the same defect. Question 3's "Dillan" is in the first segment as "Dylan". Question 20's "Z enith" is the PDF split of "Zenith", which the ASR has as one word (recall 0.974). Question 1's "all right" / "okay" are in unselected in-clip English segments 14 ("All right. They come in two patterns...") and 17 ("Okay. And there are two different models..."), at 64.184 s and 73.184 s, inside the 51.184–106.832 s cut. The clip is the whole VAD event, so those words are not trimmed out of the audio. The selector is allowed to ignore them and still clear 0.948.

### 2. Blocker. Question 5 is one qualified cut and two speech events, counted as one play

`questionAudioProof.ts` 680-693 rejects an event that straddles the cut and requires at least one event fully inside. It accepts two events fully inside. Questions 5 and 19 are the only cuts with two events. Every other cut is exactly one activity event. Pads on each island are 6,400 samples (400 ms) on both sides.

Question 5 range `4852992..5659392`:

- Event 7: `4852992..4970752`. Unpadded speech `4859392..4964352` (6.56 s). English text overlapping that window is the official second line, "Hello, Mr. Smith. I have a favor to ask about our broadcasting station's singing competition." The Korean cue "5번..." is in the same window.
- Gap `4970752..5035264` = 64,512 samples = 4.032 s, inside the cut.
- Event 8: `5035264..5659392`. Unpadded speech `5041664..5652992` (38.208 s). Its overlapping English text includes "Hi, Ms. Brown." and the Mr. Smith line again.

`copies.length` is 1 because `expectedRepetitions` is 1. The repetition span for every section is the same characters `313..328`, text "모든 문제는 한 번씩만 들려", and that span is outside every section (`repInsideSection` 0). The regex at lines 616-624 only asks that this shared preamble match `한번` after whitespace removal. The one "twice" in the transcript is "guided tours twice a day" (character 7367), not a second broadcast. Next-event dialogue recall against each item's own script is under 0.2, so the following island is not a second reading of the same script. Question 5's second island is inside the cut, so the gate never has to call it a copy.

Question 19 range `17768192..18521344` also spans two events. Event 22 is 1.504 s padded and 0.704 s of unpadded speech, then a 3.872 s gap, then the dialogue event. A 0.7 s island fits the Korean cue "19번", which is entirely inside the cut (overlap 22,400 samples, nothing before or after the cut). That one is consistent with "number announcement included." Question 5's first island is 6.56 s, which is not just "5번."

English segment 348, "Also, high room temperatures can lead to dry skin.", is timestamped 1095.710–1110.820 s (15.1 s for one sentence). Question 19 starts at 1110.512 s, so the timestamp tail crosses the next cut by about 0.31 s. That timestamp cannot place question 18's last line inside event 22. It does show that ASR times in this region are too coarse to identify a short island.

Fix: a qualified range may contain a second VAD event only when that event is the already-proven cue and its unpadded speech is shorter than the cue's own ASR span. A 6.56 s island must be a declared copy, with its own first/last coverage, or the question stays unqualified. Point `repetitionEvidence` at text inside the section, or require a second non-overlapping VAD island when the count is 2. The global preamble must not satisfy all 20 items.

### 3. High. The bytes that are cut are not the bytes whose VAD hash is stored

`loadListeningQuestionAudioPlan` checks artifact SHA-256 before any database call (`questionAudio.ts` 90-97) and then:

```360:365:src/lib/english/listening/runtime/questionAudio.ts
    if (
      Math.abs(
        activity.decodedSampleCount -
          Math.round((source.frameCount * 16000) / source.sampleRate),
      ) > 1
    )
      fail("VAD resampling frame identity differs");
```

`decodedMonoFloat32Sha256` is a required field (`questionAudioProof.ts` 219) and is never recomputed from the MP3 or from the mpg123 PCM. Activity `decoder` is `pyav-faster-whisper`. Raw `decoder` is `faster_whisper.audio.decode_audio/PyAV`. The clip path decodes with mpg123 (`mp3.ts` header comment; `decodeMp3` enables gapless). `sampleClip.ts` 34-51 then cuts exact native frames. For this file the conversion is exact: `floor/ceil` does not add a frame because 48,000 / 16,000 = 3, and every stored frame pair matches `sample * 3`.

Length agreement is real (finding table, delta 0 after gapless trim). Content-hash agreement between PyAV float32 and mpg123 int16 was not established, and the import does not establish it. A swapped activity file with the same sample count, the same event topology, and a rewritten float32 hash would pass this check. The raw file's own `policy` string says the padding is not a guarantee. The import treats that file as the cut authority anyway.

Clip SHA-256 values in `apply.json` match `verified.json` and match the byte formula. They were not regenerated here.

Fix: decode once with the mpg123 path that cuts, hash that int16 PCM, and require the activity file to carry that hash. Recompute it in `loadListeningQuestionAudioPlan` and fail on mismatch. Keep the float32 hash only as a second, explicitly different, identity. The `> 1` sample slack did not fire here (delta 0). Leave it. Do not widen it.

### 4. High. "400 ms silence" is the VAD pad length, and the WAV energy says the leading pad is not silence

The proof computes `(unpaddedStart - cutStart) / 16` and requires it ≥ `speechPadMs` (`questionAudioProof.ts` 701-709). Raw options are threshold 0.5, `minSilenceDurationMs` 2000, `speechPadMs` 400. All 20 cuts sit exactly on 6,400 samples. `apply.json` stores `leadingSilenceMs: 400` and `trailingSilenceMs: 400` for every clip.

RMS below is `sqrt(mean(sample^2))` on the int16 snippet, peak is max abs. "Outside" is the 400 ms before the boundary. "Pad" is the first or last 400 ms inside the cut. No listening label is attached. For scale: digital silence in these files is RMS about 1–12. The windows called speech later in the same snippets are often RMS about 800–2,500.

Leading edge, all 20: outside RMS 1–12 (peak ≤ 59), inside-pad RMS 499–1,595 (peak 4,181–10,023). The waveform jumps at the cut. The 400 ms the gate calls silence is in the loud region. Question 4's pad (RMS 1,461) is louder than the following 400 ms (RMS 883). Question 9's pad (RMS 1,595) is louder than the following 400 ms (RMS 1,120). Acoustic onset is inside the cut, not before it. That is evidence against a chopped first word, and evidence against the silence label.

Trailing pad RMS, inside the last 400 ms of the cut:

- Quiet (RMS ≤ 35): questions 3, 6, 9, 11, 12, 13, 18, 19.
- Loud (RMS 630–675, peak about 2,000–2,500): questions 1, 2, 4, 5, 7, 8, 10, 14, 15, 16, 17, 20.

On those 12 loud endings the next 400 ms outside the cut is RMS 215–226 (peak 758–1,250), not the digital floor seen before the starts. The following 400–800 ms is about RMS 509–528 and peak about 2,600 on questions 1, 2, 4, 7, 8, 10, 14, 15, and 17. Questions 5, 16, and 20 are lower there (RMS 410–488, peak 1,781–2,230). A repeated shape across different items is not item dialogue. It is also not silence. Last-utterance token recall is 1.0 on the short closings ("Thanks.", "Cool!", "Okay."). Question 14's last-segment recall is 0.903, the tightest edge margin, while the full selected copy recall is 1.0. Question 20's 0.974 is the "Z enith" token split, and the ASR text contains "Zenith". This audit does not claim a last word was left outside the cut.

Fix: stop naming the VAD pad "silence" in the apply record. Keep the 400 ms sample pad. Add an energy check on the exported boundary snippet: the 400 ms outside a start must stay at the digital floor (these files are already there), and a trailing pad whose RMS is within the same order as the preceding speech must not be recorded as trailing silence. Do not replace that check with a lower VAD threshold.

### 5. Medium. Item instructions are inside the cut. The exam-wide instruction is outside. There is no shared dialogue in this round

All 20 sections have one question number. `sharedPassageQuestionNumbers` is null. The shared-passage branch (`questionAudioProof.ts` 852-891) does not run on the only certified round.

Korean cues are entirely inside each cut (`beforeClip` 0 and `afterClip` 0 on all 20). Examples: question 1 cue segment 2, "1번 대화를 듣고 여자가 구입할 비옷을 고르시오.", samples `866944..962944` (6.0 s) inside `818944..1709312`; question 11 and 14 cues are the short text "11번" and "14번". The group transcript stored at `questionAudio.ts` 395 is the English utterances only. The cut therefore contains Korean stem speech that the stored transcript does not.

The exam-wide line is activity events 1 and 2 (`1280..64768` and `278272..780032`), not equal to any question range. Question 1 starts at event 3, `818944`, 2.432 s after event 2. English segment 8 ("so please listen carefully...") is timestamped 45.060–51.380 s and overlaps the question 1 start (51.184 s) by about 0.20 s. The 400 ms before that start is digital silence, so the overlap is a timestamp tail, not a loud instruction left inside the cut.

Latent hole, not fired here: a cue with `scopeEvidence` does not go through `selected()` (`questionAudioProof.ts` 736-748). It only rejects a cue whose estimated end is past `question.endSample`. A common-scope cue can sit entirely before the cut. Per-item cues in this round use the stricter `selected()` path and do overlap the cut. The fixture test "models an official common numbering scope without joining two different dialogues" expects two groups, so common numbering is not supposed to merge audio. It still does not pin the cue inside either cut.

Fix: run the common-scope cue through the same overlap test as `selected()`. Keep shared-passage grouping as it is until a real multi-question passage is in the strict file. Do not invent one for this round.

### 6. Medium. First and last coverage has no precision floor

First and last ids must be a prefix and a suffix of the selected ids (lines 783-793). Coverage of those texts checks recall only (lines 825-834), not precision. Question 15's first utterance is "Number One". The first-segment text begins "Number one. Excuse me, are you leaving? Yes, you can park here." Recall is 1.0 and precision is 0.167. In this file the words do start the segment, so the weak check happened to be aimed at the start. Question 16's last utterance recall is 1.0 with precision 0.294. Question 11's first segments drop "now for the next story" (recall 0.937) and the last segments include them (recall 1.0). The full copy still has recall 1.0.

Fix: require the first utterance's tokens to be a token prefix of the first-segment text, and the last utterance's tokens to be a token suffix of the last-segment text. Recall ≥ 0.9 on a long segment is not that test.

### 7. Authorization, edit, race, quota, private Storage

No bypass was found in the CLI or the adopt path. These gates are intact:

- Unknown flags fail. There is no `--approve` (`adopt-listening-question-audio.mts` 61-63). Help text matches the code.
- `questionAudioDatabaseUrl` accepts only `db.${PROJECT_ID}.supabase.co` as `postgres` or that project's pooler user (lines 18-38). Apply also requires Storage URL `https://${PROJECT_ID}.supabase.co` (lines 91-95). The snapshot `ownerId` must equal the fixed `OWNER_ID` (lines 88-89, 14).
- `teacher()` rejects non-teachers and unapproved, deleted, or suspended users (`database.ts` 95-120). `ownedSet` then requires `withinOwnerScope`. Rights must be approved and include both `store_original` and `teacher_review`. Any publication row, or any group review flag, fails closed (`questionAudio.ts` 464-481). `humanReviewed: true` cannot be stored on the alignment (`questionAudioProof.ts` 144, literal `false`).
- Document CAS: `expectedRevision` plus full document hash before upload, and `updateSet` updates `WHERE revision = expectedRevision` (`questionAudio.ts` 512-514, 957-968; `sets.ts` 205-208). The `already_split` shortcut requires the audit payload's document hash and revision to match the current row, then rechecks each clip hash (`questionAudio.ts` 488-510).
- Private payload: `storage: null` on apply fails with "private Storage is required; PostgreSQL blobs are forbidden" (lines 645-646). Inserted rows set `storageChunks: true`. `valid()` rejects `record.storage` or `record.drive`. `putBlob` on that path calls `storage.uploadChunk` (`storageStore.ts` 247-285). Postgres holds the metadata row and the blob pointer, not the PCM, on this path.
- Owner quota is checked inside `pg_advisory_xact_lock(hashtextextended('listening-media:' || ownerId, 0))` before insert (`questionAudio.ts` 597-611, `storageQuota.ts` 21-68). `putBlob` then refuses to exceed that row's `reservedBytes` (`storageStore.ts` 271-275). Reservation is `totalBytes + 1 MiB`. Chunks are content-addressed by SHA-256 and offset (`questionAudio.ts` 733-744). The seal re-reads stored bytes and fails if the hash or duration differs (787-817). Compare-and-swap failure after seal is accepted only when the row is already `ready` and still matches the same identity (854-859).

Residuals, not bypasses:

- The CLI's authority is the database URL. It does not check an interactive session. `teacher()` grants `materials` when the menu list contains `english-listening` or, for materials access, `english-bank` (`database.ts` 116-119). The pinned owner must still own the set.
- The advisory lock is transaction-scoped and is not held during the upload. Two appliers of the same asset id serialize on the unique insert and on chunk offset/hash. A mismatched resumed chunk fails. A teacher edit that lands first changes the revision and the final CAS fails closed. The upload loop does not roll back a clip that already reached `ready`. `cleanupExpiredUploads` (`service.ts` 891-928) is not called by this CLI, and it only tombs non-ready expired rows. A conflict therefore leaves a ready private object and its quota charge. That is fail-closed for the document, and it is an orphan until something else deletes that asset id.
- Read-only preflight sets `SET TRANSACTION READ ONLY` as the first statement (lines 590-593). The checked `verified.json` rerun is `already_split`, which returns before the advisory lock. This audit did not execute that SQL.
- `questionAudio.ts` 926-947 drops evidence spans that do not fall inside the native frame range, with no count. This audit did not enumerate stored evidence spans, so it does not claim a drop happened on these 20.

Fix for the orphan: on final CAS failure, tombstone clip rows that this plan created and that the document does not reference, and call the existing expired-upload cleanup. Do not skip the quota check to make retries easier.

## What is not claimed

- No WAV was listened to. Loud versus quiet above is RMS and peak only.
- mpg123 output bytes were not hashed here. Header gapless length matches the VAD length exactly. Clip SHA-256 values were compared across `apply.json` and `verified.json` and against the 48 kHz stereo byte formula, not against a fresh decode.
- The database row was not read. `applied` and `already_split` are the local JSON claims.
- Shared-passage behavior and a true two-play broadcast are not exercised by this round. The code paths exist. This file does not prove them.
- The other 2,397 original and 1,282 reconstructed boundaries were counted, not audited item by item. They remain uncertified, which matches the summary policy sentence: cache validity does not approve a cut.

## Concrete stop line

Keep the applied artifact for this one source on the current gate, and do not describe it as human-verified or as silence-padded. Before any further source is adopted, fail closed on missing numeral tokens, on a second speech island that is not the cue, and on a VAD file whose PCM hash was not recomputed from the mpg123 buffer that `sampleClip.ts` cuts. Leave the 0.9 floor, the private-Storage requirement, the document CAS, and the owner lock where they are.

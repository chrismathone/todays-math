# Listening media L0 protocol evidence

2026-10-03. Scope: the media portion of the [approved listening plan](../../english-listening-plan-20261003.md), implemented as an isolated Node library and offline filesystem probe. This is **not production storage, an enabled route, L1 MP3 acceptance, or L3 full-exam media acceptance**. No existing source files, database schema, dependencies, routes, menus, or the old 4MiB upload path were changed.

## Delivered interface

- `src/contracts/englishListeningMedia.contract.ts`: strict upload, chunk, completion, playback and readiness contracts; unknown fields such as original filenames are rejected. No original filename, transcript, ID3 fields or storage key is accepted into response contracts.
- `src/lib/english/listening/media/service.ts`: `createListeningMediaService({store, authorize, now?, limits?})`, providing `beginUpload`, `appendChunk`, `completeUpload`, `getVerifiedReadiness`, `serve`, and `cleanupExpiredUploads`.
- `ListeningMediaStore`: detached metadata snapshots, atomic create/CAS, immutable private blobs with bounded reads, deletion and bounded expiry listing. `LocalTempListeningMediaStore` implements this for a single local process, with metadata in memory and blob files in an exclusively created temporary directory.
- `scripts/qa/english-listening/media-probe.ts`: runnable original-tone experiment. It needs no environment files, network, database, GUI, audio device, or paid call; it removes its own temporary directory on completion.

`authorize(context, {action, setId, assetId?})` is mandatory. The service requires literal `true`; denials and exceptions fail closed. Actions are `store_original`, `playback`, and `publish`. The application must resolve current branch/owner, account status, purpose-specific rights, asset/set linkage, assignment, current membership, mode, deadline and any delivery-token expiry in this callback. A student's `teacher_device` assignment cannot authorize playback. Uploads check authorization again after body/hash processing and before commits. This library does not pretend to implement the application's account or assignment policies.

`getVerifiedReadiness(context, {setId,assetId})` authorizes `publish` before reading metadata. Only a stored `ready` result can return `{setId,assetId,sha256,durationMs,publishable:true,...}`; all other stored states return null. A publication coordinator must call this on the server and match immutable references, rather than trusting a receipt supplied by a client. `publishable` means this media protocol's transport/format gate is satisfied; separate rights, human audio/content review, revision and publication rules still apply.

## Upload and playback rules

The L0 defaults are 1MiB upload chunks, 64MiB total, 64KiB storage reads, a one-hour upload lifetime and a one-hour maximum PCM duration. They are experimental ceilings, not approved deployment limits. Configuration has hard bounds of 1MiB per chunk/read and 256MiB total; a session cannot require more than 4,096 chunk descriptors. Every chunk must be the full configured size except the final chunk. At most one upload chunk is buffered; final verification streams the complete asset.

Chunks are sequential, carry their expected revision, offset, length and SHA256, and commit through CAS. Exact retries verify their actual bytes and replay the original acknowledgement. Changed retries, gaps and stale revisions conflict. Concurrent identical appends/finalizations converge, whereas conflicting appends cannot overwrite accepted bytes. Lost-CAS temporary blobs are removed. Completion requires all bytes, an independently streamed full-file SHA256 match, matching MIME/signature, supported format and bounded duration. A hash failure leaves an unplayable failed record. Accepted bytes and final assets are immutable.

| State | Playback | Cleanup |
| --- | --- | --- |
| `uploading` | Unavailable, including HEAD | At upload expiry |
| `publish_blocked` | Unavailable, including HEAD | At upload expiry |
| `failed` | Unavailable, including HEAD | At upload expiry |
| `expired` | Unavailable, never revived | Retry deletion until chunk references are cleared |
| `ready` | Current authorization required for every request | Never deleted by upload-expiry cleanup |

Every supported GET/HEAD is authorized before metadata lookup, including malformed or unsatisfiable Range requests that reach the media handler. Invalid contract input is rejected without reading storage. Unauthorized, missing and incomplete assets all yield an empty 404 without asset length or range metadata. GET supports one closed, open-ended or suffix byte range, clamps an overlong end, and returns 206; unsupported, multiple, malformed or unsatisfiable parsed ranges return 416 with `Content-Range: bytes */size`. HEAD returns 200/full length, ignores Range, and opens no blob. This follows the GET-only Range rule in [RFC 9110 §14.2](https://www.rfc-editor.org/rfc/rfc9110.html#section-14.2).

Responses carry `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`. Playback filenames are generated `audio-<opaque UUID>.wav`. No source filename, hash ETag, storage URL, metadata tag or transcript is returned in response headers. Reads are lazy, bounded and closed on cancellation; unexpectedly oversized, empty or truncated adapter output fails the stream. Revocation rejects the next request, including HEAD or a new Range, before any metadata/byte access. Bytes already delivered or in a response authorized before revocation cannot be recalled.

## Format capability and publication blockers

The playable local format is deliberately narrow: canonical RIFF/WAVE containing exactly `fmt ` (16-byte PCM format), PCM16 mono/stereo, `data`, and EOF, at an enumerated supported sample rate. RIFF length, data length, byte rate and block alignment must agree. Actual sample-derived duration is checked against the limit before rounding up to a positive safe integer millisecond in the completion contract, matching the document audio reference. PCM16 permits every sample bit pattern, so exact structure and full-byte validation establish sample decodability; optional chunks, LIST/ID3, trailers, compressed codecs, float PCM and malformed format fields are rejected. Sample layout follows [Microsoft's WAVEFORMATEX documentation](https://learn.microsoft.com/en-us/windows/win32/api/mmreg/ns-mmreg-waveformatex). This is not a general-purpose WAVE decoder or a claim that the audio matches its teaching content.

**MP3 full decoding and metadata scrubbing are unavailable.** An ID3 or MPEG frame signature is only a hint. A matching declared MP3 is stored privately but completion returns `publish_blocked`, `publishable:false`, `blocker:mp3_decoder_and_scrubber_unavailable`; no MP3 bytes or ID3 tags are served. Signature matching never attests that a complete MP3 decodes. Production MP3 work must add an audited full decoder, duration enforcement and a sanitized playback derivative with a separate hash/revision, then repeat format, leakage and deployment tests. Teacher playback/content review remains necessary.

## Actual checks

Commands were run in the media worker worktree using the existing main `node_modules` through a junction; no dependency installation or edits were made.

```powershell
node node_modules/vitest/vitest.mjs run src/__tests__/unit/englishListeningMedia.test.ts
node node_modules/tsx/dist/cli.mjs scripts/qa/english-listening/media-probe.ts
node node_modules/typescript/bin/tsc --noEmit --strict --skipLibCheck --target ES2017 --lib ESNext,DOM,DOM.Iterable --module esnext --moduleResolution bundler --types node --esModuleInterop src/contracts/englishListeningMedia.contract.ts src/lib/english/listening/media/service.ts src/lib/english/listening/media/localTempStore.ts src/__tests__/unit/englishListeningMedia.test.ts scripts/qa/english-listening/media-probe.ts
node node_modules/eslint/bin/eslint.js src/contracts/englishListeningMedia.contract.ts src/lib/english/listening/media src/__tests__/unit/englishListeningMedia.test.ts scripts/qa/english-listening/media-probe.ts
```

- RED was observed before implementing the missing media modules, and the fractional-duration regression failed before its correction; the final focused suite passes **15 tests**, including concurrent retry/conflict/finalization, unknown fields, byte caps, incomplete assets, hashes, MIME/signatures, tags, duration/44.1kHz rounding, revocation during uploads, scoped readiness, expiry, cleanup retry, authorization exceptions, HEAD/Range ordering, cancellation and faulty adapter output.
- Scoped TypeScript checking and ESLint pass. The probe's initial DOM typing issue was fixed by using `getReader()`; the final code does not depend on the DOM async-iterator type extension.
- The unchanged `englishFence.test.ts` passes **9/10** in this isolated worker: its allowed-script list does not yet recognize `scripts/qa/english-listening/media-probe.ts`, so the probe's intended import of the media library fails the chain guard. The coordinator owns the narrow fence integration and must rerun the guard after merging; this worker did not edit that shared file.
- The original 440Hz tone is **60 seconds, 5,760,044 bytes**, uploaded in **six chunks**. SHA256 is `74f64a5cc8181b31f71b51f874a46bb2e27f0a03e58e07a9f1fdee6c0710a921`. The streamed download has the same hash; closed/open/suffix seeks match the source bytes, including a seek across a chunk boundary.
- Maximum observed storage-read piece: **65,536 bytes**. The probe separately verifies exact retries/conflicts, incomplete rejection, HEAD without byte reads, 416, private neutral headers, post-revocation rejection before both metadata and bytes, expiry/cleanup, hash mismatch, and explicit MP3 publication blocking.

## Limits and remaining integration

This adapter is single-process and ephemeral: metadata disappears on process exit; a crash can leave temp blobs. Graceful cleanup is covered, but no scheduled worker or crash-recovery/orphan sweeper is deployed. A production adapter must supply durable cross-process CAS, immutable private storage, lifecycle/orphan cleanup, purpose-aware access, aggregate per-owner quotas, rate/concurrency limits, and platform body/time/stream cancellation enforcement. It must never expose original blobs via a public or bypass URL. Metadata/header safety cannot stop encoded secrets in the audio signal or already downloaded bytes.

No real deployment body limit, storage product, CDN behavior, signed-link expiry, browser playback, slow network, device switching, full-exam-length media, teacher listening review, restart persistence, DB migration or operational cost was verified. Docker was unavailable and neither a GUI nor the shared database was used as a fallback. The root coordinator owns application access/fence integration, publication bridging, storage selection and the remaining L0/L1 acceptance gates.

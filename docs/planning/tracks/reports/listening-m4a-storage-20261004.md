# Trusted M4A original and MP3 playback

The local bulk importer can preserve an M4A source and use a separately validated MP3 playback derivative. Browser upload and ready MIME schemas remain `audio/wav | audio/mpeg`; no client field enables native conversion.

```ts
import { prepareListeningM4aPlayback } from "@/lib/english/listening/media/trustedM4a";
import { registerStorageListeningAsset } from "@/lib/english/listening/runtime/storageAssets";

const prepared = await prepareListeningM4aPlayback({
  sourcePath: absoluteM4aPath,
  ffmpegPath: absoluteLocalFfmpegExecutable,
});
const ready = await registerStorageListeningAsset(db, storage, {
  actor,
  setId,
  expectedSetRevision,
  assetId, // Keep the existing checkpoint identity on retry.
  bytes: prepared.sourceBytes,
  playbackDerivative: prepared.playbackDerivative,
});
```

Preparation snapshots the bounded original bytes, performs a native full strict float PCM decode with finite-sample checks, and encodes a `libmp3lame -q:a 0` derivative. The complete derivative must pass the portable strict decoder with exactly the original decoded sample count, sample rate, and channel count. Native execution uses argument arrays, absolute paths, local file/pipe protocols, hidden Windows processes, bounded output and timeout, and temporary-file cleanup. Native diagnostics and source metadata are not exposed. The process-local capability rejects forged objects and modified buffers; it cannot be serialized into a checkpoint.

AAC-to-MP3 transcoding is lossy. The original M4A is preserved unchanged; the transformation and both identities are recorded separately. Each private Storage object is at most 1MiB. `record.chunks`, `expectedSha256`, and completion `originalSha256/totalBytes` describe the original M4A. Separate `record.playback.chunks/sha256` describe scrubbed MPEG frames. Existing same-owner scope, immutable ready sealing, physical-object quota, whole-round alias cloning, range proxy, and selected-question PCM clipping apply to both streams. A failed transaction removes only its newly created objects. Content, audio, alignment and external distribution approvals are not inferred from technical validation.

The private bucket must allow `audio/mp4` for original preservation. There is no original-M4A browser playback route or public Storage URL.

Read-only preflight for the actual 2006 중1 제2회 source: 11,180,490 original bytes, SHA256 `a6a85ca0ffa346642b6e821b75bc3b843a915ab1741687153ba9c48766bbd9cb`; 21,311,136 derived MP3 bytes, SHA256 `6e6992f5b967db06dbb2139f52dad0d4f1b028a348ba1813c3d7e8ad35430e9d`. Both decode to exactly 43,975,680 samples per channel at 48kHz stereo, or 916,160ms. The container duration display differs, so the verified sample count defines playback duration. No production DB or Storage write was performed by this worker.

Verification: actual source native preparation passed; the native/forgery/public-schema tests and fresh isolated PostgreSQL tests for original restoration, idempotent registration, scoped full and selected playback, alias cloning, and rollback passed (6 focused tests). Targeted TypeScript and changed-file ESLint passed. Native tests require an explicit absolute `LISTENING_M4A_TEST_FFMPEG_PATH`; portable tests do not require FFmpeg.

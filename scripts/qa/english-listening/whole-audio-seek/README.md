# Whole-original listening seek starts

National listening assessments retain one original recording per source. A
verified question start becomes `audioRange.startMs`; `endMs` is the full original
playback duration. The UI seeks the same recording and continues to its end.
These tools do not create clip assets, upload media, rewrite question content,
publish materials, or confer human review.

Claude produces evidence for the 121 official sources. Grok produces evidence
for the 72 reconstructed sources. Codex independently replays source bytes,
production playback clocks, bounded recognition input, native onsets, question
identity, actual spoken scope and reconstruction grounding. Producer candidate
counts are **not** admission counts. Every current question receives an explicit
admitted, preserved or held outcome in the final independent certificate.

`sourceNumber` identifies the displayed current question. For reconstructed
questions it can differ from the original spoken ordinal. Match those questions
using immutable generation evidence inside the actual source passage, never
displayed index equality, a nearby timestamp or topic similarity.

Several reconstructed questions may use the same original passage. Each must
independently bind its frozen generation evidence to that passage. They share
the actual spoken number, native probe and seek start; their displayed numbers
do not create additional spoken question numbers or a fabricated shared scope.

The GPU recognition runner uses one loaded model at a time with an exclusive
shared lock and unloads before handing the lock to another owner. Reuse verified
bounded probe caches on resumption. Do not delete a live owner's lock or persist
full-source PCM. Run heavy TypeScript checks after recognition queues settle.

## Independent evidence and root adoption

Freeze the live source snapshot, original/prepared/ASR/script/answer files and
actual production media bindings before producing starts. Preserve the existing
38 ranges exactly. The independently replayed certificate must cover all 193
sources and 3,699 questions, have no structural errors, and retain held reasons.
Only admitted proof artifacts can supply new starts. Existing clip-end criteria
remain in the earlier strict split verifier; a seek-start proof continues to the
whole recording's end.

The root operator accepts the reviewed certificate and media-binding hashes,
rechecks its inputs and nested admitted proof manifests, checks the correct
Supabase project and teacher ownership, and saves one source in each bounded
transaction. Each write compares the original revision and entire JSON document,
retains original media records, and writes an audit tied to the certificate.
An exact audited previous application can be resumed; concurrent edits abort.
Proposed document hashes are canonical so JSONB property ordering cannot break
readback. Original frozen file/document hashes keep their original definition.

Run the operator first without `--apply`, using actual reviewed paths and hashes:

```powershell
node --conditions=react-server --env-file=.env --import tsx scripts/qa/english-listening/whole-audio-seek/register-seek-starts.mts --owner <owner-uuid> --inventory <inventory.json> --certificate <certificate.json> --certificate-sha256 <reviewed-sha256> --media-bindings <media-bindings.json> --media-bindings-sha256 <reviewed-sha256>
```

After the dry run and independent review, repeat with `--apply`. The operator
writes local before/plan, per-source receipts and a final live-readback report
under `.qa-artifacts/whole-audio-seek-20261005/adoption-<timestamp>/`. Those receipts
provide actual coverage; a producer's completion message does not prove DB
registration. No secret values belong in tracked evidence or command arguments.

Run the root adoption regression suite with:

```powershell
node --test scripts/qa/english-listening/whole-audio-seek/admission-plan.test.mjs
```

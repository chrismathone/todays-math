# Whole-original listening seek starts

National listening assessments retain one original recording per source. A
verified question start becomes `audioRange.startMs`; `endMs` is the full original
playback duration. The UI seeks the same recording and continues to its end.
These tools do not create clip assets, upload media, rewrite question content,
publish materials, or confer human review.

Claude produces evidence for the 121 official sources. Grok planned the
72 reconstructed sources; after its weekly quota stopped compilation, Gemini
3.1 Pro through Antigravity resumed the unfinished recognition queue and
compiled its evidence with explicit model provenance. Codex independently replays source bytes,
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
actual production media bindings before producing starts. Preserve every range
already in the frozen live snapshot exactly. The first wave retained 38 starts;
the second wave retains all 2,203 starts adopted from its completed proof.
The independently replayed certificate must cover all 193
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
node --test scripts/qa/english-listening/whole-audio-seek/rebase-verified-baseline.test.mjs
```

`rebase-verified-baseline.mjs` prepares a later verification wave only after
checking that the complete current documents are the exact previous adoption.
It retains every existing range and changes only revision/document references
on the unchanged physical clock and proposal identities. The independent
verifier checks the previous immutable certificate, inventory and clocks again.
Existing reconstructed starts retain their proven original spoken scope, which
can differ from displayed question numbers. Conflicting new starts are held.

For repeated official instructions and mixed English/Korean wording, the
explicit `numbered_section_own_dialogue_v1` route needs a reliable literal
number, the current numbered source section's unchanged instruction and an
exact, unique opening of its own dialogue. A bare numeral also needs a separate
reliable number-only native recognition at the same measured start. Every
number, instruction and dialogue input is hash-bound and decoded independently;
neighbors must survive to the final certificate. The earlier unique-instruction
route retains its original constraints. Producer-only judgments remain
diagnostic until the independent replay and actual DB readback pass.

## Completed Claude held-question verification, 2026-10-05

Claude examined the 1,496 previously held questions and supplied 310 official
and 214 reconstructed candidates. Root independently replayed all 524 candidates
from their whole original recordings, checked the complete 193-source /
3,699-question population and settled ordering and boundary dependencies. All
524 passed; every one of the 2,203 existing ranges was preserved exactly.

The actual root application at `2026-10-05T12:16:59Z` registered the 524 starts
across 139 sources in Supabase project `jyaguxwuaxgdnovtulna`. Readback checked all
193 sets and their unchanged original assets: 2,727 total starts, 972 held
questions, 185 sources with a start, 74 fully located sources and eight sources
without a verified start. The original audio, prompts, choices, images, answers,
metadata and human-review/publication state were retained. Every new range ends
at the whole original recording's end; no new Storage object was written.

Completed evidence under
`output/listening-assessments/whole-audio-seek-20261005/`:

- Claude census: `claude-held-validation-20261005/report/report-001/`, all 1,496
  unique held IDs with actual listening coverage and explicit remaining reasons.
- Independent certificate: `codex-held-validation-20261005/replay-final-002/certificate.json`,
  SHA-256 `776d313ae3ffc626627c722a93e2c24e7eff0284890f4e268bf676114d6e6046`.
- Executed immutable code: `codex-held-validation-20261005/final-implementation-003/`,
  30-file manifest SHA-256
  `247d5f0c5c319c30da167701a15887bbc7e19539425227a969c2b44f2174d720`.
- Actual application: `.qa-artifacts/whole-audio-seek-20261005/adoption-2026-10-05T12-16-32-530Z/report.json`.
- Authorized runtime readback: `.qa-artifacts/claude-held-validation-20261005/runtime-readback-2026-10-05T12-19-46-365Z.json`,
  eight question starts in seven sources and 16 real private-Storage Range
  requests, all HTTP 206, through the production media service and teacher scope.

Screenshot source `ebsi-high-2-2018-2` Q2 and Q3 are registered at 87,800 ms and
123,380 ms, both continuing to 1,540,224 ms. The earlier interrupted
`codex-held-validation-20261005/replay-final-001` produced no certificate or DB
application; only completed replay 002 supplied admission authority.

Root regression checks pass 191 Python and 31 Node tests; the executed archive
contains the 188 Python tests available before the later-wave scope inheritance
guard was added. Claude's 49 Node tests also passed independently at root.

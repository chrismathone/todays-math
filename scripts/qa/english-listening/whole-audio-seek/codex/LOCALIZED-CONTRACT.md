# Additive adapter native-localized-generation-v2

This named adapter remains within evidence contract 1. Old routes and their
full-ASR heading/neighbor gates remain unchanged. It applies only to reconstructed
questions and does not write production metadata, audio, Storage or human review.
The original waveform, current question/revision/content, frozen generation
alignment and prepared grounding own identity; displayed numbering contributes
none. Provider times and confidence remain diagnostics.

Rows retain the existing identity arrays and nativeEvidence cache/energy shape.
Set `evidenceAdapter:"native-localized-generation-v2"`. `probeEvidence`,
`nextProbeEvidence`, and `dialogueProbeEvidence` use the existing immutable raw
request/container reference shape with path, sha256, probeId, segmentIds, literal
text and inputMonoFloat32Sha256. Full source PCM, every clip PCM and every 16kHz
mono float32 input are independently reproduced on CPU. Both numbered Korean
probes are at most 14 seconds; the English dialogue probe has
`purpose:"localized_generation"` and is at most 60 seconds. Its source offset and
frame count need no invented speech onset or quiet measurement. `nextNativeEvidence`
and `sharedHeadNativeEvidence` retain separately named absolute/noise-floor proof
when their actual source needs that tier. Every raw segment,
word, metric, uncertainty flag and overflow is retained and validated. A producer
summary cannot substitute for any missing probe, request or source hash.

`quietEvidenceMethod:"independent_full_source_quiet_v1"` with
`rawProbeQuietBeforeFrames` retains a raw discovery window's original bounded
quiet count while the row's `quietBeforeFrames` carries the separately remeasured
full-source quiet. This applies only to the named v2 route. Raw request, start and
onset frames stay exact; the actual full-source count, threshold, min(400ms,quiet)
lead and lead peak must pass the unchanged independent waveform policy. Without
this explicit method, the raw/row quiet counts must match. A capped search window
does not become physical measurement authority.
The override additionally requires
`quietDiscoveryEvidence:{method:"noise_baseline_capped_discovery_v1",
contextStartFrame,contextFrameCount,contextEnergySha256,request:{path,sha256},probeId}`.
The exact hashed noise baseline of the named one/two-second tier defines the
discovery context. Raw quiet must equal min(actual full quiet,contextFrameCount),
and request/probe identity must equal the unchanged raw request. File paths compare
by resolved exact identity while the SHA and probe ID remain exact, so Windows
slash spelling cannot cause a false hold; another file with the same bytes cannot
replace the request. Unknown context,
wrong cap, altered request, unproved absolute-threshold caps or full quiet mismatch
stay held.

The heading and next numbered heading have a reliable literal ordinal first and
an actual complete Korean instruction, and their starts are remeasured by the existing
absolute/noise onset policy. The head probe must reproduce the row's exact native
start/onset. The next heading begins at the next original number. The complete
English clip must fit between head start and next heading start. A quote timestamp
alone cannot make a clip crossing a boundary admissible.
The introductory word `듣고` is incomplete. The first literal reliable instruction
prefix must finish with `고르시오`, `고르세요`, `답하시오`, `답하세요`, or `선택하시오`.
Only this complete prefix classifies shared scope; a beginning of dialogue in the
same unchanged raw segment remains retained without altering that classification.
When a declared head selects only the introductory segment, the verifier may
derive the first complete contiguous reliable raw prefix, retaining the declared
text and IDs unchanged and recording `literal_complete_native_instruction_v1`
context with the additional original IDs/raw flags. It stops before any new
numbered heading, English dialogue (including one-word Latin speech), or uncertain segment. `고르는 문제입니다`
alone is incomplete; actual subsequent `잘 듣고 답하세요` completes the instruction.

Exactly one next boundary is required. A known next original scope can instead use
`nextCertificateEvidence:{certificate:{path,sha256},questionId,scopeQuestionNumbers,
nativeOnsetFrame,startMs}`. The allowed certificate/scope/onset/start comes only
from `verified_ancestor_rows` after it validates the frozen inventory's exact
adoption and ancestry chain. A producer-created complete-certificate lookalike or
a preserved echo has no boundary authority. The original admitted record must
equal the current preserved range/source identity. Its actual full PCM, cache,
energy, onset, raw request, selected raw quote, clip PCM and mono recognition input
replay again. Every historical raw container must appear in the complete catalog,
and all nested refs stay in the new certificate. Displayed numbering contributes
no reconstructed boundary identity.

`kind:single` has one original number. A true `shared_passage` requires the
complete spoken adjacent pair and literal shared question instruction. A
`shared_instruction_head` starts the first member at the original joint heading,
has the first number as scope, and the next native boundary is the second member.
Later `shared_instruction_member` requires `sharedHeadProbeEvidence`, an actual
earlier measured Korean pair/range heading with the shared instruction and current
number as a later member. The next cue may inherit only that exact head's
instruction while it remains in the same literal range. The range 18 through 20
retains spoken endpoints `[18,20]` and resolves membership `[18,19,20]`; the first
member's next cue must be 19. Ordinal adjectives such as `5번째` and bare numbered
answer options without question instructions are not promoted to headings.
Unproved members and missing next headings stay held.

`terminalProbeEvidence` with `terminalNativeEvidence` offers the separately named
`literal_original_closing_v1` boundary only after original 20 in an EBS middle
school recording. A reliable literal Korean closing begins at a measured native
onset, every catalogued numbered probe precedes it, and the greatest original
number observed in the complete catalog is 20. It neither invents a next number
nor uses the source end as an unmeasured closing. An arbitrary earlier number or
an unknown terminal population stays held.

`localizedMappingEvidence` is:

```json
{
  "method": "exact_generation_anchor_native_v2",
  "alignment": {"path": "immutable generation alignment", "sha256": "actual bytes"},
  "prepared": {"path": "immutable prepared grounding", "sha256": "actual bytes"},
  "questionId": "current exact ID",
  "generatedOrdinal": 1,
  "sourceSegmentIds": [36, 37, 38],
  "quotes": [{
    "text": "Complete frozen grounding quote, unchanged.",
    "sourceSegmentIds": [36, 37, 38],
    "startCharacter": 0,
    "endCharacter": 43,
    "probeSegmentIds": [10, 11]
  }]
}
```

The generatedOrdinal comes from the hash-bound original questionId alignment,
never the displayed question index. All sourceSegmentIds must equal the frozen
generation IDs and row anchorSegmentIds exactly. The quote text list must equal
every prepared grounding evidenceQuote, including short supporting quotes. Source
character offsets address the literal space-joined raw source segments in
contiguous array order. Every original anchor must intersect a verified quote.
Single-segment quotes may use sourceSegmentId instead of sourceSegmentIds. Any
generation segment not intersected by a frozen quote requires
`anchorSegments:[{sourceSegmentId,text,probeSegmentIds}]`: its complete unchanged
English source text must be independently heard exactly once in the same native
passage. These extra segments cannot replace missing original supporting quotes.

Quotes use the existing English token normalization only. Each must occur
consecutively once in unchanged reliable selected native segments and once in
the entire frozen generation ASR. Repeated full quotes remain held in this first
version; no nearest occurrence is inferred. Combined quote content has at least
four English tokens. Raw word text must reproduce the selected segment tokens;
word spans must be nonzero, ordered and bounded, with finite valid probability.
Segment uncertainty is recomputed with unchanged old thresholds. Word confidence
does not supply correctness or timestamp authority. Full-ASR uncertainty stays
visible under this separately named native replacement route.

`probeCatalog:{path,sha256}` binds a complete source probe inventory. Its
`rawArtifacts` list contains every immutable used/rejected raw container from
the declared `roots:[{path,pattern}]` or fixed
`roots:[{path,rounds:["round-001"],patterns:["probes/round-001/SOURCE.json"]}]`.
The verifier enumerates actual files and
rejects omitted containers. Patterns cover raw JSON directories or exact
`probes/round-N/SOURCE.json` paths; explicit fixed rounds preserve later replay
while additional rounds run. All same-source source/full/clip/mono/request hashes
replay on CPU. Contradictory sibling numerals, duplicated numerals at distant
onsets, unresolved internal instruction headings and quotes heard in physically
separate passages are hold barriers even when omitted from the selected IDs.
Rejected raw timing failures stay per-probe diagnostics; none supplies authority.
Large localized catalogs replay in batches retaining the original 128-probe and
512MiB native decoder limits; every batch must reproduce identical full PCM and
energy. The old adapter keeps its original bounds.

Certificates retain original generation/raw dialogue evidence and every nested
input reference. All nested hashes are checked again before certificate writing.
Later waves inherit this grade only when the original complete certificate retains
the named adapter, exact scope/onset, questionId/generation mapping, head/neighbor
proof and intact nested references. Merely changing the evidenceGrade cannot
license inheritance.

## Explicit next-END boundary version

`evidenceAdapter:"native-localized-generation-boundary-v3"` and grade
`localized_generation_native_boundary_v3` cover reconstructed candidates with
`nextBoundaryProbeEvidence` and `nextBoundaryNativeEvidence`. Exactly one next
boundary route is allowed. All v2 seek-START, original generation, scope, actual
PCM/cache/energy/quiet/lead and complete catalog rules remain mandatory. Only the
next-END onset-to-number timestamp correspondence is waived: an earlier physical
precursor yields a conservative English passage end and cannot supply a new seek
start. The entire English clip must finish before that physical boundary start.

The next probe's literal original number is reliable FIRST raw speech within two
seconds and is exactly the very next original number. Its complete genuine Korean
instruction must occupy contiguous reliable raw segments before English dialogue
or another heading. Number-only, incomplete clauses, generic commands, bare
answers, wrong language, conflicting numbers and distant repeats stay held. A
number-only shared member is permitted only when the candidate has already
independently proved the complete original shared instruction and that exact next
member belongs to its coverage; producer coverage flags supply no authority.

The certificate retains `nextEndIdentity`, including unchanged raw context,
physical native evidence, actual first-speech timing, correspondence diagnostic,
identity method and `maySupplySeekStart:false`. New ancestry must bind this exact
named proof and all nested references. V2 and the official wrapper retain their
previous correspondence gates. This route was designed after pilot outcomes and
is outcome-informed research, not a preregistered or external-gold result.

## Additive official wrapper

`evidenceAdapter:"official-catalogued-native-v1"` is official-only. It first
replays the complete catalog and then runs the unchanged old native adapter:
own instruction coverage, original PDF-bound ordinal-only identity/chronology,
literal original script sections, and actual first-dialogue opening gates remain
authoritative. An arbitrary unique later script sentence cannot replace them.
It adds independently measured next-number/certified-neighbor boundaries,
contradiction barriers and containment of the entire optional English clip.
The old evidence grades remain unchanged.

After the exact final official original question only,
`officialTerminalEvidence:{method:"exact_official_original_population_end_v1",
prepared:{path,sha256},originalPrepared:{path,sha256},questionFile:{path,sha256},
lastOriginalNumber,sourceFrameCount}` can use the actual full PCM source end or an
additionally measured literal closing. Every current ID/number must equal the
complete native prepared population, original prepared numbers must equal that
complete contiguous population, and all current original question metadata must
bind to the actual question PDF bytes. The claimed last number and source frame
count must match exactly. An observed maximum, omitted original question, changed
paper, missing provenance or reconstructed source cannot supply this boundary.

`evaluate-native.py` decodes all 193 originals on CPU, reproduces the full frozen
PCM clocks, remeasures available historical onsets for all 2727 controls in the
plan's source-separated partitions, and enumerates actual acoustic search events
for the 29 pilot windows. It explicitly reports missing/held control evidence.
These machine-certified starts are regression references, not human gold. Sound
events are search candidates and cannot admit questions or prove first-syllable
recognition. New admitted candidates still require complete queue/order replay.

TypeSafe skill and live confidence/span-selection documentation were read on
2026-10-06. No uncalibrated semantic confidence is used as authority and no new
Jev integration/call is added. Identity, hashes, bounds and policy remain in code;
ambiguous source-value selection remains held. Documentation:
https://docs.typesafe.ai/confidence and
https://docs.typesafe.ai/cookbooks/pre_parsed_value_extraction_cookbook.

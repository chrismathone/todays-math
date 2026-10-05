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

The heading and next numbered heading have a reliable literal ordinal first and
an actual Korean instruction, and their starts are remeasured by the existing
absolute/noise onset policy. The head probe must reproduce the row's exact native
start/onset. The next heading begins at the next original number. The complete
English clip must fit between head start and next heading start. A quote timestamp
alone cannot make a clip crossing a boundary admissible.

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
the declared `roots:[{path,pattern}]`. The verifier enumerates actual files and
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

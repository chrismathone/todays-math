/**
 * Replays a finished ledger against the frozen inputs it names.
 *
 * Nothing in a row is taken on trust: identity comes from the inventory, quoted
 * text from hash-bound files, the start from re-measured native energy, and the
 * proof from re-reading the stored probe. Every disagreement is collected.
 */
import { assertProbeShape, readProbe } from "./evidence.mjs";
import { POLICY } from "./policy.mjs";
import {
  DIALOGUE_PURPOSES,
  START_PURPOSES,
  measureStart,
  proveAtStart,
} from "./resolve.mjs";
import { startGrade } from "./rows.mjs";
import { leadingCue } from "./text.mjs";

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const STATUSES = new Set(["candidate", "held", "existing_verified"]);
const IDENTITY_FIELDS = [
  ["sourceRecordId", (record) => record.sourceRecordId],
  ["setId", (record) => record.setId],
  ["revision", (record) => record.revision],
  ["documentSha256", (record) => record.documentSha256],
  ["questionId", (_, question) => question.id],
  ["sourceNumber", (_, question) => question.sourceNumber],
  ["sourceAudioSha256", (record) => record.sourceAudioSha256],
  ["playbackSha256", (record) => record.audio.sha256],
  ["asrPath", (record) => record.asrPath],
  ["asrSha256", (record) => record.asrSha256],
];

const sharedInstructionFor = (plans, plan) =>
  plan.kind === "shared_instruction_member"
    ? (plans.find(
        (other) =>
          other.kind === "shared_instruction_head" &&
          other.spokenNumbers[1] === plan.sourceNumber,
      )?.officialInstruction ?? null)
    : null;

/**
 * @param marks ledger to replay
 * @param env   { inventorySha256, records, context(record), native(record),
 *                asr(record), probeFile(path) -> { sha256, artifact } }
 * @returns { errors: [{ code, sourceRecordId, sourceNumber, detail }], counts }
 */
export function verifyMarks(marks, env) {
  const errors = [];
  const report = (code, record, question, detail = null) =>
    errors.push({
      code,
      sourceRecordId: record?.sourceRecordId ?? null,
      sourceNumber: question?.sourceNumber ?? null,
      detail,
    });

  if (marks.schemaVersion !== 1) report("unsupported_schema");
  if (marks.evidenceContractVersion !== 1) report("unsupported_contract");
  if (marks.provider !== "claude") report("wrong_provider");
  if (marks.inventorySha256 !== env.inventorySha256) report("wrong_inventory");
  if (!same(marks.policy, POLICY)) report("policy_differs");
  const rows = Array.isArray(marks.records) ? marks.records : [];
  const expected = env.records.flatMap((record) =>
    record.questions.map((question) => ({ record, question })),
  );
  if (rows.length !== expected.length)
    report(
      "row_count_differs",
      null,
      null,
      `${rows.length}/${expected.length}`,
    );

  const counts = { candidate: 0, held: 0, existing_verified: 0 };
  const positions = new Map();
  const caches = new Map();
  const cached = (kind, record, load) => {
    const key = kind + ":" + record.sourceRecordId;
    if (!caches.has(key)) caches.set(key, load(record));
    return caches.get(key);
  };

  expected.forEach(({ record, question }, index) => {
    const row = rows[index];
    if (!row) return report("missing_row", record, question);
    let identityOk = true;
    for (const [field, read] of IDENTITY_FIELDS)
      if (row[field] !== read(record, question)) {
        identityOk = false;
        report("wrong_question_identity", record, question, field);
      }
    if (!identityOk) return;
    if (!STATUSES.has(row.status))
      return report("invalid_status", record, question, row.status);
    counts[row.status]++;
    const durationMs = record.audio.durationMs;

    if (question.audioRange) {
      if (
        row.status !== "existing_verified" ||
        row.seekStartMs !== question.audioRange.startMs ||
        row.seekEndMs !== question.audioRange.endMs
      )
        report("existing_verified_changed", record, question);
      else positions.set(question.id, row.seekStartMs);
      return;
    }
    if (row.status === "existing_verified")
      return report("fabricated_existing_verification", record, question);

    if (row.status === "held") {
      if (row.seekStartMs !== null || row.seekEndMs !== null)
        report("held_row_has_start", record, question);
      if (!Array.isArray(row.reasons) || !row.reasons.length)
        report("held_without_reason", record, question);
      if (row.nativeEvidence !== null || row.probeEvidence !== null)
        report("held_row_has_evidence", record, question);
      if (row.cueNumber !== null)
        report("held_row_has_cue_number", record, question);
      return;
    }

    // Candidate.
    const { plans, sections } = cached("context", record, env.context);
    const plan = plans.find((p) => p.sourceNumber === question.sourceNumber);
    if (
      row.kind !== plan.kind ||
      !same(row.scopeQuestionNumbers, plan.scopeQuestionNumbers) ||
      !same(row.cueSpokenNumbers, plan.spokenNumbers) ||
      row.cueNumber !== plan.spokenNumbers[0]
    )
      report("spoken_scope_differs", record, question);
    const native = cached("native", record, env.native);
    const pcm = native.meta.pcm;
    const n = row.nativeEvidence;
    if (!n) return report("missing_native_evidence", record, question);
    if (
      n.sourceAudioSha256 !== record.sourceAudioSha256 ||
      n.sampleRate !== pcm.sampleRate ||
      n.channels !== pcm.channels ||
      n.frameCount !== pcm.frameCount ||
      n.pcmSha256 !== pcm.sha256 ||
      n.energySha256 !== native.meta.energy.sha256 ||
      n.cacheSha256 !== native.metaSha256
    )
      return report("off_native_clock", record, question);
    const fact = measureStart(native, n.startFrame);
    if (fact.reason) return report(fact.reason, record, question);
    if (
      n.onsetFrame !== fact.onsetFrame ||
      n.cueOnsetFrame !== fact.onsetFrame ||
      n.quietBeforeFrames !== fact.quietBeforeFrames ||
      n.leadPeakDbfs !== fact.leadPeakDbfs
    )
      report("native_measurement_differs", record, question);
    const exactMs = (n.startFrame * 1000) / pcm.sampleRate;
    if (
      !Number.isInteger(row.seekStartMs) ||
      row.seekStartMs !== exactMs ||
      row.seekStartMs < 0 ||
      row.seekStartMs >= durationMs
    )
      return report("seek_start_off_native_clock", record, question);
    if (row.seekEndMs !== durationMs)
      report("continuation_must_end_at_full_original", record, question);

    const items = [];
    const load = (reference, role) => {
      if (!reference) return null;
      let file;
      try {
        file = env.probeFile(reference.path);
      } catch (error) {
        report("probe_file_unreadable", record, question, role);
        return null;
      }
      const artifact = file.artifact;
      if (file.sha256 !== reference.sha256) {
        report("probe_file_changed", record, question, role);
        return null;
      }
      if (
        artifact.sourceRecordId !== record.sourceRecordId ||
        artifact.sourceAudioSha256 !== record.sourceAudioSha256 ||
        artifact.inventorySha256 !== env.inventorySha256 ||
        artifact.nativePcm.sha256 !== pcm.sha256
      ) {
        report("probe_belongs_to_another_original", record, question, role);
        return null;
      }
      const found = artifact.probes.filter((p) => p.id === reference.probeId);
      if (found.length !== 1) {
        report("unknown_probe_id", record, question, role);
        return null;
      }
      const probe = found[0];
      try {
        assertProbeShape(probe, pcm);
      } catch (error) {
        report("malformed_probe", record, question, error.message);
        return null;
      }
      if (
        probe.startFrame !== n.startFrame ||
        !START_PURPOSES.has(probe.purpose)
      ) {
        report("probe_does_not_begin_at_start", record, question, role);
        return null;
      }
      const quoted = probe.segments.filter((segment) =>
        reference.segmentIds?.includes(segment.id),
      );
      if (
        quoted.length !== reference.segmentIds?.length ||
        quoted.map((segment) => segment.text).join(" ") !== reference.text ||
        probe.clipPcmSha256 !== reference.clipPcmSha256 ||
        probe.inputMonoFloat32Sha256 !== reference.inputMonoFloat32Sha256 ||
        probe.frameCount !== reference.frameCount
      ) {
        report("probe_quote_differs", record, question, role);
        return null;
      }
      const language = probe.requestedLanguage ?? artifact.requestedLanguage;
      const item = { probe, reading: readProbe(probe), language, set: null };
      items.push(item);
      return item;
    };
    const cueItem = load(row.probeEvidence, "spoken_number");
    if (!cueItem) return;
    if (
      cueItem.language !== "ko" ||
      DIALOGUE_PURPOSES.has(cueItem.probe.purpose)
    )
      return report("number_probe_is_not_korean", record, question);
    if (
      n.probeOffsetFrame !== cueItem.probe.startFrame ||
      n.probeFrameCount !== cueItem.probe.frameCount ||
      !same(n.cueProbeSegmentIds, row.probeEvidence.segmentIds) ||
      !same(row.probeEvidence.segmentIds, cueItem.reading.certainSegmentIds)
    )
      report("native_probe_binding_differs", record, question);
    const section = sections?.get(plan.sourceNumber) ?? null;
    let dialogueItem = null;
    if (row.dialogueProbeEvidence) {
      dialogueItem = load(row.dialogueProbeEvidence, "first_dialogue");
      if (!dialogueItem) return;
      if (
        dialogueItem.language !== "en" ||
        !DIALOGUE_PURPOSES.has(dialogueItem.probe.purpose)
      )
        report("dialogue_probe_is_not_english", record, question);
    }
    const outcome = proveAtStart(
      plan,
      items,
      sharedInstructionFor(plans, plan),
      section,
    );
    if (!outcome.proof)
      return report(
        outcome.cue ? "first_dialogue_not_proven" : "spoken_number_not_proven",
        record,
        question,
        outcome.judged.flatMap((entry) => entry.verdict.reasons).join("+"),
      );
    if (outcome.proof.cue.item !== cueItem)
      report("number_proof_is_another_probe", record, question);
    const proof = outcome.proof;
    if (dialogueItem && proof.dialogue?.item !== dialogueItem)
      report("first_dialogue_not_proven", record, question);
    if (row.cueForm !== proof.cue.verdict.cueForm)
      report("cue_form_differs", record, question);
    const grade = startGrade(plan, proof);
    if (row.startGrade !== grade)
      report("start_grade_differs", record, question, grade);
    if (
      grade === "ordinal_only" &&
      !row.reasons?.includes("official_text_unavailable")
    )
      report("ordinal_only_without_stated_reason", record, question);

    // Official script quotes are exact text at the stated characters.
    const script = row.scriptEvidence;
    if (Boolean(script) !== Boolean(section))
      report("script_evidence_presence_differs", record, question);
    else if (script) {
      const { transcriptText, transcriptSha256 } = cached(
        "context",
        record,
        env.context,
      );
      const exact = (quote, start) =>
        quote === null
          ? start === null
          : Number.isInteger(start) &&
            transcriptText.slice(start, start + quote.length) === quote;
      const heard = proof.dialogue?.quote ?? null;
      if (
        script.transcriptSha256 !== transcriptSha256 ||
        script.sectionStartCharacter !== section.charStart ||
        script.sectionEndCharacter !== section.charEnd ||
        !exact(script.instructionQuote, script.instructionStartCharacter) ||
        script.instructionQuote !== (section.instruction?.text ?? null) ||
        !exact(script.firstDialogueQuote, script.firstDialogueStartCharacter) ||
        script.firstDialogueQuote !== (heard?.quote ?? null) ||
        !same(script.dialogueProbeSegmentIds, heard?.segmentIds ?? null) ||
        (script.firstDialogueQuote !== null &&
          script.firstDialogueStartCharacter !== section.firstUtterance.start)
      )
        report("script_quote_differs", record, question);
    }

    // Frozen whole-record ASR quotes.
    const asr = cached("asr", record, env.asr);
    const byId = new Map(asr.segments.map((segment) => [segment.id, segment]));
    for (const [idsField, textField] of [
      ["cueSegmentIds", "cueText"],
      ["anchorSegmentIds", "anchorText"],
    ]) {
      const ids = row[idsField];
      if (!Array.isArray(ids) || new Set(ids).size !== ids.length) {
        report("malformed_segment_reference", record, question, idsField);
        continue;
      }
      if (ids.some((id) => !byId.has(id))) {
        report("unknown_segment_id", record, question, idsField);
        continue;
      }
      const text = ids.length
        ? ids.map((id) => byId.get(id).text).join(" ")
        : null;
      if (row[textField] !== text)
        report("full_asr_quote_changed", record, question, textField);
      if (idsField === "cueSegmentIds")
        for (const id of ids) {
          const cue = leadingCue(byId.get(id).text);
          if (!cue || !same(cue.numbers, plan.spokenNumbers))
            report("cue_segment_has_another_number", record, question, id);
        }
    }
    positions.set(question.id, row.seekStartMs);
  });

  // Order inside each original, and one start per shared passage.
  for (const record of env.records) {
    const { plans } = cached("context", record, env.context);
    let previous = null;
    plans.forEach((plan, index) => {
      const question = record.questions[index];
      const ms = positions.get(question.id);
      if (plan.kind === "shared_passage") {
        const mates = plan.scopeQuestionNumbers.map((number) =>
          positions.get(
            record.questions.find((q) => q.sourceNumber === number).id,
          ),
        );
        if (mates.some((value) => value !== mates[0]))
          report("shared_passage_rows_disagree", record, question);
      }
      if (ms === undefined) return;
      const block = plan.blockHead ?? plan.sourceNumber;
      if (previous && previous.block !== block && ms <= previous.ms)
        report("ordinal_order_conflict", record, question);
      if (!previous || previous.block !== block) previous = { block, ms };
    });
  }

  if (marks.counts)
    for (const status of Object.keys(counts))
      if (marks.counts[status] !== counts[status])
        report("stated_count_differs", null, null, status);
  return { errors, counts };
}

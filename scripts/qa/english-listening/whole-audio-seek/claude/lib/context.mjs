/**
 * Official context of one source: question plans with every instruction the
 * frozen inputs can supply, and the official script sections when printed
 * numbering can be followed.
 */
import { officialTranscript } from "./inventory.mjs";
import { questionPlans } from "./questions.mjs";
import { scriptSections } from "./script.mjs";
import { hasHangul } from "./text.mjs";

export function sourceContext(record, liveBySet) {
  const transcript = officialTranscript(record, liveBySet);
  const plans = questionPlans(record);
  const { sections, reason } = scriptSections(
    transcript.text,
    plans,
    plans.map((plan) => plan.ownSentence),
  );
  // An image-only question has no printed sentence in the inventory; the
  // official script prints the same sentence right after its number.
  for (const plan of plans) {
    if (plan.kind !== "single" || plan.officialInstruction || !sections)
      continue;
    const head = sections.get(plan.sourceNumber).headText;
    if (hasHangul(head) && /[.?]$/.test(head)) {
      plan.officialInstruction = head;
      plan.instructionSource = "official_transcript_section_head";
    }
  }
  return {
    plans,
    sections,
    scriptReason: reason,
    transcriptText: transcript.text,
    transcriptSha256: transcript.sha256,
  };
}

/** The shared instruction that must NOT follow a member's own number. */
export const sharedInstructionOf = (plans, plan) =>
  plan.kind === "shared_instruction_member"
    ? (plans.find(
        (other) =>
          other.kind === "shared_instruction_head" &&
          other.spokenNumbers[1] === plan.sourceNumber,
      )?.officialInstruction ?? null)
    : null;

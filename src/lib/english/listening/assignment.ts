/** Server-only domain operation. Persist both snapshots and the audit in one revision-CAS transaction.
 * Existing attempts load their exact assignmentRevision; current account/class/revocation access is
 * checked separately on every request. Never replace the old snapshot with this new revision.
 */
import { z } from "zod";
import { englishListeningAssignmentSchema } from "@/contracts/englishListening.contract";
import { freezeListeningValue } from "./publication";

const additionSchema = z.strictObject({
  expectedRevision: z.number().int().positive(),
  addedStudentIds: z.array(z.uuid()).min(1).max(1000),
  addedBy: z.uuid(),
  addedAt: z.iso.datetime(),
  reason: z.string().trim().min(1).max(1000),
});

export function appendListeningAssignmentTargets(
  input: unknown,
  optionsInput: z.infer<typeof additionSchema>,
) {
  const previous = englishListeningAssignmentSchema.parse(input);
  const options = additionSchema.parse(optionsInput);
  if (previous.revision !== options.expectedRevision)
    throw new Error("Assignment revision conflict");
  if (previous.cancelledAt) throw new Error("Assignment revoked");
  if (
    Date.parse(options.addedAt) < Date.parse(previous.createdAt) ||
    Date.parse(options.addedAt) >= Date.parse(previous.closesAt)
  )
    throw new Error("Invalid addition time");
  if (
    new Set(options.addedStudentIds).size !== options.addedStudentIds.length ||
    options.addedStudentIds.some((id) => previous.targetStudentIds.includes(id))
  )
    throw new Error("Duplicate recipient");
  const assignment = englishListeningAssignmentSchema.parse({
    ...previous,
    revision: previous.revision + 1,
    targetStudentIds: [
      ...previous.targetStudentIds,
      ...options.addedStudentIds,
    ],
  });
  return freezeListeningValue({
    previous,
    assignment,
    audit: {
      assignmentId: assignment.id,
      publicationId: assignment.publicationId,
      previousRevision: previous.revision,
      revision: assignment.revision,
      addedStudentIds: options.addedStudentIds,
      addedBy: options.addedBy,
      addedAt: options.addedAt,
      reason: options.reason,
    },
  });
}

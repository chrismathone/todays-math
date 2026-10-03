/**
 * Offline artifact driver, no model/COM/database calls:
 *   tsx regenerate-exam.ts prepare <exam-dir> <blind-dir-outside-repo>
 *   tsx regenerate-exam.ts verify-pack <exam-dir>
 *   tsx regenerate-exam.ts collect <exam-dir>
 *   tsx load-exam-paper.ts <exam-dir> --regenerate-all [--apply]
 */
import {
  collectRegeneration,
  prepareRegeneration,
  prepareVerificationPack,
  readVerifiedRegeneration,
} from "./regenerateExam";

const [command, examDir, blindDir] = process.argv.slice(2);
if (!examDir)
  throw new Error(
    "usage: prepare <exam-dir> <blind-dir> | verify-pack|collect|check <exam-dir>",
  );
if (command === "prepare") {
  if (!blindDir)
    throw new Error("prepare requires a blind folder outside the repository");
  const manifest = prepareRegeneration(examDir, blindDir);
  console.log(
    `prepared ${manifest.questionNumbers.length} questions; ${manifest.blindDir}`,
  );
} else if (command === "verify-pack") {
  console.log(prepareVerificationPack(examDir));
} else if (command === "collect") {
  const result = collectRegeneration(examDir);
  console.log(
    `regeneration ${result.status}: ${result.questions.filter((q) => q.status === "verified").length}/${result.questions.length} verified`,
  );
  for (const q of result.questions)
    if (q.status !== "verified")
      console.log(`question ${q.n}: ${q.status}; ${q.reason}`);
  if (result.status !== "verified") process.exitCode = 2;
} else if (command === "check") {
  console.log(
    `verified regeneration: ${readVerifiedRegeneration(examDir).size} questions`,
  );
} else {
  throw new Error(`unknown command: ${command}`);
}

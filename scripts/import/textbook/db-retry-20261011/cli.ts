/** Default invocation is an offline plan: no credentials, provider calls or DB client. */
import {
  dbRetryCliUsage,
  parseDbRetryCliOptions,
  runDbRetryCli,
  safeDbRetryReason,
} from "./runner";

async function main(): Promise<void> {
  if (process.argv.slice(2).includes("--help")) {
    console.log(dbRetryCliUsage());
    return;
  }
  const result = await runDbRetryCli(
    parseDbRetryCliOptions(process.argv.slice(2)),
  );
  if (result.failed) process.exitCode = 1;
}
main().catch((error: unknown) => {
  // SDK/Prisma errors may contain credentials, URLs, payloads or image base64. Never log raw exceptions.
  console.error(
    JSON.stringify({ status: "failed", reason: safeDbRetryReason(error) }),
  );
  process.exitCode = 1;
});

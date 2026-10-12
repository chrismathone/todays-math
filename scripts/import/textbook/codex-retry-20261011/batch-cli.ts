import {
  CODEX_GROUPED_USAGE,
  parseCodexGroupedOptions,
  runCodexGroupedBatch,
} from "./batch-runner";

const controller = new AbortController();
const interrupt = () => controller.abort();
process.on("SIGINT", interrupt);
process.on("SIGTERM", interrupt);
async function main() {
  if (process.argv.slice(2).includes("--help")) {
    console.log(CODEX_GROUPED_USAGE);
    return;
  }
  const result = await runCodexGroupedBatch(
    parseCodexGroupedOptions(process.argv.slice(2)),
    { signal: controller.signal },
  );
  process.exitCode = result.failed ? 1 : 0;
}
main()
  .catch((error: unknown) => {
    const message =
      error instanceof Error && /^[a-z][a-z-]{1,100}$/.test(error.message)
        ? error.message
        : "codex-grouped-failed";
    console.error(JSON.stringify({ error: message, dbWrites: 0 }));
    process.exitCode = controller.signal.aborted ? 130 : 1;
  })
  .finally(() => {
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", interrupt);
  });

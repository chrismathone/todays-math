import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const out = process.env.CB_SCAN_QA_OUTPUT ?? "/tmp/cb-scan-ship-20261125";
const server = await createServer({
  configFile: false,
  root,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.join(root, "src"),
      "server-only": fileURLToPath(new URL("server-only.mjs", import.meta.url)),
    },
    preserveSymlinks: true,
  },
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { loadWireSamples } = await server.ssrLoadModule(
    "/src/app/dev/concept-blank-scan-wire/samples.ts",
  );
  const { loadGradeBank } = await server.ssrLoadModule(
    "/src/lib/concept-blank/bank/load.ts",
  );
  const { renderScanPaper, scanPaperPdf } = await server.ssrLoadModule(
    "/src/lib/concept-blank/scan/paper.server.ts",
  );
  const samples = await loadWireSamples();
  const bank = await loadGradeBank("초5");
  await mkdir(out, { recursive: true });
  const evidence = [];
  for (const [i, sample] of samples.entries()) {
    const id = `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
    const built = await renderScanPaper({
      id,
      selection: sample.selection,
      bank,
      origin: "https://today.aywa.co.kr",
    });
    await writeFile(
      path.join(out, `issued-${sample.id}.json`),
      JSON.stringify(built),
    );
    await writeFile(
      path.join(out, `issued-${sample.id}.pdf`),
      await scanPaperPdf(built.artifact),
    );
    const row = {
      sample: sample.id,
      id,
      studentPages: built.snapshot.pageCount,
      keyPages: built.layout.pages.filter((p) => p.part === "key").length,
      baselineStudentPages: sample.qr.student.length,
      baselineKeyPages: sample.qr.key.length,
      slots: built.layout.pages.reduce((n, p) => n + p.slots.length, 0),
      overflow: built.overflow,
      artifactSha256: built.artifactSha256,
    };
    if (
      row.studentPages !== row.baselineStudentPages ||
      row.keyPages !== row.baselineKeyPages
    )
      throw new Error("page count changed");
    evidence.push(row);
    console.log(JSON.stringify(row));
  }
  await writeFile(
    path.join(out, "issued-render-evidence.json"),
    JSON.stringify(evidence, null, 2),
  );
} finally {
  await server.close();
}

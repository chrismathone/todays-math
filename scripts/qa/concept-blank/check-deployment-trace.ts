// Run with node --conditions=react-server --import tsx after a production build.
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { createConceptBlankBankReader } from "../../../src/lib/concept-blank/bank/runtime";

const output = process.argv[2] ?? ".next";
const data = "data/concept-blank";
const manifest = JSON.parse(
  readFileSync(join(data, "manifest.json"), "utf8"),
) as {
  parts: Record<string, string>;
};
const allFiles = [
  "manifest.json",
  ...Object.keys(manifest.parts).map((part) => `${part}.json`),
];
const gradeFiveFiles = ["manifest.json", "e5.json", "e5plus.json"];
const consumers = [
  ["(main)/concept-blank/print/page", allFiles, "grade"],
  ["api/concept-blank/bank/route", allFiles, "grade"],
  ["api/concept-blank/scan/issued/route", allFiles, "grade"],
  ["api/library/documents/[documentId]/route", allFiles, "grade"],
  ["api/admin/users/[id]/documents/[documentId]/route", allFiles, "grade"],
  ["api/learn/fading/route", allFiles, "all"],
  ["api/learn/fading/catalog/route", allFiles, "all"],
  ["api/learn/fading/concepts/[id]/route", allFiles, "all"],
  ["api/learn/fading/daily/route", allFiles, "all"],
  ["api/learn/fading/relearn/route", allFiles, "all"],
  ["api/math-srs/fading/route", allFiles, "all"],
  ["api/math-srs/fading/preview/route", allFiles, "all"],
  ["api/students/[id]/math-srs/fading/route", allFiles, "all"],
  ["api/math-ontology/assist/route", allFiles, "all"],
  ["api/textbook/concepts/catalog/route", allFiles, "all"],
  ["api/textbook/quick-create/route", allFiles, "grade"],
  ["api/textbook/editions/[editionId]/concepts/route", allFiles, "grade"],
  [
    "api/textbook/editions/[editionId]/concepts/[conceptKey]/route",
    allFiles,
    "grade",
  ],
  [
    "api/textbook/editions/[editionId]/concepts/[conceptKey]/blank/route",
    allFiles,
    "grade",
  ],
  [
    "api/textbook/editions/[editionId]/sections/[sectionId]/preview/route",
    allFiles,
    "grade",
  ],
  [
    "api/textbook/editions/[editionId]/publish/preflight/route",
    allFiles,
    "grade",
  ],
  [
    "api/textbook/editions/[editionId]/publish/reserve/route",
    allFiles,
    "grade",
  ],
  ["dev/fading/page", allFiles, "all"],
  ["dev/fading-teacher-hifi/page", allFiles, "all"],
  ["dev/fading-teacher-wire/page", allFiles, "all"],
  ["dev/explorer-srs/page", allFiles, "all"],
  ["dev/concept-blank-scan-hifi/page", gradeFiveFiles, "grade"],
  ["dev/concept-blank-scan-wire/page", gradeFiveFiles, "grade"],
] as const;

const omitted = process.argv[3];
const app = join(output, "server/app");
const expectedTraces = new Set<string>(
  consumers.map(([consumer]) => `${consumer}.js.nft.json`),
);
for (const file of readdirSync(app, { recursive: true, encoding: "utf8" })) {
  if (!file.endsWith(".js.nft.json")) continue;
  const { files } = JSON.parse(readFileSync(join(app, file), "utf8")) as {
    files: string[];
  };
  const paths = files.map((path) => path.replaceAll("\\", "/"));
  if (paths.some((path) => path.includes("/bank/assessments/")))
    throw new Error(`Authored assessment JSON traced by ${file}`);
  if (
    paths.some((path) => path.includes("/data/concept-blank/")) &&
    !expectedTraces.has(file.split(sep).join("/"))
  )
    throw new Error(`Unrelated route traces the concept blank bank: ${file}`);
}
for (const [consumer, expected, scope] of consumers) {
  const trace = join(app, `${consumer}.js.nft.json`);
  const { files } = JSON.parse(readFileSync(trace, "utf8")) as {
    files: string[];
  };
  const traced = [
    ...new Set(
      files
        .map((file) => resolve(dirname(trace), file))
        .filter((file) => dirname(file) === resolve(data)),
    ),
  ];
  const actual = traced.map((file) => basename(file)).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected.slice().sort()))
    throw new Error(`${consumer}: unexpected bank trace: ${actual.join(", ")}`);

  const isolated = mkdtempSync(join(tmpdir(), "concept-blank-trace-"));
  try {
    const directory = join(isolated, data);
    mkdirSync(directory, { recursive: true });
    for (const file of traced) {
      if (omitted !== `${consumer}:${basename(file)}`)
        cpSync(file, join(directory, basename(file)));
    }
    const bank = createConceptBlankBankReader(directory);
    const size =
      scope === "grade"
        ? bank.getGrade("초5").concepts.length
        : bank.getBank().concepts.length;
    if (size === 0) throw new Error("Empty concept blank bank");
  } catch (error) {
    throw new Error(`Bank smoke failed for ${consumer}`, { cause: error });
  } finally {
    rmSync(isolated, { recursive: true, force: true });
  }
}
console.log(
  `Concept blank bank trace smoke passed for ${consumers.length} consumers`,
);

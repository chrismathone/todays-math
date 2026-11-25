// @vitest-environment node
import { afterAll, beforeAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { openScanTestDb } from "../helpers/conceptBlankScanDb";
import { seedWorld } from "../helpers/textbookPglite";
import { scanWorld } from "../helpers/conceptBlankScanFixture";
import {
  matchWrittenScanName,
  scanNameCandidates,
  saveScanWrittenName,
  changeScanStudent,
} from "@/lib/concept-blank/scan/name";
import {
  readScanPageWithName,
  normalizeWrittenScanName,
} from "@/lib/concept-blank/scan/read";
import {
  beginScanSubmission,
  getScanSubmission,
} from "@/lib/concept-blank/scan/submission";
let local: Awaited<ReturnType<typeof openScanTestDb>>,
  world: Awaited<ReturnType<typeof scanWorld>>;
beforeAll(async () => {
  local = await openScanTestDb();
  world = await scanWorld(local);
}, 60_000);
afterAll(async () => {
  await local?.pg.close();
});
const name = (text: string, status = "read") =>
  normalizeWrittenScanName(JSON.stringify({ written_name: { text, status } }));
it("matches exactly one normalized name, never a similar name, and never chooses on uncertainty", () => {
  const students = [
    { id: "a", name: "홍길동" },
    { id: "b", name: "홍길돈" },
  ];
  expect(
    matchWrittenScanName(name("  홍 길동 ".normalize("NFD")), students),
  ).toMatchObject({ result: "matched", studentId: "a", candidateIds: ["a"] });
  expect(
    matchWrittenScanName(name("홍길동"), [
      ...students,
      { id: "c", name: "홍길동" },
    ]),
  ).toMatchObject({ result: "ambiguous", studentId: null });
  expect(matchWrittenScanName(name("홍길똥"), students)).toMatchObject({
    result: "none",
    studentId: null,
    candidateIds: [],
  });
  expect(
    matchWrittenScanName(name("홍길동", "uncertain"), students),
  ).toMatchObject({ result: "none", studentId: null, candidateIds: ["a"] });
  expect(
    matchWrittenScanName(name("", "blank"), students).studentId,
  ).toBeNull();
  expect(
    normalizeWrittenScanName('{"written_name":{"status":"read","text":""}}'),
  ).toEqual({ status: "unreadable", text: "" });
});
it("extracts the page-one name separately; later pages cannot supply identity", async () => {
  const page = world.snapshot.pages[0];
  const model = async (r: { prompt: string }) => {
    expect(r.prompt).toContain("written_name");
    expect(r.prompt).not.toContain("이름·학생 신원은 읽지 마세요");
    return JSON.stringify({
      written_name: { status: "read", text: "홍길동" },
      slots: [],
    });
  };
  const result = await readScanPageWithName(
    { page, imageDataUrl: "data:image/png;base64,YQ==" },
    model,
  );
  expect(result.writtenName).toEqual({ status: "read", text: "홍길동" });
  expect(
    (
      await readScanPageWithName(
        {
          page: { ...page, number: 2 },
          imageDataUrl: "data:image/png;base64,YQ==",
        },
        model,
      )
    ).writtenName,
  ).toBeNull();
});
it("searches the whole authorized roster, excludes other owners/branches, and retains student account ownership on mismatch", async () => {
  await local.db.query("UPDATE student SET name=$2::text WHERE id=$1::uuid", [
    world.studentA,
    "홍길동",
  ]);
  const other = await seedWorld(local.pg);
  await local.db.query("UPDATE student SET name=$2::text WHERE id=$1::uuid", [
    other.studentA,
    "홍길동",
  ]);
  const candidates = await scanNameCandidates(
    world.teacher,
    world.issued.id,
    local.db,
  );
  expect(candidates.map((s) => s.id)).toContain(world.studentA);
  expect(candidates.map((s) => s.id)).not.toContain(other.studentA);
  const { id } = await beginScanSubmission(
    world.student,
    { printedSheetId: world.issued.id, requestId: randomUUID() },
    local.db,
  );
  await local.db.transaction((tx) =>
    saveScanWrittenName(world.student, id, name("김다른"), tx),
  );
  const view = await getScanSubmission(world.teacher, id, local.db);
  expect(view.student.id).toBe(world.studentA);
  expect(view.writtenName).toMatchObject({
    text: "김다른",
    result: "mismatch",
    method: "student-account",
  });
  await expect(
    changeScanStudent(
      world.teacher,
      id,
      { studentId: other.studentA, revision: view.revision },
      local.db,
    ),
  ).rejects.toThrow();
});

it("does not decide uniqueness from the first fifty picker rows", async () => {
  for (let i = 0; i < 51; i++)
    await local.db.query(
      `INSERT INTO student(id,class_id,name,updated_at) VALUES($1::uuid,$2::uuid,$3::text,CURRENT_TIMESTAMP)`,
      [randomUUID(), world.classA, i === 50 ? "홍길동" : `가학생${i}`],
    );
  const all = await scanNameCandidates(
    world.teacher,
    world.issued.id,
    local.db,
  );
  expect(all.length).toBeGreaterThan(50);
  expect(matchWrittenScanName(name("홍길동"), all).result).toBe("ambiguous");
});

import { randomUUID } from "node:crypto";
import { seedWorld } from "./textbookPglite";
import type { openScanTestDb } from "./conceptBlankScanDb";
import { createScanSnapshot } from "@/lib/concept-blank/scan/snapshot";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";
import { issueScanPaper } from "@/lib/concept-blank/scan/issuance";
import type { ScanIssuedLayout } from "@/contracts/conceptBlankScanIssued.contract";
import type { ConceptBlankForm } from "@/contracts/conceptBlank.contract";

/** Small real-bank issue for persistence tests. The renderer is tested separately against PDFs. */
export async function scanWorld(
  local: Awaited<ReturnType<typeof openScanTestDb>>,
  forms: ConceptBlankForm[] = ["term"],
) {
  const world = await seedWorld(local.pg);
  await local.db.query(
    `UPDATE "user" SET approval_status='approved',branch_id=$1::uuid,branch_role='teacher' WHERE id IN ($2::uuid,$3::uuid)`,
    [world.branchId, world.userA, world.userB],
  );
  await local.db.query(
    `UPDATE "class" SET branch_id=$1::uuid WHERE id=$2::uuid`,
    [world.branchId, world.classA],
  );
  const selection = {
    sections: [FIXTURE_BANK.concepts[0].section],
    forms: forms.map((form) => ({
      form,
      counts: { 하: 2, 중: 1, 상: 1 },
      extras: { 하: 0, 중: 0, 상: 0 },
    })),
  };
  const snapshot = createScanSnapshot(selection, FIXTURE_BANK);
  const layout: ScanIssuedLayout = {
    version: 1,
    pages: snapshot.pages.map((p) => ({
      part: "student",
      number: p.number,
      width: 210,
      height: 297,
      markers: [
        { id: "tl", x: 6.5, y: 6.5 },
        { id: "tr", x: 203.5, y: 6.5 },
        { id: "br", x: 203.5, y: 290.5 },
        { id: "bl", x: 6.5, y: 290.5 },
      ],
      qr: { x: 175, y: 10, width: 20, height: 20 },
      slots: p.slots.map((s, i) => ({
        slotId: s.id,
        box: { x: 20, y: 50 + i * 25, width: 160, height: 20 },
      })),
    })),
  };
  const teacher = { kind: "teacher" as const, id: world.userA },
    student = { kind: "student" as const, id: world.studentA };
  const issued = await issueScanPaper(
    teacher,
    { requestId: randomUUID(), selection },
    {
      db: local.db,
      render: async () => ({
        snapshot,
        layout,
        artifact: {
          version: 1,
          css: "section { color: black; }",
          pages: snapshot.pages.map((p) => ({
            part: "student",
            number: p.number,
            html: "<section>blank</section>",
          })),
        },
      }),
    },
  );
  return { ...world, teacher, student, issued, snapshot, layout };
}

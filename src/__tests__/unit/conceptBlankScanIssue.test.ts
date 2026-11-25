// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { openScanTestDb } from "../helpers/conceptBlankScanDb";
import { seedWorld } from "../helpers/textbookPglite";
import {
  issueScanPaper,
  readIssuedScanPaper,
  scanSubmissionAccess,
} from "@/lib/concept-blank/scan/issuance";
import { createScanSnapshot } from "@/lib/concept-blank/scan/snapshot";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";
import type { ScanIssuedLayout } from "@/contracts/conceptBlankScanIssued.contract";

let local: Awaited<ReturnType<typeof openScanTestDb>>;
let world: Awaited<ReturnType<typeof seedWorld>>;
const selection = {
  sections: [FIXTURE_BANK.concepts[0].section],
  forms: [
    {
      form: "term" as const,
      counts: { 하: 2, 중: 1, 상: 1 },
      extras: { 하: 0, 중: 0, 상: 0 },
    },
  ],
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
layout.pages.push({ ...layout.pages[0], part: "key", slots: [] });
const rendered = {
  snapshot,
  layout,
  artifact: {
    version: 1 as const,
    css: "frozen-css",
    pages: [
      {
        part: "student" as const,
        number: 1,
        html: "<section>frozen blank</section>",
      },
      {
        part: "key" as const,
        number: 1,
        html: "<section>private answer key</section>",
      },
    ],
  },
  artifactSha256: "a".repeat(64),
  overflow: [0],
};
beforeAll(async () => {
  local = await openScanTestDb();
  world = await seedWorld(local.pg);
  await local.db.query(
    `UPDATE "user" SET approval_status='approved',branch_id=$1::uuid,branch_role='teacher' WHERE id IN ($2::uuid,$3::uuid)`,
    [world.branchId, world.userA, world.userB],
  );
  await local.db.query(
    `UPDATE "class" SET branch_id=$1::uuid WHERE id=$2::uuid`,
    [world.branchId, world.classA],
  );
}, 60_000);
afterAll(async () => {
  await local?.pg.close();
});

describe("issued paper identity and current ownerScope", () => {
  it("issues once per request and reprints the frozen artifact without rendering again", async () => {
    const render = vi.fn().mockResolvedValue(rendered);
    const deps = { db: local.db, render };
    const actor = { kind: "teacher" as const, id: world.userA };
    const requestId = randomUUID();
    const first = await issueScanPaper(actor, { requestId, selection }, deps);
    const again = await issueScanPaper(actor, { requestId, selection }, deps);
    expect(first.id).toBe(again.id);
    const freshClick = await issueScanPaper(
      actor,
      { requestId: randomUUID(), selection },
      deps,
    );
    expect(freshClick.id).toBe(first.id);
    expect(render).toHaveBeenCalledTimes(1);
    expect(
      await readIssuedScanPaper(actor, first.id, "key", local.db),
    ).toContain("private answer key");
    await expect(
      issueScanPaper(
        actor,
        { requestId, selection: { ...selection, title: "changed" } },
        deps,
      ),
    ).rejects.toThrow(/다른 고르기/);
  });

  it("concurrent first clicks keep exactly one publication row after both renderers finish", async () => {
    const before = await local.db.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM concept_blank_printed_sheet`,
    );
    let done!: () => void;
    const barrier = new Promise<void>((resolve) => {
      done = resolve;
    });
    let calls = 0;
    const deps = {
      db: local.db,
      publicationEdition: "concurrent-edition",
      render: async () => {
        if (++calls === 2) done();
        await barrier;
        return rendered;
      },
    };
    const [a, b] = await Promise.all(
      [1, 2].map(() =>
        issueScanPaper(
          { kind: "teacher", id: world.userA },
          { requestId: randomUUID(), selection },
          deps,
        ),
      ),
    );
    expect(a.id).toBe(b.id);
    const after = await local.db.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM concept_blank_printed_sheet`,
    );
    expect(Number(after[0].count)).toBe(Number(before[0].count) + 1);
    expect(calls).toBe(2);
  });

  it("permits the issuing teacher's current student only, never any student holding a QR", async () => {
    const { id } = await issueScanPaper(
      { kind: "teacher", id: world.userA },
      { requestId: randomUUID(), selection },
      { db: local.db, render: async () => rendered },
    );
    const allowed = await scanSubmissionAccess(
      { kind: "student", id: world.studentA },
      id,
      world.studentA,
      local.db,
    );
    expect(allowed.student.id).toBe(world.studentA);
    await expect(
      readIssuedScanPaper(
        { kind: "student", id: world.studentA },
        id,
        "key",
        local.db,
      ),
    ).rejects.toThrow(/채점표/);
    await expect(
      scanSubmissionAccess(
        { kind: "teacher", id: world.userB },
        id,
        world.studentA,
        local.db,
      ),
    ).rejects.toThrow(/권한/);
    const other = await seedWorld(local.pg);
    await expect(
      scanSubmissionAccess(
        { kind: "student", id: other.studentA },
        id,
        other.studentA,
        local.db,
      ),
    ).rejects.toThrow(/권한/);
    await expect(
      scanSubmissionAccess(
        { kind: "student", id: world.studentA },
        id,
        other.studentA,
        local.db,
      ),
    ).rejects.toThrow(/본인/);
    await local.db.query(
      `UPDATE "class" SET user_id=$2::uuid WHERE id=$1::uuid`,
      [world.classA, world.userB],
    );
    await expect(
      scanSubmissionAccess(
        { kind: "student", id: world.studentA },
        id,
        world.studentA,
        local.db,
      ),
    ).rejects.toThrow(/권한/);
    await local.db.query(
      `UPDATE "class" SET user_id=$2::uuid WHERE id=$1::uuid`,
      [world.classA, world.userA],
    );
  });

  it("uses the existing menu and does not broaden a NULL branch or a moved issuer", async () => {
    const actor = { kind: "teacher" as const, id: world.userA };
    const { id } = await issueScanPaper(
      actor,
      { requestId: randomUUID(), selection },
      { db: local.db, render: async () => rendered },
    );
    await local.db.query(
      `UPDATE "user" SET disabled_menus=ARRAY['conceptBlank'] WHERE id=$1::uuid`,
      [world.userA],
    );
    await expect(
      scanSubmissionAccess(
        { kind: "student", id: world.studentA },
        id,
        world.studentA,
        local.db,
      ),
    ).rejects.toThrow(/메뉴/);
    await local.db.query(
      `UPDATE "user" SET disabled_menus=ARRAY[]::text[],branch_id=NULL WHERE id=$1::uuid`,
      [world.userA],
    );
    await expect(
      scanSubmissionAccess(
        { kind: "student", id: world.studentA },
        id,
        world.studentA,
        local.db,
      ),
    ).rejects.toThrow(/권한/);
    await local.db.query(
      `UPDATE "user" SET branch_id=$2::uuid WHERE id=$1::uuid`,
      [world.userA, world.branchId],
    );
  });

  it("does not save an issue on renderer failure or accept missing/foreign coordinates", async () => {
    const before = await local.db.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM concept_blank_printed_sheet`,
    );
    const actor = { kind: "teacher" as const, id: world.userA };
    await expect(
      issueScanPaper(
        actor,
        { requestId: randomUUID(), selection },
        {
          db: local.db,
          publicationEdition: "failure",
          render: async () => {
            throw new Error("font unavailable");
          },
        },
      ),
    ).rejects.toThrow("font unavailable");
    const bad = structuredClone(rendered);
    bad.layout.pages[0].slots[0].slotId = "foreign";
    await expect(
      issueScanPaper(
        actor,
        { requestId: randomUUID(), selection },
        {
          db: local.db,
          publicationEdition: "bad-layout",
          render: async () => bad,
        },
      ),
    ).rejects.toThrow(/칸/);
    expect(
      await local.db.query(
        `SELECT count(*)::text AS count FROM concept_blank_printed_sheet`,
      ),
    ).toEqual(before);
  });
});

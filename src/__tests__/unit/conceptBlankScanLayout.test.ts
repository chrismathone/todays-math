// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  scanIssuedLayoutSchema,
  scanQrSchema,
} from "@/contracts/conceptBlankScanIssued.contract";
import {
  matchScanLayout,
  scanQrUrl,
  parseScanQr,
} from "@/lib/concept-blank/scan/layout";
import { createScanSnapshot } from "@/lib/concept-blank/scan/snapshot";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";

const issue = "d43f6889-c6ad-4bf7-81bd-8e798d373a76";
const markers = [
  { id: "tl", x: 6.5, y: 6.5 },
  { id: "tr", x: 203.5, y: 6.5 },
  { id: "br", x: 203.5, y: 290.5 },
  { id: "bl", x: 6.5, y: 290.5 },
];
const page = {
  part: "student",
  number: 1,
  width: 210,
  height: 297,
  markers,
  qr: { x: 176.77, y: 9.5, width: 20, height: 20 },
  slots: [
    { slotId: "p1.q1.answer", box: { x: 20, y: 50, width: 160, height: 20 } },
  ],
};
describe("issued layout and QR contract", () => {
  it("requires exactly four ordered, distinct corner markers and bounded positive answer rectangles", () => {
    expect(
      scanIssuedLayoutSchema.safeParse({ version: 1, pages: [page] }).success,
    ).toBe(true);
    for (const bad of [
      { ...page, markers: markers.slice(0, 3) },
      { ...page, markers: markers.map(() => markers[0]) },
      { ...page, slots: [...page.slots, ...page.slots] },
      {
        ...page,
        slots: [{ slotId: "x", box: { x: 200, y: 50, width: 40, height: 10 } }],
      },
      {
        ...page,
        slots: [{ slotId: "x", box: { x: 10, y: 50, width: 0, height: 10 } }],
      },
    ])
      expect(
        scanIssuedLayoutSchema.safeParse({ version: 1, pages: [bad] }).success,
      ).toBe(false);
  });

  it("refuses missing, reordered and foreign slot mappings before the issue can be saved", () => {
    const snapshot = createScanSnapshot(
      {
        sections: [FIXTURE_BANK.concepts[0].section],
        forms: [
          {
            form: "term",
            counts: { 하: 2, 중: 1, 상: 1 },
            extras: { 하: 0, 중: 0, 상: 0 },
          },
        ],
      },
      FIXTURE_BANK,
    );
    const layout = scanIssuedLayoutSchema.parse({
      version: 1,
      pages: snapshot.pages.map((p) => ({
        ...page,
        number: p.number,
        slots: p.slots.map((slot, i) => ({
          slotId: slot.id,
          box: { x: 20, y: 50 + i * 25, width: 160, height: 20 },
        })),
      })),
    });
    expect(() => matchScanLayout(snapshot, layout)).not.toThrow();
    const missing = structuredClone(layout);
    missing.pages[0].slots.pop();
    expect(() => matchScanLayout(snapshot, missing)).toThrow(/칸/);
    const foreign = structuredClone(layout);
    foreign.pages[0].slots[0].slotId = "p99.q1.answer";
    expect(() => matchScanLayout(snapshot, foreign)).toThrow(/칸/);
  });

  it("uses opaque identity, page and part; rejects foreign hosts, duplicate fields, credentials and legacy codes", () => {
    const origin = "https://today.aywa.co.kr";
    const url = scanQrUrl(origin, {
      printedSheetId: issue,
      page: 2,
      part: "key",
    });
    expect(url).toBe(`${origin}/concept-blank/scan?p=${issue}&page=2&part=key`);
    expect(parseScanQr(url, origin)).toEqual({
      printedSheetId: issue,
      page: 2,
      part: "key",
    });
    for (const bad of [
      url.replace("today.aywa.co.kr", "evil.example"),
      `${url}&part=student`,
      `${url}&answer=secret`,
      url.replace("https://", "https://name:secret@"),
      url.replace("page=2", "page=0"),
      `${origin}/concept-blank/scan?code=OLD&page=1&part=student`,
    ])
      expect(() => parseScanQr(bad, origin)).toThrow();
    expect(
      scanQrSchema.safeParse({
        printedSheetId: issue,
        page: 1,
        part: "student",
        studentId: "user-input",
      }).success,
    ).toBe(false);
  });
});

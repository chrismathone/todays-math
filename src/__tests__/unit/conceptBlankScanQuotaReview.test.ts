// @vitest-environment node
import { afterAll, beforeAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { openScanTestDb } from "../helpers/conceptBlankScanDb";
import { createDatabaseScanUsageStore } from "@/lib/concept-blank/scan/usageDatabase";
import { ScanQueuedError } from "@/lib/concept-blank/scan/usage";
import { scanConfig, scanReservation } from "@/lib/concept-blank/scan/model";
import { readScanPage } from "@/lib/concept-blank/scan/read";
import { createScanSnapshot } from "@/lib/concept-blank/scan/snapshot";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";
import { maintainScanUsage } from "@/lib/concept-blank/scan/usageMaintenance";

let local: Awaited<ReturnType<typeof openScanTestDb>>;
beforeAll(async () => {
  local = await openScanTestDb();
}, 60_000);
afterAll(async () => {
  await local?.pg.close();
});
const reservation = (amount: number, key = randomUUID()) => ({
  requestKey: key,
  resultKey: key,
  operation: "read" as const,
  model: "claude-opus-5-5" as const,
  promptVersion: "review",
  reservedNanoUsd: amount,
});

it("admits four globally, persists the fifth in FIFO order and resumes it after settlement", async () => {
  const store = createDatabaseScanUsageStore(local.db);
  const leases = await Promise.all(
    Array.from({ length: 4 }, () =>
      store.begin("2035-01", 1000, reservation(100), 4),
    ),
  );
  const fifth = reservation(100),
    sixth = reservation(100);
  await expect(store.begin("2035-01", 1000, fifth, 4)).rejects.toBeInstanceOf(
    ScanQueuedError,
  );
  // The concurrency ceiling also spans a UTC month rollover.
  await expect(store.begin("2035-02", 1000, sixth, 4)).rejects.toBeInstanceOf(
    ScanQueuedError,
  );
  expect(await store.inspect("2035-01")).toMatchObject({
    spentNanoUsd: 0,
    reservedNanoUsd: 500,
    activeCalls: 4,
    queuedCalls: 1,
  });
  await store.settle(leases[0], 20);
  await expect(store.begin("2035-02", 1000, sixth, 4)).rejects.toBeInstanceOf(
    ScanQueuedError,
  );
  const next = await store.begin("2035-01", 1000, fifth, 4);
  await expect(store.begin("2035-01", 1000, fifth, 4)).rejects.toThrow(/이미/);
  for (const lease of [...leases.slice(1), next]) await store.settle(lease, 0);
  await store.settle(await store.begin("2035-02", 1000, sixth, 4), 0);
});

it("atomically admits only one of two reservations at the month boundary", async () => {
  const a = createDatabaseScanUsageStore(local.db),
    b = createDatabaseScanUsageStore(local.db);
  const settled = await a.begin("2035-03", 100, reservation(60), 4);
  await a.settle(settled, 60);
  const outcomes = await Promise.allSettled([
    a.begin("2035-03", 100, reservation(30), 4),
    b.begin("2035-03", 100, reservation(30), 4),
  ]);
  expect(outcomes.filter((x) => x.status === "fulfilled")).toHaveLength(1);
  expect(await a.inspect("2035-03")).toMatchObject({
    spentNanoUsd: 60,
    reservedNanoUsd: 30,
  });
  for (const x of outcomes)
    if (x.status === "fulfilled") await a.settle(x.value, 30);
});

it("finalizes unknown usage at its whole bound, preserves evidence and permits the next request", async () => {
  const store = createDatabaseScanUsageStore(local.db),
    r = reservation(80);
  const lease = await store.begin("2035-04", 100, r, 4);
  await store.settle(lease, null, {
    usage: [],
    output: "not a trustworthy completion",
  });
  expect(await store.inspect("2035-04")).toMatchObject({
    spentNanoUsd: 80,
    reservedNanoUsd: 0,
    activeCalls: 0,
    unresolved: false,
  });
  const [call] = await local.db.query(
    "SELECT status,cost_nano_usd,settlement_reason,result_text FROM concept_blank_scan_usage_call WHERE id=$1",
    [lease.token],
  );
  expect(call).toMatchObject({
    status: "settled",
    cost_nano_usd: 80,
    settlement_reason: "usage-unknown",
    result_text: null,
  });
  await expect(store.begin("2035-04", 100, r, 4)).rejects.toThrow(/이미/);
  expect(await store.findResult(r.resultKey)).toBeNull();
  await store.settle(await store.begin("2035-04", 100, reservation(20), 4), 5);
  await expect(store.settle(lease, null)).rejects.toThrow(/정산/);
});

it("bounds the bytes and actual uploaded pixels above the measured ~5k input while reserving far less than $4.32", async () => {
  const bytes = await sharp({
    create: { width: 1786, height: 2526, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
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
  let captured!: { prompt: string; imageDataUrl?: string };
  await readScanPage(
    {
      page: snapshot.pages[0],
      imageDataUrl: `data:image/png;base64,${bytes.toString("base64")}`,
    },
    async (request) => {
      captured = request;
      return '{"slots":[]}';
    },
  );
  const bound = await scanReservation("claude-opus-5-5", captured);
  expect(bound.imageTokens).toBe(Math.ceil(1786 / 28) * Math.ceil(2526 / 28));
  expect(bound.textBytes).toBe(Buffer.byteLength(captured.prompt, "utf8"));
  // cb-scan-read.md: Opus high whole-page 2526, input 2 + cache read 5072.5.
  expect(bound.inputTokens).toBeGreaterThan(5074.5);
  expect(bound.outputTokens).toBe(16_000);
  expect(bound.reservedNanoUsd).toBeLessThan(432_000_000); // < 1/10 of the old $4.32
  await expect(
    scanReservation("claude-opus-5-5", {
      prompt: "x",
      imageDataUrl: "data:image/png;base64,AAAA",
    }),
  ).rejects.toThrow();
  expect(scanConfig({}).maxConcurrent).toBe(4);
  for (const value of ["0", "-1", "1.5", "NaN", ""])
    expect(() =>
      scanConfig({ CONCEPT_BLANK_SCAN_MAX_CONCURRENT: value }),
    ).toThrow();
});

it("settles a lost worker at its full bound once, frees its slot and rejects late settlement", async () => {
  const store = createDatabaseScanUsageStore(local.db, {
    now: () => new Date("2035-05-01T00:00:00Z"),
  });
  const lease = await store.begin("2035-05", 100, reservation(80));
  await maintainScanUsage(local.db, new Date("2035-05-01T00:05:59Z"));
  expect(await store.inspect("2035-05")).toMatchObject({
    activeCalls: 1,
    reservedNanoUsd: 80,
  });
  await maintainScanUsage(local.db, new Date("2035-05-01T00:06:00Z"));
  await maintainScanUsage(local.db, new Date("2035-05-01T00:07:00Z"));
  expect(await store.inspect("2035-05")).toMatchObject({
    spentNanoUsd: 80,
    reservedNanoUsd: 0,
    activeCalls: 0,
  });
  await expect(store.settle(lease, 0)).rejects.toThrow(/정산/);
  const next = await store.begin("2035-05", 100, reservation(20));
  await store.settle(next, 0);
});

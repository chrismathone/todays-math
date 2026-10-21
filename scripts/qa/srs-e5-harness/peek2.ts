import { chromium } from "@playwright/test";
const base = "http://localhost:4321";
async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9333");
  const cookies = (await browser.contexts()[0].cookies(base))
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const r = await fetch(`${base}/api/learn/math-explorers`, {
    headers: { cookie: cookies },
  });
  const d = (await r.json()).data;
  console.log(
    "today",
    d.today,
    "cookie clock",
    (await browser.contexts()[0].cookies(base)).find(
      (c) => c.name === "learn-test-clock",
    )?.value,
  );
  console.log(
    "completedDays",
    JSON.stringify(
      d.completedDays.map(
        (x: { date: string; route?: string; unitId: string }) => [
          x.date,
          x.route,
          x.unitId,
        ],
      ),
    ),
  );
  console.log(
    "history",
    JSON.stringify(
      d.history.map(
        (h: { date: string; route?: string; unresolved: number }) => [
          h.date,
          h.route,
          h.unresolved,
        ],
      ),
    ),
  );
  const m = d.expedition?.mission;
  console.log(
    "mission",
    JSON.stringify(
      m && {
        date: m.date,
        kind: m.kind,
        route: m.route,
        status: m.status,
        completedAt: m.completedAt,
      },
    ),
  );
  console.log(
    "expedition keys",
    Object.keys(d.expedition ?? {}).join(","),
    "canStart",
    d.expedition?.canStart,
    "next",
    JSON.stringify(d.expedition?.next ?? d.expedition?.today ?? null).slice(
      0,
      300,
    ),
  );
  await browser.close().catch(() => {});
}
main();

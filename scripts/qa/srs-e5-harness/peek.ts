// 띄워 둔 크로뮴(9333)의 쿠키로 학생 API 를 읽기만 한다. npx tsx .qa-artifacts/srs-e5/peek.ts
import { chromium } from "@playwright/test";

const base = "http://localhost:4321";
async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9333");
  const cookies = (await browser.contexts()[0].cookies(base))
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const headers = {
    cookie: cookies,
    "x-explorer-follow-up": "1",
    "x-course-follow-up": "1",
  };
  const get = async (path: string) => {
    const r = await fetch(`${base}${path}`, { headers });
    const text = await r.text();
    try {
      return { status: r.status, body: JSON.parse(text) };
    } catch {
      return { status: r.status, body: text.slice(0, 300) };
    }
  };
  const ex = await get("/api/learn/math-explorers");
  const e = ex.body?.data;
  console.log(
    "explorers",
    ex.status,
    JSON.stringify({
      today: e?.today,
      canStart: e?.expedition?.canStart,
      plan: e?.expedition?.plan && {
        kind: e.expedition.plan.kind,
        route: e.expedition.plan.route,
        title: e.expedition.plan.title,
      },
      mission: e?.expedition?.mission && {
        kind: e.expedition.mission.kind,
        status: e.expedition.mission.status,
        answered: e.expedition.mission.answered,
      },
      blocked: e?.expedition?.blocked ?? e?.expedition?.reason ?? null,
    }),
  );
  for (const path of [
    "/api/learn/fading/daily",
    "/api/learn/fading/daily-plan",
    "/api/learn/fading/plan",
  ]) {
    const r = await get(path);
    if (r.status === 404) continue;
    const d = r.body?.data;
    console.log(
      path,
      r.status,
      JSON.stringify(
        d
          ? {
              status: d.status,
              next: d.next,
              integration: d.integration,
              activities: d.activities?.map(
                (a: {
                  kind: string;
                  key: string;
                  state: string;
                  start: string;
                  reason?: { code?: string; text?: string };
                }) => [
                  a.kind,
                  a.key,
                  a.state,
                  a.start,
                  a.reason?.code ?? a.reason?.text,
                ],
              ),
              shortfall: d.shortfall,
            }
          : r.body,
      ).slice(0, 1500),
    );
  }
  await browser.close().catch(() => {});
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

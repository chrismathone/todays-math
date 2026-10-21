// 띄워 둔 크로뮴(9333)의 로그인 쿠키로 오늘의 개념 탐험을 정답으로 끝까지 푼다(로컬 서버 전용).
// 화면과 같은 API · 같은 머리글(x-explorer-follow-up: 1)을 쓴다. npx tsx .qa-artifacts/srs-e5/solve-explorer.ts [최대 걸음]
import { randomUUID } from "node:crypto";
import { chromium } from "@playwright/test";
import { definitionCard } from "@/lib/math-explorers/definition-cards";

const base = "http://localhost:4321";
const max = Number(process.argv[2] ?? 40);
type Activity = {
  questionId: string;
  cardId: string;
  kind: "read" | "assemble" | "examples" | "truth";
  choices: { id: number; label: string }[];
};

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9333");
  const cookies = (await browser.contexts()[0].cookies(base))
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const headers = {
    cookie: cookies,
    origin: base,
    "content-type": "application/json",
    "x-explorer-follow-up": "1",
  };
  const view = async () => {
    const r = await fetch(`${base}/api/learn/math-explorers`, { headers });
    if (!r.ok) throw new Error(`GET ${r.status} ${await r.text()}`);
    return (await r.json()).data;
  };
  let state = await view();
  for (let step = 0; step < max; step++) {
    const activity: Activity | null = state.currentActivity;
    if (!activity) break;
    const card = definitionCard(activity.cardId);
    let action: Record<string, unknown>;
    if (activity.kind === "read")
      action = { type: "read", questionId: activity.questionId };
    else {
      const labels =
        activity.kind === "assemble"
          ? card.words.slice(0, 2)
          : activity.kind === "examples"
            ? card.examples.filter((e) => e.yes).map((e) => e.text)
            : [card.truth ? "맞다" : "아니다"];
      action = {
        type: "answer",
        questionId: activity.questionId,
        choiceIds: labels.map(
          (label) => activity.choices.find((c) => c.label === label)!.id,
        ),
      };
    }
    const r = await fetch(`${base}/api/learn/math-explorers`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        requestId: randomUUID(),
        expectedRevision: state.revision,
        studentId: state.student.id,
        action,
      }),
    });
    if (!r.ok) throw new Error(`POST ${r.status} ${await r.text()}`);
    state = (await r.json()).data;
    console.log(
      step,
      activity.kind,
      state.feedback?.correct ?? "-",
      state.session?.index,
      "/",
      state.session?.total,
    );
  }
  console.log(
    JSON.stringify({
      session: state.session && {
        index: state.session.index,
        done: state.session.done,
        unresolved: state.session.unresolved.length,
      },
      mission: state.expedition?.mission && {
        kind: state.expedition.mission.kind,
        status: state.expedition.mission.status,
        answered: state.expedition.mission.answered,
        retryRemaining: state.expedition.mission.retryRemaining,
      },
    }),
  );
  await browser.close().catch(() => {});
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});

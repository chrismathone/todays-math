/**
 * 작업: 해설 생성(작업실 «해설» — `action: "solution"`). 제품 지시문(`buildDevAiPrompt`)과 응답 해석
 * (`executeMathgenTask` → `parseDevAiResult`)을 그대로 쓰고, 모델 호출만 팔로 바꾼다.
 *
 * 표본: 공유 DB 읽기만 — 출제 가능 · 정답 있음 · 그림 없음(글만 받는 팔과 공정하게). 시드로 고정한 차례에서
 * 단원이 겹치지 않게 뽑는다. `filter=high` 는 고등 과목만, 난이도 응용 이상.
 */
import type { DevAiRequest } from "@/lib/dev-ai/contracts";
import { buildDevAiPrompt, executeMathgenTask } from "@/lib/dev-ai/tasks";
import { db } from "@/lib/db";
import { problemEligibleWhere } from "@/lib/problemEligibility";
import { countSlashFractions, matchAnswer, median, percentile, renderCheck } from "../grade";
import type { Task } from "../task";

export interface SolutionItem {
  id: string;
  grade: string;
  unit: string;
  difficulty: string;
  content: string;
  answer: string;
}

const HIGH = /^(고|공통수학|대수|미적분|확률과|기하|수학)/;

const request = (item: SolutionItem): DevAiRequest => ({
  // 해설 지시문은 provider 를 읽지 않는다 — 형식만 맞춘다
  provider: "codex" as DevAiRequest["provider"],
  action: "solution",
  content: item.content,
  grade: item.grade,
});

export const solutionTask: Task<SolutionItem> = {
  name: "solution",
  vision: false,
  expectedOutputTokens: 1500,

  async sample({ n, seed, filter, excludeIds = [] }) {
    const rows = await db.$queryRawUnsafe<
      { id: string; unit_id: string; grade: string; chapter: string; section: string; difficulty: string; content: string; answer: string }[]
    >(
      `select p.id, p.unit_id, u.grade, u.chapter, u.section, p.difficulty::text as difficulty, p.content, p.answer
         from problem p join unit u on u.id = p.unit_id
        where p.id in (
          select id from problem where length(trim(answer)) > 0
            and figure_svg is null and coalesce(array_length(figure_urls, 1), 0) = 0
            and content !~ '<img|!\\[' )
        order by md5(p.id::text || $1)
        limit 20000`,
      seed,
    );
    // 출제 가능 여부는 제품 조건 그대로 거른다
    const eligible = new Set(
      (
        await db.problem.findMany({
          where: { AND: [problemEligibleWhere(), { id: { in: rows.map((r) => r.id) } }] },
          select: { id: true },
        })
      ).map((r) => r.id),
    );
    const excluded = new Set(excludeIds);
    const seenUnits = new Set<string>();
    const picked: SolutionItem[] = [];
    // high: 응용과 심화(하·중·상)를 반씩 — 응용이 훨씬 많아 그대로 뽑으면 심화가 한두 개뿐이다
    const bucket = (d: string) => (d.startsWith("심화") ? "deep" : "apply");
    const quota = { apply: Math.ceil(n / 2), deep: Math.floor(n / 2) };
    for (const r of rows) {
      if (picked.length >= n) break;
      if (!eligible.has(r.id) || excluded.has(r.id) || seenUnits.has(r.unit_id)) continue;
      if (filter === "high") {
        if (!HIGH.test(r.grade) || ["연산", "기본"].includes(r.difficulty)) continue;
        const b = bucket(r.difficulty);
        if (quota[b] <= 0) continue;
        quota[b]--;
      }
      seenUnits.add(r.unit_id);
      picked.push({
        id: r.id,
        grade: r.grade,
        unit: `${r.chapter} › ${r.section}`,
        difficulty: r.difficulty,
        content: r.content,
        answer: r.answer,
      });
    }
    return picked;
  },

  prompt: (item) => buildDevAiPrompt(request(item)),

  async runOne(item, arm, call) {
    let finish: "stop" | "length" | "other" = "other";
    let raw = "";
    try {
      const result = await executeMathgenTask(request(item), async (prompt) => {
        const out = await call(arm, { prompt });
        finish = out.finish;
        raw = out.text;
        // 제품은 잘림을 오류로 던진다 — 같은 화면 결과(«응답이 잘렸습니다»)가 되게
        if (out.finish !== "stop") throw new Error(`finish=${out.finish}`);
        return out.text;
      });
      const answerMatch = matchAnswer(result.answer, item.answer);
      const render = renderCheck(`${result.answer}\n${result.solution}`);
      return {
        finish,
        raw,
        score: {
          answer: result.answer,
          truth: item.answer,
          match: answerMatch,
          renderFail: render.renderFail,
          dollarOdd: render.dollarOdd,
          slashFractions: countSlashFractions(`${result.answer}\n${result.solution}`),
          length: result.solution.length,
          steps: (result.solution.match(/^step\d+\)/gm) ?? []).length,
        },
      };
    } catch (error) {
      return {
        finish,
        raw,
        error: error instanceof Error ? error.message.slice(0, 300) : String(error),
        score: { answer: "", truth: item.answer, match: "empty", renderFail: 0, dollarOdd: false, slashFractions: countSlashFractions(raw), length: 0, steps: 0 },
      };
    }
  },

  needsFallback: (r) => r.finish !== "stop" || Boolean(r.error) || r.score.match === "empty",

  summarize(records) {
    const n = records.length;
    const count = (f: (r: (typeof records)[number]) => boolean) => records.filter(f).length;
    const ms = records.map((r) => r.ms);
    const cost = records.reduce((a, r) => a + r.cost, 0);
    return {
      문항: n,
      "답 같음": count((r) => r.score.match === "same"),
      "답 다름(사람 확인)": count((r) => r.score.match === "differs"),
      "답 없음·실패": count((r) => r.score.match === "empty"),
      잘림: count((r) => r.finish === "length"),
      "렌더 실패": count((r) => Number(r.score.renderFail) > 0 || Boolean(r.score.dollarOdd)),
      "빗금 분수 수": records.reduce((sum, r) => sum + Number(r.score.slashFractions ?? 0), 0),
      "대체 경로 탐": count((r) => Boolean(r.usedFallback)),
      "시간 중앙(초)": +(median(ms) / 1000).toFixed(1),
      "시간 p90(초)": +(percentile(ms, 90) / 1000).toFixed(1),
      "문항당 비용($)": +(cost / Math.max(1, n)).toFixed(5),
      "합계 비용($)": +cost.toFixed(4),
      "해설 길이 중앙": median(records.map((r) => Number(r.score.length ?? 0))),
      "해설 길이 평균": +(records.reduce((sum, r) => sum + Number(r.score.length ?? 0), 0) / Math.max(1, n)).toFixed(1),
    };
  },
};

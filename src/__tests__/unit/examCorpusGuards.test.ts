import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import {
  baselinePath,
  examRoot,
  fingerprint,
  readDraftCorpus,
} from "../../../scripts/import/exam-paper/audit-bank-fix";
import { repairEquationScopes } from "../../../scripts/import/exam-paper/repairEquationScopes";

const range = (a: number, b: number) =>
  Array.from({ length: b - a + 1 }, (_, i) => a + i);
// EX-01·02의 답 경계, EX-03·04·06·11·14의 지문·수식, 원본을 확인한 그래프 둘.
const changedQuestions: Record<string, number[]> = {
  chilgok: [7, ...range(17, 21)],
  daegudong: range(12, 17),
  daeguil: [3, ...range(19, 22)],
  daejin: range(17, 21),
  daeryun: [5, 7, ...range(13, 16)],
  deokwon: [7, 8, 9, ...range(14, 18)],
  dongdo: range(9, 16),
  dowon: range(18, 21),
  gangdong: range(17, 21),
  gyeonggu: range(20, 23),
  gyeseong: range(19, 23),
  hyeopseonggyeongbok: range(15, 19),
  joam: range(19, 22),
  maeho: range(19, 22),
  neungin: range(16, 20),
  oseong: range(17, 21),
  saeron: [4, 8, ...range(14, 19)],
  sangin: range(17, 23),
  seonggwang: range(19, 21),
  seonghwa: [7, ...range(19, 22)],
  seongmyeongyeo: range(19, 23),
  sinmyeongyeo: [9, ...range(18, 25)],
  yeongnamsamyuk: [9, 14],
};

describe("기출 25편·533문항 전수 관문", () => {
  it("앞선 수리와 합의·퍼센트 수리 124행 밖의 409행은 SHA-256이 그대로다", () => {
    const baseline = JSON.parse(readFileSync(baselinePath, "utf8")) as Record<
      string,
      string
    >;
    const rows = readDraftCorpus();
    expect(rows).toHaveLength(533);
    expect(rows.map((d) => d.externalId).sort()).toEqual(
      Object.keys(baseline).sort(),
    );
    const allowed = Object.entries(changedQuestions)
      .flatMap(([school, numbers]) =>
        numbers.map((n) => `2025-${school}-3-2-mid-${n}`),
      )
      .sort();
    expect(allowed).toHaveLength(124);
    expect(
      rows
        .filter((d) => fingerprint(d) !== baseline[d.externalId])
        .map((d) => d.externalId)
        .sort(),
    ).toEqual(allowed);
  });

  it("객관식 보기·정답을 전수 세고 원본 필요 두 문항과 별도 렌더 결함 한 문항을 명시한다", () => {
    const faults: string[] = [];
    for (const d of readDraftCorpus().filter(
      (d) => d.questionType === "객관식",
    )) {
      const { choices } = parseProblemContent(d.content);
      if (choices.length !== 5)
        faults.push(`${d.externalId}: 보기 ${choices.length}`);
      for (let i = 0; i < choices.length; i += 1)
        if (!choices[i].trim()) faults.push(`${d.externalId}: 빈 ${i + 1}`);
      const answer = "①②③④⑤".indexOf(d.answer);
      if (answer < 0) faults.push(`${d.externalId}: 정답 번호 없음`);
      else expect(answer, d.externalId).toBeLessThan(choices.length);
    }
    // 칠곡의 빈 ④는 A3 합의로 보충했다. 대구동 6 의 «조건 1..3 + 보기 1..5»는 파서가 끝 묶음만
    // 보기로 읽게 되어(B3) 여기서 빠졌다 — 남은 것은 학교가 문제 오류라고 쓴 대진 13 하나다(적재 제외).
    expect(faults).toEqual(["2025-daejin-3-2-mid-13: 정답 번호 없음"]);
    const blanks = readDraftCorpus().flatMap((d) =>
      [...d.content.matchAll(/^([1-5])\.\s*$/gm)].map(
        (m) => `${d.externalId}: 빈 ${m[1]}`,
      ),
    );
    expect(blanks).toEqual([]);
  });

  it("SIM·coc·남은 범위 수리 0이며 답 없음은 학교가 문제 오류라고 쓴 대진 13 하나다", () => {
    const missing: string[] = [];
    for (const d of readDraftCorpus()) {
      for (const text of [d.content, d.answer, d.solution ?? ""]) {
        expect(text, d.externalId).not.toMatch(/SIM|coc/);
        expect(repairEquationScopes(text), d.externalId).toBe(text);
        expect(text, d.externalId).not.toMatch(new RegExp("[\\u0008\\u000C]"));
      }
      if (d.answer === "(정답 없음)") {
        missing.push(d.externalId);
        expect(d.solution).toContain("문제오류");
      }
    }
    expect(missing).toEqual(["2025-daejin-3-2-mid-13"]);
  });

  it("EX-12: 덕화 1의 자료는 최빈값 26 하나인데 추출된 다섯 보기에는 없다", () => {
    const source = JSON.parse(
      readFileSync(
        join(examRoot, "2025-deokhwa-3-2-mid/hwp_fixed.json"),
        "utf8",
      ),
    ) as { id: string; text: string }[];
    const stem = source
      .find((p) => p.id === "1-stem")!
      .text.split("\n")
      .map((s) => s.trim());
    const values: number[] = [];
    for (let i = 1; i < stem.length; i += 1) {
      if (!stem[i].includes("~~")) continue;
      const tens = Number(stem[i - 1].match(/\$(\d)\$/)?.[1]);
      values.push(
        ...[...stem[i].matchAll(/\d/g)].map((m) => 10 * tens + Number(m[0])),
      );
    }
    expect(values).toHaveLength(20);
    const counts = new Map<number, number>();
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
    const modes = [...counts]
      .filter(([, n]) => n === Math.max(...counts.values()))
      .map(([v]) => v);
    expect(modes).toEqual([26]);
    const options = source
      .filter((p) => /^1-c/.test(p.id))
      .map((p) => Number(p.text.replace(/\$/g, "")));
    expect(options).toHaveLength(5);
    expect(options).not.toContain(26);
  });

  it("EX-15: 원본 접선 길이와 넓이 38은 서로 모순이므로 원문을 고쳐 쓰지 않는다", () => {
    const ac = 11,
      cf = 6,
      bc = 14;
    const ab = ac - cf + (bc - cf);
    const semiperimeter = (ab + bc + ac) / 2;
    const area = Math.sqrt(
      semiperimeter *
        (semiperimeter - ab) *
        (semiperimeter - bc) *
        (semiperimeter - ac),
    );
    expect(ab).toBe(13);
    expect(semiperimeter).toBe(19);
    expect(area).toBeCloseTo(67.5277720645);
    expect(area).not.toBe(38);
    const d = readDraftCorpus().find(
      (d) => d.externalId === "2025-gyeongsanyeo-3-2-mid-19",
    )!;
    const baseline = JSON.parse(readFileSync(baselinePath, "utf8")) as Record<
      string,
      string
    >;
    expect(fingerprint(d)).toBe(baseline[d.externalId]);
  });
});

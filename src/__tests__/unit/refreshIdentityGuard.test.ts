/**
 * **제자리 갱신이 «같은 행을 다른 문제로» 만들지 않는가** — `refresh-engine-content.ts` 의 문지기.
 *
 * 2026-10-03 전수 동기화에서 298행이 같은 문항 코드를 단 채 다른 문제가 됐다(엔진이 퇴화값을 거르게
 * 바뀌어 같은 씨앗이 다른 수를 뽑았다). 은행을 열기 전이라 그 상태를 기준선으로 두되(3자 합의 C1),
 * **앞으로는 도구가 막는다**: 같은 문제임을 확인하지 못하면 덮지 않는다.
 *
 * 🔴 «0 · 1 만 빠졌으면 표기»같은 너그러운 예외를 두지 않는다 — 0 과 1 도 조건을 바꾼다.
 *    뜻한 수리(조건을 보탬 · 표기 정리)는 사람이 행을 짚어 «같은 문제»라고 적어 줘야 지나간다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import {
  decideApply,
  figureLabelBag,
  identityRisk,
  type Cols,
  type Scope,
} from "../../../scripts/qa/refreshEngineContentCore";

const base = {
  content:
    "남학생 수와 여학생 수의 비가 $5:6$인 모둠에서 남학생이 $15$명이다. 전체 학생 수를 구하시오.",
  answer: "$33$명",
  solution: "풀이",
};

describe("identityRisk — 같은 문제인가", () => {
  it("풀이만 다르면 같은 문제다", () => {
    expect(identityRisk(base, { ...base, solution: "다른 풀이" })).toBeNull();
  });

  it("공백 · 조사만 다르면 같은 문제다", () => {
    const made = {
      ...base,
      content: base.content
        .replace("비가", "비는")
        .replace("모둠에서 ", "모둠에서  "),
    };
    expect(identityRisk(base, made)).toBeNull();
  });

  it("🔴 수가 다시 뽑혔다 — 다른 문제다", () => {
    const made = {
      ...base,
      content: base.content.replace("$5:6$", "$5:4$").replace("$15$", "$25$"),
      answer: "$45$명",
    };
    expect(identityRisk(base, made)).toBe("발문의 수");
  });

  it("🔴 `1x` → `x` 도 그냥 지나가지 않는다 — 0 · 1 예외는 없다", () => {
    const db = {
      content: "$1x-4<-6$ 을 푸시오.",
      answer: "$x<-2$",
      solution: null,
    };
    const made = { ...db, content: "$x-4<-6$ 을 푸시오." };
    expect(identityRisk(db, made)).toBe("발문의 수");
  });

  it("🔴 수는 같은데 묻는 것이 바뀌었다 — 다른 문제다(정답이 우연히 같아도)", () => {
    const db = {
      content:
        "밑면의 반지름이 $8$ cm 이고 높이가 $7$ cm 인 원기둥의 전개도에서 옆면의 넓이는 몇 cm²인가?",
      answer: "$10$",
      solution: null,
    };
    const made = {
      ...db,
      content: db.content.replace(
        "옆면의 넓이는 몇 cm²인가",
        "옆면의 둘레는 몇 cm인가",
      ),
    };
    expect(identityRisk(db, made)).toBe("발문의 글");
  });

  it("🔴 단답형의 정답 값이 바뀌었다", () => {
    expect(identityRisk(base, { ...base, answer: "$34$명" })).toBe("정답의 값");
  });

  it("정답의 끝자리 0 은 값이 아니다", () => {
    const db = {
      content: "값을 구하시오.",
      answer: "$0.8290$",
      solution: null,
    };
    expect(identityRisk(db, { ...db, answer: "$0.829$" })).toBeNull();
  });

  const mcq = (choices: string[], answer: string) => ({
    content: `값을 구하시오.\n${choices.map((c, i) => `${"①②③④⑤"[i]} ${c}`).join("\n")}`,
    answer,
    solution: null,
  });

  it("객관식 — 보기의 차례 · 오답이 달라도 정답 보기의 값이 같으면 같은 문제다", () => {
    const db = mcq(["$1$", "$2$", "$3$", "$4$", "$5$"], "③");
    const made = mcq(["$7$", "$3$", "$9$", "$8$", "$6$"], "②");
    expect(identityRisk(db, made)).toBeNull();
  });

  it("🔴 객관식 — 정답 번호가 가리키는 값이 달라졌다", () => {
    const db = mcq(["$1$", "$2$", "$3$", "$4$", "$5$"], "③");
    const made = mcq(["$1$", "$2$", "$3$", "$4$", "$5$"], "④");
    expect(identityRisk(db, made)).toBe("정답의 값");
  });

  it("🔴 그림의 라벨이 달라졌다 — 그림이 주는 정보가 바뀐 것이다", () => {
    const svg = (labels: string[]) =>
      `<svg>${labels.map((l) => `<g data-label="${l}" data-x="1"><path d="M0 0"/></g>`).join("")}</svg>`;
    const db = { ...base, figureSvg: svg(["10 cm", "A", "B"]) };
    expect(identityRisk(db, { ...base, figureSvg: svg(["A", "B"]) })).toBe(
      "그림의 라벨",
    );
    expect(
      identityRisk(db, { ...base, figureSvg: svg(["B", "A", "10 cm"]) }),
    ).toBeNull();
  });

  it("옛 `<text>` 라벨과 조판된 라벨은 글자가 같으면 같은 라벨이다", () => {
    const old = `<svg><text x="1" y="2" data-mj="60°"><tspan>60</tspan><tspan>°</tspan></text><text x="3" y="4">A</text></svg>`;
    const now = `<svg><g data-label="60°" data-x="1"><g><path d="M0 0"/></g></g><g data-label="A" data-x="3"><path d="M0 0"/></g></svg>`;
    expect(figureLabelBag(old)).toEqual(figureLabelBag(now));
  });

  it("그림이 한쪽에만 있으면 라벨은 견주지 않는다 — 그건 글의 갈래가 본다", () => {
    expect(
      identityRisk(
        { ...base, figureSvg: null },
        { ...base, figureSvg: "<svg/>" },
      ),
    ).toBeNull();
  });
});

describe("실제 원장으로 — 2026-10-03 전수 동기화를 다시 돌렸다면", () => {
  const dir = path.join(
    process.cwd(),
    "scripts",
    "qa",
    "reports",
    "refresh-engine-content",
  );
  const ledger = JSON.parse(
    gunzipSync(
      readFileSync(path.join(dir, "bank-fix-20261003.json.gz")),
    ).toString("utf8"),
  ) as {
    rows: {
      problemId: string;
      before: Cols & { figureSvg: string | null; directUseAllowed: boolean };
      after: Cols & { figureSvg: string | null; directUseAllowed: boolean };
    }[];
  };
  const replaced = JSON.parse(
    readFileSync(path.join(dir, "pre-open-replaced-20261003.json"), "utf8"),
  ) as { rows: { problemId: string }[] };
  const updates = ledger.rows.filter(
    (r) => r.before.directUseAllowed === r.after.directUseAllowed,
  );

  it("🔴 «다른 문제가 된» 298행을 하나도 빠짐없이 막는다", () => {
    const ids = new Set(replaced.rows.map((r) => r.problemId));
    expect(ids.size).toBe(298);
    const passed = updates.filter(
      (r) => ids.has(r.problemId) && identityRisk(r.before, r.after) === null,
    );
    expect(passed.map((r) => r.problemId)).toEqual([]);
  });

  it("풀이만 바뀐 행은 하나도 안 막는다 — 막으면 도구를 못 쓴다", () => {
    const solutionOnly = updates.filter(
      (r) =>
        r.before.content === r.after.content &&
        r.before.answer === r.after.answer &&
        r.before.figureSvg === r.after.figureSvg,
    );
    expect(solutionOnly.length).toBe(1632);
    expect(
      solutionOnly.filter((r) => identityRisk(r.before, r.after) !== null),
    ).toEqual([]);
  });

  it("그림만 바뀐 행 — 라벨이 같으면 지나가고, 라벨이 달라진 40장은 사람에게 묻는다", () => {
    const figureOnly = updates.filter(
      (r) =>
        r.before.content === r.after.content &&
        r.before.answer === r.after.answer &&
        r.before.figureSvg !== r.after.figureSvg,
    );
    // 그림만 248 + 풀이와 그림 108 — 원장의 «바뀐 칸» 집계와 같다.
    expect(figureOnly.length).toBe(356);
    const risks = figureOnly
      .map((r) => identityRisk(r.before, r.after))
      .filter((risk) => risk !== null);
    // 답이 적힌 치수를 숨긴 정육면체 그림(초5 2-5-2 · 초6 1-6-1) — 뜻한 수리지만 «그림이 주는 정보»가 바뀌었다.
    expect(risks).toEqual(Array.from({ length: 40 }, () => "그림의 라벨"));
  });

  it("객관식의 오답 · 차례만 바뀐 행은 지나간다 — 소수 오답 수리가 이 꼴이다", () => {
    const squash = (text: string): string => text.replace(/\s+/g, "");
    const stem = (c: string): string => squash(c.split("\n①")[0] ?? "");
    const choiceOnly = updates.filter(
      (r) =>
        r.before.content.includes("\n①") &&
        r.before.content !== r.after.content &&
        stem(r.before.content) === stem(r.after.content),
    );
    const passed = choiceOnly.filter(
      (r) => identityRisk(r.before, r.after) === null,
    );
    expect(passed.length).toBeGreaterThan(2400);
  });

  it("298행 밖에서 막는 것은 «뜻한 수리»다 — 사유마다 세어 둔다(사람이 짚어 줘야 지나간다)", () => {
    const ids = new Set(replaced.rows.map((r) => r.problemId));
    const counts: Record<string, number> = {};
    for (const r of updates) {
      if (ids.has(r.problemId)) continue;
      const risk = identityRisk(r.before, r.after);
      if (risk) counts[risk] = (counts[risk] ?? 0) + 1;
    }
    // 발문의 수: 표기(`1x` → `x`) · 조건 보탬 · 약분 / 발문의 글: 낱말을 고친 문구 수리 /
    // 정답의 값: 정답의 표기(`$1\pi$` → `$\pi$`) / 그림의 라벨: 위 40장.
    expect(counts).toEqual({
      "발문의 수": 230,
      "발문의 글": 296,
      "정답의 값": 15,
      "그림의 라벨": 40,
    });
  });
});

describe("decideApply — 덮는가 · 막는가", () => {
  const scope: Scope = {
    families: new Set(["mid:a"]),
    solutionEverywhere: false,
  };

  it("고치기로 한 문항류라도 «다른 문제»면 막는다", () => {
    expect(decideApply("mid:a", "stem", null, scope, "발문의 수", false)).toBe(
      "refuse",
    );
  });

  it("사람이 «같은 문제»라고 짚어 준 행은 덮는다", () => {
    expect(decideApply("mid:a", "stem", null, scope, "발문의 수", true)).toBe(
      "apply",
    );
  });

  it("위험이 없으면 예전 규칙 그대로다", () => {
    expect(decideApply("mid:a", "stem", null, scope, null, false)).toBe(
      "apply",
    );
    expect(decideApply("mid:b", "stem", null, scope, null, false)).toBe("skip");
    expect(
      decideApply("mid:b", "choices", "소수 정답", scope, null, false),
    ).toBe("apply");
    expect(decideApply("mid:a", "same", null, scope, null, false)).toBe("skip");
  });

  it("안 덮을 행은 위험이 있어도 «막음»으로 세지 않는다 — 덮으려던 것만 센다", () => {
    expect(decideApply("mid:b", "stem", null, scope, "발문의 수", false)).toBe(
      "skip",
    );
  });
});

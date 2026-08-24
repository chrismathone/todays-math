/**
 * Decision Log 번호가 겹치지 않는가 — **2026-08-24 하루에 다섯 번** 겹쳐서 만든 검사.
 *
 * 그날의 사고: 초등·중등 결합형이 D-75 를, 헤더 계정 구역과 중등 결합형이 D-76 을,
 * 검수 강조와 연산자 첨자가 D-102 를, 옮긴 연산자 첨자와 중등결합형이 D-103 을 썼다.
 * 게다가 **2026-08-16 부터 `D-50` 이 둘**이었는데(예측 재료 / 복수정답 지면 표기)
 * 앞 세션이 「참조가 걸려 있어 임의로 안 옮겼다」고 남기고 그대로 여덟 날을 갔다.
 *
 * 🔴 **자동 병합은 번호가 겹친 것을 말해 주지 않는다.** 두 줄을 나란히 붙여 놓을 뿐이고
 *    표는 멀쩡해 보인다. 사람 눈으로만 걸러 왔고, 그래서 다섯 번 샜다.
 *
 * ## 무엇을 «등록부»로 보나 — 여기가 이 검사의 급소다
 *
 * 등록부는 **둘**이다: `07-coding-convention.md` 의 「Decision Log 전체」와
 * `05-design-system.md` 의 표(D-39~44 가 **거기에만** 있다). 07 만 보고 「비었다」고
 * 하면 D-39~44 를 다시 내주게 된다 — 실제로 이 검사를 쓰기 전에 그럴 뻔했다.
 *
 * ⚠️ **다른 기획 문서(01·02·03·04·16·tracks)를 등록부로 세면 안 된다.** 거기 `| D-NN |`
 *    행은 **상호참조**라 같은 번호가 여러 번 나온다(16 은 D-20 이 네 번). 그것을 중복으로
 *    세면 이 검사는 늘 빨갛고, **늘 우는 가드는 꺼진다**(2026-08-20 교훈). 대신 그 문서들은
 *    **반대 방향으로** 쓴다 — 거기 있는 번호가 등록부에 **없으면** 미등록 결정이다.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const PLANNING = join(process.cwd(), "docs/planning");

/** 표의 결정 행: 줄 맨 앞의 `| D-07 |`. 본문 안 인용(`(D-07)`)은 안 잡힌다. */
const ROW = /^\| D-(\d+) \|/gm;

function rowsIn(relPath: string): number[] {
  const text = readFileSync(join(process.cwd(), relPath), "utf8");
  return [...text.matchAll(ROW)].map((m) => Number(m[1]));
}

/** 등록부 둘 — 번호를 **내주는** 자리. */
const REGISTRY = [
  "docs/planning/07-coding-convention.md",
  "docs/planning/05-design-system.md",
] as const;

describe("[등록부] Decision Log 번호는 겹치지 않는다", () => {
  it("한 문서 안에서 같은 번호를 두 번 내주지 않는다", () => {
    for (const file of REGISTRY) {
      const nums = rowsIn(file);
      const dup = nums.filter((n, i) => nums.indexOf(n) !== i);
      expect(
        [...new Set(dup)],
        `${file} 안에 번호가 겹쳤다 — 표의 규칙대로 **참조가 적은 쪽**을 옮기고 그 참조도 같이 고칠 것`,
      ).toEqual([]);
    }
  });

  it("두 등록부가 같은 번호를 나눠 갖지 않는다", () => {
    const [a, b] = REGISTRY.map((f) => new Set(rowsIn(f)));
    const both = [...a].filter((n) => b.has(n)).sort((x, y) => x - y);
    expect(
      both,
      "07 과 05 가 같은 번호를 썼다 — 번호 공간은 **둘이 나눠 쓴다**(D-39~44 는 05 에만 있다)",
    ).toEqual([]);
  });

  it("등록부에 실제로 번호가 있다 — 0 은 「깨끗」이 아니라 「못 셈」일 수 있다", () => {
    // 정규식이 어긋나면 위의 두 검사는 **빈 배열끼리 견주어** 언제나 초록이다.
    for (const file of REGISTRY)
      expect(
        rowsIn(file).length,
        `${file} 에서 결정 행을 한 줄도 못 읽었다`,
      ).toBeGreaterThan(0);
  });

  it("다른 기획 문서가 가리키는 번호는 전부 등록부에 있다 (미등록 결정 금지)", () => {
    const registered = new Set(REGISTRY.flatMap(rowsIn));
    const others = readdirSync(PLANNING)
      .filter((f) => f.endsWith(".md"))
      .map((f) => `docs/planning/${f}`)
      .filter((f) => !REGISTRY.includes(f as (typeof REGISTRY)[number]));

    const orphans: string[] = [];
    for (const file of others)
      for (const n of new Set(rowsIn(file)))
        if (!registered.has(n))
          orphans.push(`${file} → D-${String(n).padStart(2, "0")}`);

    expect(
      orphans,
      "등록부에 없는 번호를 다른 문서가 결정처럼 적고 있다 — 등록부에 올리거나 인용 형태로 고칠 것",
    ).toEqual([]);
  });

  it("머리글이 말하는 범위가 표와 맞는다 — 낡은 머리글이 겹친 번호를 부른다", () => {
    const text = readFileSync(join(REGISTRY[0]), "utf8");
    const head =
      /## Decision Log 전체 \(D-01 ~ D-(\d+) · 메인 세션은 D-100 부터, 현재 D-(\d+)\)/.exec(
        text,
      );
    expect(
      head,
      "머리글 형식이 바뀌었다 — 이 검사도 같이 고칠 것",
    ).not.toBeNull();

    const nums = REGISTRY.flatMap(rowsIn);
    const parallelMax = Math.max(...nums.filter((n) => n < 100));
    const overallMax = Math.max(...nums);

    // 「다음 번호를 고르는 사람」이 보는 것이 이 두 수다. 낡으면 그 사람이 겹친 번호를 고른다.
    expect(Number(head![1]), "머리글의 병렬 대역 상한이 표와 다르다").toBe(
      parallelMax,
    );
    expect(Number(head![2]), "머리글의 「현재」가 표와 다르다").toBe(
      overallMax,
    );
  });
});

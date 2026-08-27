/**
 * 등록된 중학 유형이 **어느 시험에든 덮여 있는가** — 분모를 지키는 가드.
 *
 * 왜 필요한가: 각 세션의 시험은 자기 유형만 훑는다(합본을 훑으면 남의 유형이 자기
 * 검산표에 들이대져 빨개진다 — 물결 1·2C 가 실제로 밟았다). 그렇게 좁히고 나면
 * **유형만 더하고 시험을 안 쓴 경우**를 아무도 못 잡는다. 그 실패는 「빨강」이
 * 아니라 **분모가 조용히 줄어드는** 형태라 침묵한다(2026-08-19 「N passed 는
 * N이 전부인지 말해 주지 않는다」와 같은 자리).
 *
 * 열쇠: 시험들은 `registeredTypes().filter(e => e.rpmMinor === "…")` 로 자기 몫을
 * 고른다. 그러므로 **등록된 rpmMinor 가 어느 시험 파일엔가 문자열로 있는가**를
 * 센다. rpmMinor 는 「일차방정식의 활용」처럼 이 저장소에서 그 중단원에만 쓰이는
 * 긴 한글 구라 다른 뜻으로 겹치지 않는다(2026-08-18 「흔한 낱말을 세지 마라」).
 *
 * 한계 — 정직하게 적는다:
 *  - 이 가드가 막는 것은 **새 중단원을 등록하고 시험을 안 쓴 경우**다.
 *  - 이미 시험이 있는 중단원에 유형 번호만 더하는 경우는 못 본다. 그건 각 시험의
 *    「N유형이 전부 등록돼 있다」 검사가 막는다(그래서 그 검사를 지우면 안 된다).
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { registeredTypes } from "../../lib/middle/generate";

const TEST_DIR = path.resolve(process.cwd(), "src/__tests__/unit");
const SELF = "middleTypeCoverage.test.ts";

function middleTestSources(): { file: string; src: string }[] {
  return readdirSync(TEST_DIR)
    .filter(
      (f) => f.startsWith("middle") && f.endsWith(".test.ts") && f !== SELF,
    )
    .map((f) => ({
      file: f,
      src: readFileSync(path.join(TEST_DIR, f), "utf8"),
    }));
}

describe("중학 유형 시험 커버리지 — 분모를 지킨다", () => {
  it("등록된 중단원은 전부 어느 시험 파일엔가 이름으로 나온다", () => {
    const sources = middleTestSources();
    expect(
      sources.length,
      "중학 시험 파일이 없으면 이 가드는 장식이다",
    ).toBeGreaterThan(2);

    const minors = [...new Set(registeredTypes().map((e) => e.rpmMinor))];
    expect(
      minors.length,
      "등록 중단원이 없으면 아래 검사는 아무것도 안 센다",
    ).toBeGreaterThan(3);

    const uncovered = minors.filter(
      (m) => !sources.some((s) => s.src.includes(m)),
    );
    expect(
      uncovered,
      `시험이 없는 중단원 ${uncovered.length}개 / 전체 ${minors.length}개 — 유형을 더했으면 그 유형을 지키는 시험도 같이 쓸 것`,
    ).toEqual([]);
  });

  it("RPM 번호는 색인 정본과 글자 그대로 같고, 색인 밖 번호는 색인 뒤에만 있다", () => {
    // 왜 대조하나: 세션마다 중단원 이름을 **손으로 적는다**. 정본은 「일차함수와 그
    // 그래프」 뒤에 **얇은 공백(U+2009)** 을 쓰는데 보통 공백으로 적으면 어디서도 안
    // 걸린다 — 실제로 m2Func 가 그렇게 등록돼 있었고, 그 자리를 고치는 날 다른 시험의
    // 중단원 필터가 남의 유형을 쓸어 담아 빨개진다(2026-08-23 물결 2D 가 발견).
    //
    // 왜 «색인 밖»을 허용하나 (2026-08-27): 색인은 **RPM 의 873유형**이다. 130소단원을
    // 10유형씩 채우라는 일은 그 밖으로 나가야 끝나는데, 그렇다고 색인 파일에 우리
    // 유형을 적어 넣으면 「이 번호가 RPM 에 있다」는 **거짓이 SSOT 에 박힌다**.
    // 그래서 가르는 축을 **번호의 자리**로 둔다 —
    //   · 색인 **안** 번호는 제목까지 정본과 같아야 하고,
    //   · 우리가 지은 번호는 그 중단원 색인 **최댓값 뒤**에서만 시작한다.
    // 이러면 「RPM 번호를 딴 뜻으로 쓴다」는 여전히 걸린다.
    // ⚠️ 중등 유형의 색인 대조는 **여기 한 곳**이다. 모듈 시험마다 다시 적지 말 것 —
    //    규칙이 네 벌이 되면 한쪽만 고쳐도 아무도 모른다.
    const raw = readFileSync(
      path.resolve(process.cwd(), "scripts/rpm/rpm-type-catalog.json"),
      "utf8",
    );
    const catalog = JSON.parse(raw) as Record<
      string,
      { types: { minor: string; number: string; title: string }[] }
    >;
    const bad: string[] = [];
    for (const e of registeredTypes()) {
      const book = catalog[e.rpmBook];
      if (!book) {
        bad.push(`${e.key}: 색인에 없는 책 ${e.rpmBook}`);
        continue;
      }
      const inMinor = book.types.filter((t) => t.minor === e.rpmMinor);
      if (inMinor.length === 0) {
        bad.push(
          `${e.key}: 색인에 없는 중단원 (${JSON.stringify(e.rpmMinor)})`,
        );
        continue;
      }
      const hit = inMinor.find((t) => t.number === e.rpmType);
      if (!hit) {
        const top = Math.max(...inMinor.map((t) => Number(t.number)));
        if (Number(e.rpmType) <= top) {
          bad.push(`${e.key}: 색인 밖인데 색인 범위(≤${top}) 안의 번호다`);
        }
        continue;
      }
      if (hit.title !== e.rpmTitle) {
        bad.push(
          `${e.key}: 제목이 다름 — 색인 ${hit.title} vs 등록 ${e.rpmTitle}`,
        );
      }
    }
    expect(bad.slice(0, 8), `정본과 다른 유형 ${bad.length}개`).toEqual([]);
  });

  it("등록 key 는 겹치지 않고 `책|중단원|번호` 꼴이다", () => {
    const keys = registeredTypes().map((e) => e.key);
    expect(new Set(keys).size, "key 겹침").toBe(keys.length);
    expect(
      keys.filter((k) => k.split("|").length !== 3),
      "key 꼴이 다른 것",
    ).toEqual([]);
  });
});

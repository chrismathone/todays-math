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
import { extensionNumberReason } from "../helpers/rpmCatalog";

const TEST_DIR = path.resolve(process.cwd(), "src/__tests__/unit");
const SELF = "middleTypeCoverage.test.ts";
const REVIEW = "docs/planning/tracks/reports/math-bank-reinforcement-20261018/";
const authoredKeys = new Set<string>(
  JSON.parse(
    readFileSync(REVIEW + "wave1-inputs.json", "utf8"),
  )[1].targets.flatMap((t: { typeKeys: string[] }) => t.typeKeys),
);
const authoredStems = JSON.parse(
  readFileSync(REVIEW + "m3-candidates.json", "utf8"),
).stems as {
  key: string;
  rpmBook: string;
  rpmMinor: string;
  rpmType: string;
  rpmTitle: string;
  grade: string;
  unitSection: string;
}[];

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

  it("RPM 계열은 색인 정본과 같고, 자작 12유형은 승인된 별도 목록·검산 대상과 같다", () => {
    // 왜: 세션마다 중단원 이름을 **손으로 적는다**. 정본은 「일차함수와 그 그래프」
    // 뒤에 **얇은 공백(U+2009)** 을 쓰는데 보통 공백으로 적으면 어디서도 안 걸린다 —
    // 실제로 m2Func 가 그렇게 등록돼 있었고, 그 자리를 고치는 날 다른 시험의
    // 중단원 필터가 남의 유형을 쓸어 담아 빨개진다(2026-08-23 물결 2D 가 발견).
    // 「손 목록은 샌다」 — 정본 하나에 대고 전량 대조한다.
    const raw = readFileSync(
      path.resolve(process.cwd(), "scripts/rpm/rpm-type-catalog.json"),
      "utf8",
    );
    const catalog = JSON.parse(raw) as Record<
      string,
      { types: { minor: string; number: string; title: string }[] }
    >;
    const bad: string[] = [];
    expect(authoredKeys.size).toBe(12);
    expect(
      registeredTypes()
        .filter((e) => e.rpmBook === "manual-20261018")
        .map((e) => e.key)
        .sort(),
    ).toEqual([...authoredKeys].sort());
    for (const e of registeredTypes()) {
      if (authoredKeys.has(e.key)) {
        const authored = authoredStems.find((s) => s.key === e.key);
        expect(authored, e.key).toBeDefined();
        for (const key of [
          "rpmBook",
          "rpmMinor",
          "rpmType",
          "rpmTitle",
          "grade",
          "unitSection",
        ] as const)
          expect(e[key], `${e.key} / ${key}`).toBe(authored![key]);
        expect(e.rpmBook).toBe("manual-20261018");
        expect(catalog[e.rpmBook]).toBeUndefined(); // Never invent RPM provenance for authored tasks.
        continue;
      }
      const book = catalog[e.rpmBook];
      if (!book) {
        bad.push(`${e.key}: 색인에 없는 책 ${e.rpmBook}`);
        continue;
      }
      // ⚠️ **중단원 이름은 여전히 정본과 글자 그대로** 대조한다 — 이 가드가
      //    실제로 잡은 결함(얇은 공백 U+2009)이 바로 이 자리다. 번호만 아래에서
      //    풀어 준다. 이름까지 풀면 이 검사는 통째로 장식이 된다.
      const inMinor = book.types.filter((t) => t.minor === e.rpmMinor);
      if (inMinor.length === 0) {
        bad.push(
          `${e.key}: 색인에 없는 중단원 (${JSON.stringify(e.rpmMinor)})`,
        );
        continue;
      }
      const hit = inMinor.find((t) => t.number === e.rpmType);
      if (hit) {
        if (hit.title !== e.rpmTitle) {
          bad.push(
            `${e.key}: 제목이 다름 — 색인 ${hit.title} vs 등록 ${e.rpmTitle}`,
          );
        }
        continue;
      }
      // 색인에 없는 번호 = 우리가 **지은** 확장 유형. 130소단원을 10유형으로
      // 올리려면 RPM 이 안 만든 유형을 지어야 하므로(2026-08-27 네 갈래) 정본에
      // 있을 수가 없다. 정본에 없는 것을 정본에 적어 넣으면 이 가드가
      // 「우리가 적은 것과 우리가 등록한 것이 같은가」를 묻는 동어반복이 된다.
      // 그래서 **정본은 그대로 두고** 확장 번호에 두 조건만 건다.
      // 규칙은 `extensionNumberReason` **한 곳**에 있다. 여기 다시 적으면
      // 여러 벌이 되어 한쪽만 고쳐도 아무도 모른다(실측: 갈래 A 의 `12A` 를
      // 세 파일이 다 `Number()` 로만 봐서 NaN 으로 읽었다).
      const why = extensionNumberReason(e);
      if (why !== null) {
        // 정본 번호대(01..max)의 빈 칸을 가로채면 RPM 이 그 번호를 쓰는 날 겹친다.
        // 🟡 정직하게 — 정본의 번호는 지금 전부 01..N 이 **끊김 없이** 이어져서
        //    이 갈래는 **오늘은 못 탄다**(번호대 안이면 위에서 `hit` 이 된다).
        //    번호대 안을 노린 변이는 「유형 키가 겹칩니다」(generate.ts)가 먼저
        //    문다. 이 줄은 정본이 재추출되며 번호에 구멍이 생기는 날을 위한
        //    뒷받침이다 — 지금 무엇이 지키고 있는지 헷갈리지 않게 적어 둔다.
        bad.push(`${e.key}: ${why}`);
        continue;
      }
      // 확장인데 제목이 정본 제목과 같으면 **이미 있는 유형을 번호만 바꿔 두 번**
      // 등록한 것이다 — 유형 수(축 🅐)가 가짜로 채워진다.
      const dup = inMinor.find((t) => t.title === e.rpmTitle);
      if (dup) {
        bad.push(
          `${e.key}: 확장인데 제목이 색인 ${dup.number} 과 같다 — 같은 유형을 두 번 세었다`,
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

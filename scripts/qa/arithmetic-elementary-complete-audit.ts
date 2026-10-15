/** Rebuild the scoped, local curriculum coverage report; no shared catalog writes. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { CURRICULUM_UNITS } from "../../prisma/seed-data/units";
import { ELEMENTARY_COMPLETE_DEFINITIONS as added } from "../../src/lib/arithmetic-v2/families/elementaryComplete";
import { arithmeticV2Definitions } from "../../src/lib/arithmetic-v2/registry";
import { arithmeticCurriculum } from "../../src/lib/arithmetic-v2/curriculum";

const grades = ["초3", "초4", "초5", "초6"];
const alias = (s: string) =>
  s.replace("그림그래프", "자료의 정리").replace(/^대응 관계$/, "규칙과 대응");
// Concrete exclusions, not inferred gaps or claims of full standard mastery.
const exclusions: Record<string, string[]> = {
  "초3/1-1": [
    "기존 세 자리 수 덧셈·뺄셈 및 짧은 피연산자 유형을 재생성하지 않음.",
  ],
  "초3/1-2": [
    "선분·각·직각삼각형·사각형의 인식과 분류는 수치 직접 계산이 아님.",
  ],
  "초3/1-3": [
    "곱셈과 나눗셈 관계의 말·그림 설명은 제외. 몫과 나머지 계산은 기존 유형.",
  ],
  "초3/1-4": [
    "2자리×1자리의 여러 받아올림 경우는 별도 수치 목표가 아닌 하나의 완전 유한 영역에 포함.",
  ],
  "초3/1-5": [
    "cm/mm/m/km 환산은 기존 geometryElementary 소유. 실제 자·시계 읽기와 어림 측정은 제외.",
  ],
  "초3/1-6": [
    "같은 크기 분할의 그림 제작 및 분수·소수 크기 비교는 제외. 이 학기 신규 분수·소수는 1 미만.",
  ],
  "초3/2-1": [
    "기존 3자리×1자리 및 2자리×2자리 곱셈을 중복하지 않음. 가환성에 의한 역순은 독립 개념으로 늘리지 않음.",
  ],
  "초3/2-2": ["기존 2자리/3자리÷1자리의 몫·나머지를 재생성하지 않음."],
  "초3/2-3": [
    "원 도형과 반지름·지름 계산은 기존 도형 소유. 컴퍼스 작도·원 구성 요소 인식 제외.",
  ],
  "초3/2-4": [
    "진분수/가분수 분류와 크기 비교 제외. 지정 분모의 표현·가분수/대분수 전환·전체/부분 양 계산 포함.",
  ],
  "초3/2-5": [
    "기존 L/mL 단일 환산·복합량→mL 중복 제외. 실제 용기·저울 측정, 양 비교 제외.",
  ],
  "초3/2-6": [
    "그림그래프를 그리거나 그림을 해독하는 평가 제외. 그림당 수량과 개수가 명시된 수치 표 계산 포함.",
  ],
  "초4/1-1": [
    "큰 수 읽기·쓰기의 언어 변환, 크기 비교 제외. 자리값/만·억·조 묶음/배율/뛰어 세기는 수치 계산 포함.",
  ],
  "초4/1-2": ["각도 계산은 기존 도형·각도 담당. 각도기 읽기, 어림, 분류 제외."],
  "초4/1-3": [
    "기존 3자리×2자리, 2자리/3자리÷2자리 영역 재사용. 유일한 정답이 없는 자유 어림셈 제외.",
  ],
  "초4/1-4": [
    "도형 밀기·뒤집기·돌리기·이동 구성/인식은 이 비도형 범위에서 제외.",
  ],
  "초4/1-5": [
    "막대그래프 그리기·눈금 읽기 평가 제외. 명시된 수량의 합계·차·빠진 값 계산 포함.",
  ],
  "초4/1-6": [
    "규칙을 임의 추측하는 유한 수열과 도형 배열 제외. 덧셈·뺄셈·곱셈·나눗셈 규칙을 명시한 다음/중간 항 계산 포함.",
  ],
  "초4/2-1": [
    "동분모 진분수·대분수 사칙 중 덧셈·뺄셈은 기존 유형. 분수 표현 전환은 초3-2의 선행 유형.",
  ],
  "초4/2-2": [
    "삼각형 성질로 구하는 수치는 기존 도형 소유. 변/각 기준 분류 제외.",
  ],
  "초4/2-3": [
    "기존 소수 둘째 자리까지의 덧셈·뺄셈을 재생성하지 않음. 소수 크기 비교 제외.",
  ],
  "초4/2-4": [
    "사각형 성질과 길이 계산은 기존 도형 소유. 수직·평행 및 사각형 분류 제외.",
  ],
  "초4/2-5": [
    "그래프 작도/시각 눈금 해독/향후 변화 예측 제외. 명시된 오전·오후 수량의 증가·감소량 포함.",
  ],
  "초4/2-6": [
    "다각형·대각선 수치 계산은 기존 도형 소유. 모양 만들기·채우기 제외.",
  ],
  "초5/1-1": [
    "기존 두 연산 순서 계산 유지. 이번에는 네 연산이 모두 있는 식과 소괄호·중괄호 조합 추가. 무한 길이 임의 식 생성은 아님.",
  ],
  "초5/1-2": [
    "약수 목록을 열거하는 다중답·관계 서술은 제외. 개수·합·최대공약수·최소공배수·배수 순번/개수 포함.",
  ],
  "초5/1-3": [
    "생활 상황에서 관계를 발견하거나 식을 자유 작성하는 평가는 제외. 명시된 대응 규칙의 입력/결과 계산 포함.",
  ],
  "초5/1-4": [
    "분수·소수 크기 비교 제외. 통분 답은 두 분수 배열 대신 가장 작은 공통분모 또는 첫 분자 하나로 응답.",
  ],
  "초5/1-5": [
    "기존 이분모 진분수·대분수 덧셈·뺄셈 및 자연수/진분수 혼합 재사용.",
  ],
  "초5/1-6": [
    "둘레·넓이·넓이 단위는 기존 도형 및 측정 담당. 이 가족에서 중복 생성하지 않음.",
  ],
  "초5/2-1": [
    "수직선에 범위를 그리기·상황에 맞는 어림 방법 고르기 제외. 끝점 조건별 개수 및 지정 자리 올림/버림/반올림 포함.",
  ],
  "초5/2-2": [
    "기존 분수×분수(대분수 포함), 분수×자연수 재사용. 가환성 역순을 새 유형으로 늘리지 않음.",
  ],
  "초5/2-3": [
    "합동·대칭 도형과 대응 길이/각은 기존 도형 담당. 작도·인식 제외.",
  ],
  "초5/2-4": [
    "기존 소수×소수 및 소수×자연수 재사용. 정수가 아닌 소수 영역과 정확한 곱 유지.",
  ],
  "초5/2-5": [
    "직육면체 구성 수치와 길이는 기존 도형 담당. 겨냥도/전개도 인식·작도 제외.",
  ],
  "초5/2-6": [
    "평균·합계·빠진 자료는 자연수 평균 영역. 가능성의 말 표현/비교는 인식 활동이며 중학교 확률 공식으로 바꾸지 않음.",
  ],
  "초6/1-1": ["기존 자연수 나눗셈→분수 및 분수÷자연수(대분수 포함) 재사용."],
  "초6/1-2": [
    "각기둥·각뿔 수치와 구성 요소는 기존 도형 소유. 이름·전개도 인식 제외.",
  ],
  "초6/1-3": [
    "기존 소수÷자연수의 정확한 유한소수 몫 재사용. 나눗셈 원리 설명·자유 어림 제외.",
  ],
  "초6/1-4": [
    "개념의 말 설명 및 크기 비교 제외. 비율·백분율·분수·소수 전환과 비교량/기준량/비율 계산 포함.",
  ],
  "초6/1-5": [
    "띠·원그래프 작도/시각 해독/적절한 그래프 선택 제외. 명시된 수치 표의 백분율·개수·남은 비율 포함. 초등에 원그래프 중심각 공식 추가하지 않음.",
  ],
  "초6/1-6": ["겉넓이·부피와 단위는 기존 도형/측정 소유. 중복 없음."],
  "초6/2-1": ["기존 분수÷분수(대분수 포함) 및 자연수÷분수 재사용."],
  "초6/2-2": [
    "기존 정확한 소수÷소수/자연수÷소수 재사용. 반올림 몫·가득 담는 개수·남는 양을 추가. 무한소수의 무제한 전개 제외.",
  ],
  "초6/2-3": [
    "쌓기나무 개수와 수치 계산은 기존 도형 담당. 방향·모양 구성/인식 제외.",
  ],
  "초6/2-4": [
    "비 두 항을 동시에 쓰는 새 답 스키마 대신 한 항이 주어진 단일 빈칸. 자연수·소수·분수의 간단한 비, 비례식 네 위치, 부분/전체 비례배분 포함.",
  ],
  "초6/2-5": [
    "원주·지름·원 넓이 수치 계산은 기존 도형 소유. 넓이 자유 어림 제외.",
  ],
  "초6/2-6": [
    "원기둥·원뿔·구 모양/전개도 인식 및 만들기 제외. 이 단원의 이름만 보고 중학교 부피 공식을 추가하지 않음.",
  ],
};
const legacy = arithmeticV2Definitions().filter((d) => !d.id.startsWith("ec-"));
const rows = grades.flatMap((grade) =>
  [
    ...new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === grade).map((u) => u.chapter),
    ),
  ].map((chapter) => {
    const match = /^(1|2)-(\d+) (.*)$/.exec(chapter)!;
    const semester = Number(match[1]),
      unit = alias(match[3]),
      key = `${grade}/${match[1]}-${match[2]}`;
    assert.ok(exclusions[key], key);
    const current = added.filter(
      (d) =>
        d.grade === grade &&
        d.curriculum?.semester === semester &&
        d.curriculum?.unit === unit,
    );
    const previous = legacy.filter((d) => {
      if (d.grade !== grade) return false;
      const p = arithmeticCurriculum(d);
      return p.semester === semester && alias(p.unit) === unit;
    });
    return {
      grade,
      semester,
      sourceChapter: chapter,
      officialUnit: unit,
      sections: CURRICULUM_UNITS.filter(
        (u) => u.grade === grade && u.chapter === chapter,
      ).map((u) => u.section),
      addedIds: current.map((d) => d.id),
      existingIds: previous.map((d) => d.id),
      exclusions: exclusions[key],
    };
  }),
);
assert.equal(rows.length, 48);
assert.equal(rows.flatMap((r) => r.addedIds).length, added.length);
const seedPath = "prisma/seed-data/units.ts";
const report = {
  date: "2026-10-15",
  scope:
    "Elementary grades 3–6 missing non-geometry calculations; append-only independent definitions. Root owns registry/UI/output integration.",
  base: "70b63ed0d",
  typographyCommit: "07129e7c6",
  sharedMetadataCommit: "7849117af",
  curriculum: {
    sources: [
      {
        url: "https://www.ebsmath.co.kr/",
        checked: "2026-10-15",
        evidence:
          "Current official elementary grade navigation; 48 units. 자료의 정리 and 규칙과 대응 are current names.",
      },
      {
        url: "https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0&m=0404",
        checked: "2026-10-15",
        evidence:
          "2022 revised curriculum phased in for grades 3–4 in 2025 and grades 5–6 in 2026.",
      },
      {
        path: seedPath,
        sha256: createHash("sha256")
          .update(readFileSync(seedPath))
          .digest("hex"),
        evidence:
          "All 48 local unit groups and their sections inspected; old chapter aliases retained as source metadata, never edited.",
      },
    ],
    limitation:
      "Unit/section-level calculation audit. Does not claim full official achievement-standard alignment, graph-reading/geometry mastery, or measured learning effects.",
  },
  totals: {
    types: added.length,
    candidates: added.reduce((n, d) => n + d.domainSize, 0),
    grades: Object.fromEntries(
      grades.map((g) => [
        g,
        {
          types: added.filter((d) => d.grade === g).length,
          candidates: added
            .filter((d) => d.grade === g)
            .reduce((n, d) => n + d.domainSize, 0),
        },
      ]),
    ),
  },
  representation: [
    "Exact rational values are canonical/reduced; public prompts explicitly request original-denominator, improper, mixed or reduced display, enforced by verify independently of calculation.",
    "Compound quantities and simplest ratios use one numeric blank; the other component is explicitly given.",
    "Rounded decimal display includes required trailing zeros, explicitly requested by public instruction.",
    "Quantities use KaTeX math numbers, roman physical units and text Korean labels. No new SVG, HTML answer kind, or shared schema.",
  ],
  verification: {
    script: "scripts/qa/arithmetic-elementary-complete.test.ts",
    checks: [
      "Exhaustive independent numeric oracle and schema validation for every candidate",
      "Global prompt identity and per-family parameter uniqueness",
      "Wrong exact/display, malformed parameters/objects, overflow, negative zero, sparse arrays, bad indices rejected",
      "Property-order neutral; frozen input and regeneration unchanged",
      "Verifier proven not to call domain.at, problemAt or calculate",
      "KaTeX prompt/answer rendering samples across every family",
      "ES2017 strict targeted TypeScript, ESLint and normal Git hooks",
    ],
    integrationBoundary:
      "Standalone definitions checked here; root registry/UI/saved-payload integration checked by root.",
  },
  units: rows,
  definitions: added.map((d) => ({
    id: d.id,
    title: d.title,
    grade: d.grade,
    curriculum: d.curriculum,
    domainSize: d.domainSize,
    domain: d.description,
  })),
};
writeFileSync(
  "scripts/qa/arithmetic-elementary-complete-report.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify({ units: rows.length, ...report.totals }));

import { writeFileSync } from "node:fs";
import { FRACTION_PREVIEW_CARDS } from "../../../src/lib/math-srs/preview/fractionCards";
import { GEOMETRY_PREVIEW_CARDS } from "../../../src/lib/math-srs/preview/geometryCards";

const cards = [...FRACTION_PREVIEW_CARDS, ...GEOMETRY_PREVIEW_CARDS];
const lines = [
  "# 초5 2학기 2·3단원 예습 카드 — 정답 없이 풀기",
  "",
  "2026-10-21 · 여덟 장의 예제 16문항과 따라 풀기 8문항. 정답·풀이·힌트·그림은 넣지 않았다. 각 문제의 답을 독립적으로 구한 뒤 리드가 카드 데이터와 대조한다.",
  "",
  "| 소단원 | 구분 | 문제 |",
  "| --- | --- | --- |",
  ...cards.flatMap((card) => [
    ...card.worked.map(
      (example, i) =>
        `| ${card.sectionId} | 예제 ${i + 1} | ${example.prompt} |`,
    ),
    `| ${card.sectionId} | 따라 풀기 | ${card.practice.prompt} |`,
  ]),
  "",
];
writeFileSync(
  "docs/planning/tracks/reports/srs-e5-preview-cards-g5-2-blind.md",
  lines.join("\n"),
);

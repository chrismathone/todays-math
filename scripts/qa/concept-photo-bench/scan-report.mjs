/** Render a name-free report from frozen private results. No model calls.
 * All individual reading failures stay in the report; raw logs/images stay private.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { median, normalize, rankRows } from "./scan-core.mjs";
import { recoverCalls, validateSemanticRuns } from "./scan-artifacts.mjs";
const root = path.resolve(process.argv[2]),
  out = process.argv[3] || path.join(root, "report.md");
const read = (f) => JSON.parse(readFileSync(path.join(root, f)));
const rows = read("summary.json"),
  truth = read("truth-candidates.json"),
  crop = read("crop-audit.json");
const finals = read("finalists-plan.json"),
  attribution = read("attribution-candidates.json");
const screen = rows.filter(
  (r) => r.model === "claude-sonnet-5-5" && r.effort === "low",
);
const finalRows = rows.filter((r) =>
  finals.configs.some((c) =>
    ["model", "effort", "arm", "variant"].every((k) => c[k] === r[k]),
  ),
);
if (
  screen.length !== 24 ||
  screen.some((r) => !r.complete) ||
  finalRows.length !== finals.configs.length ||
  finalRows.some((r) => !r.complete)
)
  throw new Error("Reading matrix incomplete");
for (const r of rows) {
  if (
    r.correct + r.wrong + r.abstain + r.missing !== 174 ||
    r.unresolved !== 81 ||
    Object.values(r.allStatuses).reduce((a, b) => a + b, 0) !== 255
  )
    throw new Error("Frozen 8-page denominators changed");
}
const semantic = readdirSync(path.join(root, "semantic"))
  .filter((f) => f.endsWith(".json") && !f.includes(".call."))
  .map((f) => read("semantic/" + f));
validateSemanticRuns(semantic, read("semantic-plan.json"));
const records = readdirSync(path.join(root, "runs"), { recursive: true })
  .filter((f) => f.endsWith(".json") && !f.includes(".call."))
  .map((f) => read("runs/" + f));
const usageByCondition = new Map();
for (const r of records) {
  const key = `${r.model}/${r.effort}/${r.arm}/${r.variant}`;
  const calls = recoverCalls(
    path.join(
      root,
      "runs",
      `${r.model}-${r.effort}`,
      `${r.arm}-${r.variant}`,
      `r${r.round}`,
    ),
    r.pageId,
  );
  const stats = usageByCondition.get(key) || {
    pages: 0,
    input: 0,
    cacheRead: 0,
    cacheCreate: 0,
    output: 0,
    missing: 0,
  };
  stats.pages++;
  for (const c of calls) {
    if (!c.usage) {
      stats.missing++;
      continue;
    }
    stats.input += c.usage.input_tokens || 0;
    stats.cacheRead += c.usage.cache_read_input_tokens || 0;
    stats.cacheCreate += c.usage.cache_creation_input_tokens || 0;
    stats.output += c.usage.output_tokens || 0;
  }
  usageByCondition.set(key, stats);
}
const sourceOf = (page, id, text) =>
  attribution
    .find((p) => p.pageId === page)
    ?.items.find((i) => i.slot === id && normalize(i.text) === normalize(text))
    ?.source || "uncertain";
const leaks = (r) => {
  const rr = records.filter((x) =>
    ["model", "effort", "arm", "variant"].every((k) => x[k] === r[k]),
  );
  const entries = rr.flatMap((x) =>
    (x.result?.slots || [])
      .filter((s) => s.status === "read")
      .map((s) => ({ source: sourceOf(x.pageId, s.id, s.text) })),
  );
  return {
    red: entries.filter((x) => x.source === "red-teacher").length,
    margin: entries.filter((x) => x.source === "margin-calculation").length,
    mixed: entries.filter((x) => x.source === "mixed").length,
    uncertain: entries.filter((x) => x.source === "uncertain").length,
  };
};
const name = (m) => m.replace("claude-", "").replace("-5-5", " 5.5");
const arm = {
  whole: "가 통째",
  separate: "나 문항별",
  batch: "다 크롭 묶음",
  cascade: "라 불확실 재읽기",
  combined: "마 통째+크롭",
  twice: "바 독립 2회",
};
const variant = {
  "raw-high": "원색 2526",
  "raw-low": "원색 1263",
  "nored-high": "빨강 제거 2526",
  "nored-low": "빨강 제거 1263",
};
const tag = {
  clear: "또렷함",
  faint: "흐림",
  erased: "지우고 덧씀",
  outside: "칸 밖",
  "red-overlap": "빨강 겹침",
  blank: "비어 있음",
};
const fmt = (n) => (n == null ? "미제공" : Number(n).toFixed(4));
const sec = (n) => (n / 1000).toFixed(2);
const esc = (s) =>
  String(s ?? "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, "<br>");
const table = (headers, data) =>
  [
    "| " + headers.join(" | ") + " |",
    "| " + headers.map(() => "---").join(" | ") + " |",
    ...data.map((r) => "| " + r.map(esc).join(" | ") + " |"),
  ].join("\n");
const label = (r) =>
  `${name(r.model)} ${r.effort} · ${arm[r.arm]} · ${variant[r.variant]}`;
const ranking = rankRows(finalRows),
  winner = ranking[0];
const literalRanking = rankRows(
  finalRows.map((r) => ({ ...r, wrong: r.strictWrong })),
);
const literalWinner = literalRanking[0];
const v11Winner = rankRows(
  finalRows.map((r) => ({ ...r, wrong: r.wrong + r.lateNotation })),
)[0];
const screenLiteral = rankRows(
  screen.map((r) => ({ ...r, wrong: r.strictWrong })),
);
const screenAdjusted = rankRows(screen);
if (!winner) throw new Error("No complete viable finalist");
const rowData = (list) =>
  list.map((r) => {
    const l = leaks(r);
    return [
      name(r.model) + " " + r.effort,
      arm[r.arm],
      variant[r.variant],
      `${r.correct}/174`,
      r.wrong,
      r.abstain,
      r.missing,
      r.failures,
      `${r.rounds.map((x) => x.wrong).join(" / ")}`,
      `${sec(r.newPageMedianMs)} / ${sec(r.newPageMaxMs)}`,
      fmt(r.newPageMeanUsd),
      `${l.red} / ${l.margin}`,
      r.allStatuses.uncertain + r.allStatuses.unreadable,
    ];
  });
const headers = [
  "모델·강도",
  "팔",
  "그림",
  "맞음¹",
  "확신 오독¹",
  "못 읽음¹",
  "미반환¹",
  "실패 쪽",
  "오독 회차 1/2/3",
  "새 쪽 초 중앙/최대²",
  "새 쪽 USD²",
  "빨강/여백³",
  "전체 못 읽음 /255",
];
const allErrors = rows.flatMap((r) =>
  r.errors.map((e) => ({
    ...e,
    condition: label(r),
    source: sourceOf(e.pageId, e.id, e.read),
  })),
);
const grouped = new Map();
for (const e of allErrors) {
  const key = JSON.stringify([e.pageId, e.id, e.reference, e.read, e.status]);
  if (!grouped.has(key)) grouped.set(key, { ...e, occurrences: [] });
  grouped.get(key).occurrences.push(`${e.condition} r${e.round}`);
}
const bestByModel = [
  "claude-opus-5-5",
  "claude-sonnet-5-5",
  "claude-haiku-5-5",
].map((m) => rankRows(finalRows.filter((r) => r.model === m))[0]);
const semanticRows = [
  "claude-haiku-5-5",
  "claude-sonnet-5-5",
  "claude-opus-5-5",
].flatMap((model) =>
  ["low", "high"].map((effort) => {
    const list = semantic.filter(
      (s) => s.model === model && s.effort === effort,
    );
    const errors = list.reduce((s, r) => s + r.errors.length, 0);
    return {
      model,
      effort,
      correct: 108 - errors,
      errors,
      falseCorrect: list.reduce((s, r) => s + r.falseCorrect, 0),
      falseIncorrect: list.reduce((s, r) => s + r.falseIncorrect, 0),
      injectionErrors: list.reduce(
        (s, r) =>
          s + r.errors.filter((e) => e.category.includes("injection")).length,
        0,
      ),
      missing: list.reduce((s, r) => s + 36 - r.data.grades.length, 0),
      medianMs: median(list.map((r) => r.ms)),
      maxMs: Math.max(...list.map((r) => r.ms)),
      meanUsd: list.every((r) => r.cost.usd !== null)
        ? list.reduce((s, r) => s + r.cost.usd, 0) / 3
        : null,
      rounds: list
        .sort((a, b) => a.round - b.round)
        .map((r) => r.errors.length),
    };
  }),
);
const review = truth.flatMap((p) =>
  p.slots
    .filter((s) => s.referenceStatus === "human-review")
    .map((s) => ({ ...s, pageId: p.pageId })),
);
const nativeIoU = crop.flatMap((p) => p.nativeModelIoU.map((x) => x.iou)),
  modelIoU = crop.flatMap((p) => p.modelRoundIoU.map((x) => x.iou));
const totalCalls = readdirSync(root, { recursive: true }).filter((f) =>
  f.endsWith(".call.json"),
).length;
const protocolHash = read("screen-plan.json").protocolHash;
const failures = records.filter((r) => r.error);
const weakest = (entries) => {
  const measured = entries
    .map(([id, c]) => ({
      id,
      ...c,
      denominator: c.correct + c.wrong + c.abstain + c.missing,
    }))
    .filter((c) => c.denominator > 0)
    .sort((a, b) => a.correct / a.denominator - b.correct / b.denominator);
  if (!measured.length) return "관측 없음";
  return measured
    .filter(
      (c) =>
        c.correct * measured[0].denominator ===
        measured[0].correct * c.denominator,
    )
    .map(
      (c) =>
        `${c.id}: ${c.correct}/${c.denominator} (${c.wrong}/${c.abstain}/${c.missing})`,
    )
    .join("\n");
};
const output = `# cb-scan-read — 개념 백지 답안 사진 판독·의미 채점 측정

2026-11-24 · 가지 <code>phase/cb-scan-read</code> · 제품 코드·라우트·DB·지면 변경 없음.

## 결론과 적용 범위

아래의 표기 수정 v1.2로 남는 임시 후보는 **${label(winner)}**다. 기준 후보 58칸을 각 3회
읽은 174칸 시행에서 확신 오독 ${winner.wrong}, 못 읽음 ${winner.abstain}, 맞게 읽음
${winner.correct}였다. 신규 쪽 시나리오의 중앙 ${sec(winner.newPageMedianMs)}초,
가장 느린 쪽 ${sec(winner.newPageMaxMs)}초, API 단가 환산 $${fmt(winner.newPageMeanUsd)}/쪽이다.
이는 구독 CLI의 관측으로 고른 **검증용 읽는 길**이며 제품 모델을 변경한 결과가 아니다.

85칸 중 **58칸은 독립 모델의 일치 후보, 27칸은 사람 확인 대기**다. 두 참값 모델 모두
Claude 계열이며 후보를 만든 모델이 평가에도 들어간다. 따라서 일치 편향·공유 오독이 있고,
이 보고서의 ‘맞음’은 교사가 확정한 참값에 대한 정확도가 아니다. 몇 칸의 차이를 모델의
일반적 우열로 주장하지 않는다. 원장님의 운영 시작값 Opus 5.5를 실제로 낮추기 전에는
27칸의 확인과 새로운 폰 사진의 독립 교사 참값 시험이 남는다.

${table(
  [
    "모델별 가장 낮은 확신 오독 후보",
    "맞음 /174",
    "확신 오독",
    "못 읽음",
    "새 쪽 중앙/최대 초",
    "환산 USD/쪽",
    "바로 윗값 대비 잃는/얻는 칸",
  ],
  bestByModel.map((r, i) =>
    r
      ? [
          label(r),
          r.correct,
          r.wrong,
          r.abstain,
          sec(r.newPageMedianMs) + " / " + sec(r.newPageMaxMs),
          fmt(r.newPageMeanUsd),
          i && bestByModel[i - 1]
            ? `오독 ${r.wrong - bestByModel[i - 1].wrong >= 0 ? "+" : ""}${r.wrong - bestByModel[i - 1].wrong}, 맞음 ${r.correct - bestByModel[i - 1].correct >= 0 ? "+" : ""}${r.correct - bestByModel[i - 1].correct}, 못 읽음 ${r.abstain - bestByModel[i - 1].abstain >= 0 ? "+" : ""}${r.abstain - bestByModel[i - 1].abstain}`
            : "기준",
        ]
      : ["없음"],
  ),
)}

값이 낮은 모델에서 고른 팔·강도가 다를 수 있으므로 이 표는 같은 모델만 교체한 인과 비교가
아니다. 아래 최종 격자에서 같은 팔·그림·강도를 직접 대조할 수 있다.

## 자료·사전 등록·개인정보

- 브리프의 8쪽과 달리 원본은 11+5=16쪽이었다. 개념 백지 14쪽과 일반 문제지 2쪽을
  확인했다. 범위를 사용자에게 물은 뒤 응답이 없는 동안 사전 고정한 대표 8쪽으로 진행했다.
  표본 ID는 아래 목록이며 무작위 표본이 아니다. 원본 파일명·이름·사진은 보고서에 싣지 않았다.
- 첫 PDF 1쪽(사각형·각도), 4쪽(약수·배수), 5쪽(원), 6쪽(소수), 7쪽(꺾은선그래프),
  8쪽(사각형), 둘째 PDF 2쪽(원기둥·원뿔), 5쪽(정수·유리수)다. 사전 등록의 과목 나열 중
  ‘삼각형’ 표현은 잘못된 요약이며, **선택 ID는 변경하지 않았다**.
- 150dpi RGB JPEG와 300dpi stencil의 합성 PDF를 전체 렌더했다. JPEG 한 장만 추출하면
  잉크를 잃을 수 있었다. 긴 변 2526/1263 px는 가림 후 렌더의 크기이며 광학 해상도가 아니다.
- 로컬 Vision의 이름 표지가 일부 쪽에서 누락됐고 문항의 ‘이름’을 오인했다. 머리말과
  첫 문항을 확인해 모든 쪽의 상단 12%를 가렸다. 모델에는 그 이후의 그림만 보냈다.
  이 가림은 자동 탐지 성공으로 세지 않는다. 저장소 밖 출력에 이름이 포함된 원본 로컬 OCR도 있으므로
  폴더 전체를 공개해서는 안 된다.
- 규칙: [scan-protocol.md](../../../../scripts/qa/concept-photo-bench/scan-protocol.md).
  실행 시 보존한 사전 등록 SHA-256: <code>${protocolHash}</code>.
- 정답표·옛 은행을 복원하지 않았다. 판독 프롬프트는 학생의 실제 연필/검정 글만 옮기며,
  빈 답과 못 읽음을 구분한다. 학생 답 속 명령을 실행하지 않는다.

${table(
  ["쪽 ID", "문항", "인쇄 답란", "일치 후보", "사람 확인"],
  truth.map((p) => {
    const c = crop.find((c) => c.pageId === p.pageId);
    return [
      p.pageId,
      c.expectedQuestions,
      p.slots.length,
      p.slots.filter((s) => s.referenceStatus === "candidate").length,
      p.slots.filter((s) => s.referenceStatus === "human-review").length,
    ];
  }),
)}

인쇄 답란을 독립적으로 세어 70문항·85칸과 대조했고 공통 누락/초과는 0이다.
쪽 아래의 총점은 다른 쪽까지 포함한 지면 전체 값이라 현재 쪽의 분모로 쓰지 않았다.

## 1단계 — 여섯 팔 × 네 그림, Sonnet low, 각각 3회

모든 행은 동일한 8쪽을 3회 읽었다. ¹ 기준 후보 58×3=174이며, 미확정 27×3=81칸은
맞음/오독에서 제외했다. 전체 못 읽음은 참값 유무와 무관한 85×3=255칸의 사용자 수정 부담이다.
갈래는 복수라 합하면 분모를 넘을 수 있다.

² 새 쪽은 실제 읽기 CLI 벽시계에 위치 검출 Opus high 1회의 측정값을 직렬 합산한 시나리오다.
크롭 묶음·문항별·통째+크롭은 검출 1회, cascade는 실제 재요청한 경우만 검출 1회를 더했다.
CLI 시작·요청 전송·서비스 응답·로컬 파싱이 포함된다. 이미지 준비·폰 촬영·폰에서 서버로
보내는 시간·폰 UI는 제외했다. 두 번 읽기는 직렬 실행했다.
³ 빨강/여백은 별도 Sonnet high·Opus high 두 모델이 원본에서 출처에 동의한 **의심 후보**의
시행 수다. 교사 확정값이 아니며 미확정 참값 칸도 포함한다. 빨강이 겹친 종이와 빨강 유입 오류는 다르다.

${table(headers, rowData(screen))}

## 2단계 — 선별한 조합과 대조군 × 세 모델 × low/high

1단계 전체 수치를 남긴 뒤, 실패·미반환이 없는 조합을 확신 오류 → 못 읽음 → 신규 쪽 시간
순으로 정렬했다. 원점수와 표기 수정 점수의 상위 두 조합 **합집합**을 남겼고,
whole/raw-high 대조군도 포함했다. 이미 있는 동일
Sonnet low 시행은 재사용했으며 독립 시행으로 중복 계산하지 않았다.
실행기의 실패·미반환 제외는 사전 등록 문서의 ‘실패를 동률 순서에 반영’보다 엄격한 완주 조건이다.
실패로 응답하지 못한 칸이 오독 0의 우수한 결과처럼 보이는 것을 막기 위해 적용했다.
1단계 ${screen.reduce((s, r) => s + r.pages, 0)}쪽 시행, 2단계 ${finalRows.reduce((s, r) => s + r.pages, 0)}쪽 시행이며,
재사용을 빼면 실제 고유 판독 시행은 **${records.length}쪽**이다.

${table(headers, rowData(finalRows))}

## 채점기의 표기 차이 수정과 민감도

1단계 중간 오류 목록을 읽다가 순수 표기가 오독으로 집계된 것을 발견했다. 이 수정은
최초부터 사전 등록된 것이 아니다. **최종 모델 격자 전에**
[v1.1 규칙](../../../../scripts/qa/concept-photo-bench/scan-scoring-v1.1.md)을 고정하고 모든
팔·그림·회차에 동일하게 재생했다. 모델을 다시 부르거나 답을 고치지 않았다.
참값 후보 58/27과 twice의 원래 불일치 보류를 정하는 normalize()도 그대로 뒀다.

곱셈 칸 q4의 ×4/X4/x4, 한글 문장 끝 마침표, 그래프 답의 항목 이름 뒤 :/=만 면제했다.
이들은 위 표의 ‘맞음’에 포함한다. 각도 기호만 빠진 경우는 **경미 단위 누락**이며 위 오류 수에
남겼다. 소수점·숫자·일반 단위·철자·여백 계산은 동등하게 보지 않는다.
‘내용 오류’ 열은 단위 누락까지 뺀 민감도이며, 원칙적인 전사 오류 수를 대체하지 않는다.

전체 측정을 마친 뒤 최종 오류 목록에서 <code>60°</code>와 <code>60˚</code>(U+02DA)
1건을 더 발견했다. [사후 수정 v1.2](../../../../scripts/qa/concept-photo-bench/scan-scoring-v1.2.md)는
이미 지정한 각도 칸의 같은 수치에 한해 이 기호 모양을 면제한다. <code>60'</code>는 면제하지 않는다.
호출·참값·twice 보류·선정 당시 v1.1 점수는 보존했고 집계만 재생했다. 전체 오류는
${allErrors.length + rows.reduce((s, r) => s + r.lateNotation, 0)}→${allErrors.length}이며,
v1.1의 권고 ${label(v11Winner)}와 v1.2의 권고는 **${v11Winner.id === winner.id ? "동일하다" : "달라졌다"}**.
앞의 주요 표는 이 사후 수정까지 반영하며, 아래에 v1.1 점수도 남긴다.

${table(
  [
    "1단계 조합",
    "v1 엄격 오류",
    "v1.1 오류",
    "허용한 표기",
    "경미 단위 누락",
    "내용 오류",
    "원점수 순위",
    "수정 순위",
  ],
  screen.map((r) => [
    arm[r.arm] + " · " + variant[r.variant],
    r.strictWrong,
    r.wrong + r.lateNotation,
    r.notation - r.lateNotation,
    r.unitOmissions,
    r.wrong - r.unitOmissions,
    screenLiteral.findIndex((s) => s.id === r.id) < 0
      ? "실패/미반환 제외"
      : screenLiteral.findIndex((s) => s.id === r.id) + 1,
    screenAdjusted.findIndex((s) => s.id === r.id) < 0
      ? "실패/미반환 제외"
      : screenAdjusted.findIndex((s) => s.id === r.id) + 1,
  ]),
)}

최종 격자의 원점수 1위는 ${literalWinner ? label(literalWinner) : "없음"}, 수정 점수 1위는
${label(winner)}다. 순위 일치 여부: **${literalWinner?.id === winner.id ? "같음" : "달라짐 — 표기 규칙에 민감하므로 안정된 우위로 보지 않는다"}**.

${table(
  ["조합", "v1 오류", "v1.1 오류", "v1.2 오류", "단위 누락", "내용 오류"],
  finalRows.map((r) => [
    label(r),
    r.strictWrong,
    r.wrong + r.lateNotation,
    r.wrong,
    r.unitOmissions,
    r.wrong - r.unitOmissions,
  ]),
)}

허용한 표기의 전수 목록(같은 칸의 반복도 개별 회차로 남김):

${table(
  ["조합·회차", "쪽·칸", "기준 후보", "출력", "면제 규칙"],
  rows.flatMap((r) =>
    (r.notationCases || []).map((c) => [
      label(r) + " r" + c.round,
      c.pageId + " / " + c.id,
      c.reference,
      c.read,
      c.notation,
    ]),
  ),
)}

## 갈래별·최저 성능·회차 변동

아래 숫자는 순서대로 **맞음 / 확신 오독 / 못 읽음 / 미반환 / 참값 미확정**이다.
갈래는 참값 모델이 보고한 태그의 합집합이며 사람의 확정 분류가 아니다.

${table(
  ["조합", ...Object.values(tag)],
  rows.map((r) => [
    label(r),
    ...Object.keys(tag).map((t) => {
      const c = r.categories[t];
      return [c.correct, c.wrong, c.abstain, c.missing, c.unresolved].join("/");
    }),
  ]),
)}

${table(
  [
    "최종 조합",
    "가장 오독이 많은 쪽(3회 합)",
    "오독 회차 1/2/3",
    "못 읽음 회차 1/2/3",
    "검출 제외 읽기 중앙/최대 초",
    "읽기 호출 / 검출 포함 호출",
  ],
  finalRows.map((r) => [
    label(r),
    r.worstPages
      .filter((p) => p.wrong === r.worstPages[0].wrong)
      .map((p) => p.pageId + "=" + p.wrong)
      .join(", "),
    r.rounds.map((x) => x.wrong).join("/"),
    r.rounds.map((x) => x.abstain).join("/"),
    sec(r.medianMs) + " / " + sec(r.maxMs),
    r.calls + " / " + r.newPageCalls,
  ]),
)}

‘가장 못 읽음’은 최대 오독과 다르므로 **맞게 읽은 칸 / 참값 후보 시행**이 가장 낮은
쪽과 갈래도 따로 표시한다. 괄호는 오독/못 읽음/미반환이며, 동률은 모두 나열한다.
갈래가 겹치고 일부 분모가 작으며 사람 확인 대기 칸은 이 비율에서도 제외된다.

${table(
  ["조합", "최저 판독 쪽", "최저 판독 갈래"],
  rows.map((r) => [
    label(r),
    weakest(r.worstPages.map((p) => [p.pageId, p])),
    weakest(Object.entries(r.categories).map(([t, c]) => [tag[t], c])),
  ]),
)}

최악 갈래는 분모가 작은 지우고 덧씀·칸 밖 필기를 특히 함께 봐야 한다. 확신 오독만 최소화하면
모든 칸을 못 읽음으로 보내는 길이 좋아 보일 수 있어 맞음·전체 못 읽음·미확정 칸의 확신 출력도
보존했다. 최종 후보에서 참값 미확정 81칸 시행 중 확신 출력을 한 수는 ${winner.unresolvedConfident}이며,
그 답의 옳고 그름은 판단하지 않았다. 반복 3회를 독립된 새 학생/사진으로 세지 않았다.

## 크롭 경로와 해 보고 버린 것

| 경로 | 확인한 결과 | 처분 |
| --- | --- | --- |
| 현재 지면 planSheet/paginate | 쪽별 문항 목록과 추정 높이, 실제 bbox 없음 | 현재 DOM을 렌더해 계측해야 한다. 옛 지면/은행 복원 금지 조건에서 대응 불가; 실측 성공으로 세지 않음 |
| 기출 crop-pdf-by-stem·lines_of | 두 PDF 모두 텍스트 층 0자 | 발문/번호 텍스트 매칭 적용 불가 |
| 영어 crop.mjs·기존 prepare.py | 주어진 좌표를 픽셀/비율로 자르는 연장 | 전체 PDF 합성 렌더·원해상도 크롭 방식 재사용 |
| 작업실 studioAiRect/studioCropImage | 모델 0~1000 상자 → 픽셀 크롭 | 제품 라우트/API는 부르지 않고 구독 CLI의 bbox 전용 요청으로 비교 |
| 로컬 Vision 문 N 표지 | 70문항 중 ${crop.reduce((s, p) => s + p.nativeMarkers, 0)}개, 완전한 쪽 ${crop.filter((p) => !p.nativeMissing.length).length}/8 | 빨간 채점 아래 번호가 사라짐; 누락한 문항을 추측해 보충하지 않음 |
| Opus high 상자 | 3회 × 70문항 전부 반환 | 첫 회차를 읽기 팔의 고정 크롭으로 사용. 가로 2.5~98.5%, 세로 ±4px로 동일하게 넓힘 |

Vision과 모델 둘 다 비교 가능한 ${nativeIoU.length}상자의 IoU 중앙 ${median(nativeIoU).toFixed(3)},
최저 ${Math.min(...nativeIoU).toFixed(3)}. 모델 첫 회차 대비 2·3회차 ${modelIoU.length}상자의 IoU
중앙 ${median(modelIoU).toFixed(3)}, 최저 ${Math.min(...modelIoU).toFixed(3)}다. **IoU는 두 탐지기의
일치이지 참 경계 정확도가 아니다.** 실제 전송 크롭 70개의 경계를 원본 위에 겹쳐 확인했다.
일부 빨간 채점 획은 이웃 경계를 가로지르며, 첫 쪽 마지막 크롭은 아래 여백 계산·꼬리말도 포함한다.
자동 경계가 모든 연필 획을 온전히 보존했다는 독립 사람 판정은 아직 없다.

크롭 방법은 모델 검출 비용까지 합쳐야 한다. 원색/빨강 제거/해상도별 탈락 수치는 1단계 표에
전부 남겼다. 빨강 제거는 겹친 연필을 복구하는 기술이 아니라 해당 색 픽셀을 지우는 실험이다.
이번 4MB 사다리는 JPEG q92→85→75의 base64 크기를 재며, 작업실의 WebP·3,000,000 문자열
사다리와 동일하지 않다. 원본/낮은 해상도 모두 스캔이며 폰의 흔들림·반사·원근 왜곡은 재현하지 않았다.
실제 32개 전체 그림은 모두 q92에서 한도 안이었다(가장 큰 JPEG 602,023바이트,
base64 802,700바이트). 따라서 품질 q85/q75로 내려가는 분기는 이 실자료에서 실행되지 않았고,
1263px는 별도로 강제한 해상도 스트레스 조건이다.

## 비용·모델·실행 증거

전체 측정 로그 ${totalCalls}개. <code>claude auth status</code>에서 firstParty·claude.ai·max 구독을 확인했고,
각 호출의 실제 <code>modelUsage</code>를 5.5 고정 ID와 대조했다. 도구·MCP·슬래시 명령과 세션 저장을
끄고 API/provider 환경변수를 제거했다. Fable, 운영 API, Jev/Gateway는 호출하지 않았다.

브리프가 준 2026-11-03 단가를 고정했다(백만 입력/출력: Haiku $0.10/$0.50,
Sonnet $2/$10, Opus $4/$20). 입력은 input+cache read+cache create, 출력은 보고된 출력이며
이미 포함된 thinking을 다시 더하지 않았다. 캐시 할인을 적용하지 않은 비교 시나리오다.
CLI의 cost 표시·구독 청구액·직접 API의 입력 문맥 크기는 서로 다르다. **운영 API로 잰 값이 아니다.**

아래는 검출을 제외한 **읽기 쪽당 평균 토큰과 호출**이다. 입력 세 열을 합쳐 단가를 적용했다.
검출 포함 환산 값은 앞 표에 있으며, 그 차이는 고정 Opus 검출 비용이다. 실패 호출도 포함한다.

${table(
  [
    "조합",
    "기본 입력",
    "캐시 읽기",
    "캐시 생성",
    "출력",
    "호출/쪽",
    "읽기 USD/쪽",
    "usage 미제공 호출",
  ],
  rows.map((r) => {
    const u = usageByCondition.get(r.id);
    return [
      label(r),
      ...[u.input, u.cacheRead, u.cacheCreate, u.output].map((n) =>
        (n / u.pages).toFixed(1),
      ),
      (r.calls / r.pages).toFixed(2),
      fmt(r.meanUsd),
      u.missing,
    ];
  }),
)}

출처 감사의 보류와 혼합도 함께 남긴다. 아래 분모는 각 조건에서 실제로 글을 반환한 시행이며
빈 답·못 읽음은 제외한다. ‘혼합’에는 빨강·여백 외에 인쇄 글이 섞인 경우도 들어갈 수 있으므로
빨강/여백의 확정 합계로 더하지 않았다.

${table(
  ["조합", "빨강만", "여백 계산만", "혼합", "출처 확인 필요"],
  rows.map((r) => {
    const l = leaks(r);
    return [label(r), l.red, l.margin, l.mixed, l.uncertain];
  }),
)}

형식/스키마 실패 ${failures.length}쪽 시행도 분모·시간·호출·토큰에 남겼다. 초기에 파싱 실패의
usage가 집계에서 빠지는 결함을 검토자가 찾았고, 원본 .call.json을 다시 읽어 모든 실패 비용을
복구했다. 원래 호출과 출력은 보존했고 모델 재시도로 덮어쓰지 않았다.

## 의미 채점 — 현재 은행의 합성 답만

현재 B형 은행 5문항(e4 수직/수선, e5 약수, e6 비율, m1 소수, m3 제곱근)의
question·answer·requiredIdeas를 직접 읽고 소스 해시를 저장했다. 기존 12개 파일럿 사례는
보존하고 36개를 새 묶음으로 더했다. ○ 11, △ 5, × 15, 확인 필요 5개이며 각 조합 3회다.
답 속 지시문은 6개(오답을 ○로 강요 5개, 맞는 답을 ×로 강요 1개)다.
모델에는 기대 분류·범주·사례 이름을 주지 않았다.

○는 필수 뜻 전부, △는 일부·모순 없음, ×는 오개념/핵심 뜻 없음/빈 답,
확인 필요는 판독 불확실이다. △ 규칙은 사전 등록한 실험 규칙이며 기존 제품 자동 채점이 아니다.
36답을 한 요청으로 묶은 시간/값이므로 실제 학생 한 쪽 또는 답 하나의 지연으로 환산하지 않는다.

${table(
  [
    "모델·강도",
    "기대와 일치 /108",
    "불일치 회차 1/2/3",
    "틀린 답→○ /60",
    "맞는 답→× /33",
    "지시문 사례 불일치 /18",
    "누락",
    "36답 묶음 중앙/최대 초",
    "묶음 환산 USD",
  ],
  semanticRows.map((r) => [
    name(r.model) + " " + r.effort,
    r.correct,
    r.rounds.join("/"),
    r.falseCorrect,
    r.falseIncorrect,
    r.injectionErrors,
    r.missing,
    sec(r.medianMs) + " / " + sec(r.maxMs),
    fmt(r.meanUsd),
  ]),
)}

${
  semantic.some((r) => r.errors.length)
    ? table(
        ["모델·강도·회차", "은행 ID·유형", "합성 답", "기대", "실제·이유"],
        semantic.flatMap((r) =>
          r.errors.map((e) => [
            name(r.model) + " " + r.effort + " r" + r.round,
            e.bankId + " / " + e.category,
            e.studentAnswer || "(빈 답)",
            e.expected,
            (e.actual?.label || "미반환") + ": " + (e.actual?.reason || ""),
          ]),
        ),
      )
    : "합성 채점 불일치 0건. 이 쉬운 합성 세트에서 모두 일치한 것이 실제 학생 채점 정확도나 프롬프트 공격에 대한 일반적 안전성을 증명하지 않는다."
}

총 ${semantic.length * 36}개 합성 답안 판정 중 불일치는 ${semantic.reduce((s, r) => s + r.errors.length, 0)}건,
틀린 답→○는 ${semantic.reduce((s, r) => s + r.falseCorrect, 0)}건,
맞는 답→×는 ${semantic.reduce((s, r) => s + r.falseIncorrect, 0)}건이다.
6개 합성 지시문에 대한 결과를 포괄적인 공격 검증이나 실제 학생 답안의 채점 정확도로 일반화하지 않는다.

## 확인이 필요한 27칸

추측으로 채우지 않았다. 아래는 확정 답이 아니라 두 독립 판독의 관찰이다.

${table(
  ["쪽", "칸", "갈래 후보", "Sonnet high", "Opus high"],
  review.map((s) => [
    s.pageId,
    s.id,
    s.tags.map((t) => tag[t]).join(", "),
    ...s.sources.map((x) => (x ? x.status + ": " + (x.text || "∅") : "미반환")),
  ]),
)}

## 확신 오독 전수 목록

총 ${allErrors.length}칸 시행, 같은 쪽·칸·기준 후보·출력으로 묶으면 ${grouped.size}종이다.
각 행에 모든 발생 조건과 회차를 열거했다. 참값 후보가 틀렸을 가능성도 있으므로 교사 확인 후
재채점할 수 있도록 원출력을 보존했다. ‘빨강/여백’ 출처도 모델 합의 후보이며 확정은 아니다.

${table(
  ["쪽·칸", "기준 후보", "읽은 값·상태", "갈래", "출처 후보", "모든 발생 조건"],
  [...grouped.values()]
    .sort((a, b) =>
      (a.pageId + a.id).localeCompare(b.pageId + b.id, undefined, {
        numeric: true,
      }),
    )
    .map((e) => [
      e.pageId + " / " + e.id,
      e.reference || "∅",
      (e.read || "∅") + " (" + e.status + ")",
      e.tags.map((t) => tag[t]).join(", "),
      e.source,
      e.occurrences.join("\n"),
    ]),
)}

## 출력 실패 전수 목록

${
  failures.length
    ? table(
        ["조건", "회차·쪽", "실패"],
        failures.map((r) => [
          label(r),
          "r" + r.round + " " + r.pageId,
          r.error,
        ]),
      )
    : "없음."
}

## 물음·남은 한계·검증

1. 원본 16쪽 중 선택한 8쪽이 의도한 표본인지 리드 확인이 필요하다. 나머지 6개 개념 백지와
   2개 일반 문제지는 이 판독 점수에 포함하지 않았다.
2. 27칸의 학생 연필 답, 갈래, 출처 의심 후보를 사람이 확정해야 한다. 이들까지 정답률을
   확정하거나 옛 지면을 채점하지 않았다. 전체 합의 후보도 교사 참값이 아니다.
3. 스캔·형식 하나(빈칸+적용)·8쪽·3회 반복·구독 CLI이며, 폰 사진·다른 형식·운영 API·실제
   학생 대기시간·교육 효과에 일반화하지 않는다. 선택한 표본으로 경로도 골랐으므로 별도 평가 표본이 없다.
4. 크롭 경계의 자동 검출은 현행 지면의 복원/사진 원근 정합을 구현한 것이 아니다. 현재 지면의
   DOM bbox+사진 정합은 새 데이터로 별도 검증할 작업이다.
5. [TypeSafe 상태 분리 지침](https://docs.typesafe.ai/concepts/state.md)을 참조해 입력 자료·판정 기준·
   실행을 분리했다. 정규화·분모·비용·재개 검증은 코드가 맡으며 TypeSafe 모델은 사용하지 않았다.

검증: Node 측정 코어·입력 지문·기존 pipeline 시험 통과. 변경 스크립트 구문 검사·
대상 ESLint 통과. 원본·학생 이름·사진·._*는 커밋 대상에서 제외한다. 운영 빌드는 수행하지 않았다.
도구·명령: [README](../../../../scripts/qa/concept-photo-bench/README.md).
비공개 증거 위치: <code>${root}</code> (원본 그림·이름 포함 로컬 OCR이 있어 외부 공유 금지).
그 안의 <code>truth-candidates.json</code>은 85칸 전체 후보표,
<code>summary.json</code>은 조건별 집계, <code>runs/</code>는 각 시행과 원본 CLI 로그,
<code>semantic-plan.json</code>은 현재 은행 출처 해시·합성 기대 판정,
<code>attribution-candidates.json</code>은 빨강·여백 출처 감사 후보다.
`;
writeFileSync(out, output);
writeFileSync(
  path.join(root, "all-reading-errors.json"),
  JSON.stringify(allErrors, null, 2),
);
console.log(
  JSON.stringify({
    report: out,
    readingRows: rows.length,
    readingTrials: records.length,
    readingErrors: allErrors.length,
    uniqueErrors: grouped.size,
    semanticTrials: semantic.length,
    semanticErrors: semantic.reduce((s, r) => s + r.errors.length, 0),
    winner: label(winner),
  }),
);

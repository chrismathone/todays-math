import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { summarize } from "./pipeline.mjs";

const [outputArg] = process.argv.slice(2);
if (!outputArg)
  throw new Error("Usage: node pipeline-report.mjs pipeline-output-dir");
const output = path.resolve(outputArg);
const plan = JSON.parse(await readFile(path.join(output, "plan.json"), "utf8"));
const records = [];
for (const trial of plan.planned) {
  try {
    const row = JSON.parse(
      await readFile(path.join(output, `${trial.trialId}.json`), "utf8"),
    );
    if (row.fingerprint !== plan.fingerprint)
      throw new Error("Mismatched trial fingerprint");
    records.push(row);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
const summary = summarize(records, plan.planned);
const photoCount = new Set(plan.planned.map((r) => r.caseId)).size;
const repeatCount = new Set(plan.planned.map((r) => r.repeat)).size;
const longest = records.toSorted((a, b) => b.totalMs - a.totalMs)[0];
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const seconds = (n) => (n == null ? "—" : `${(n / 1000).toFixed(2)}초`);
const percent = (n) => (n == null ? "—" : `${n.toFixed(1)}%`);
const armNames = { A: "Gemini 판독 + 채점", B: "Gemini 판독 → Jev 채점" };
const gradeNames = {
  correct: "정답",
  incorrect: "오답",
  blank: "미작성",
  review: "확인 필요",
};
const interval = summary.paired.meanDeltaClusterBootstrap95Ms;
const comparison = summary.paired.aggregateReductionPercent;
const verdict = !summary.complete
  ? "측정 진행 중"
  : interval && interval[0] <= 0 && interval[1] >= 0
    ? "일관된 속도 개선을 확인하지 못했습니다."
    : comparison > 0
      ? "이번 표본에서는 분리 방식이 더 빨랐습니다."
      : "이번 표본에서는 분리 방식이 더 느렸습니다.";
const table = Object.entries(summary.byArm)
  .map(
    ([arm, s]) =>
      `<tr><th>${arm}: ${armNames[arm]}</th><td>${s.completed}/${s.attempted}</td><td>${seconds(s.medianMs)}</td><td>${seconds(s.meanMs)}</td><td>${seconds(s.p90Ms)}</td><td>${s.gradeMatches}/${s.attempted}</td><td>${s.exactReadingMatches}/${s.attempted}</td><td>${s.reviewCount}</td><td>${s.errors}</td></tr>`,
  )
  .join("");
const caseRows = summary.perCase
  .map(
    (c) =>
      `<tr><th>${esc(c.caseId)}</th><td>${c.count}</td><td>${seconds(c.meanDeltaMs)}</td><td>${c.bFaster}/${c.count}</td></tr>`,
  )
  .join("");
const details = records
  .map(
    (r) =>
      `<tr><td>${r.sequence}</td><th>${esc(r.caseId)}<small>반복 ${r.repeat} · ${r.position === 0 ? "먼저" : "나중"}${r.labelUncertain ? " · 라벨 불확실" : ""}</small></th><td>${r.arm}</td><td>${seconds(r.totalMs)}</td><td>${seconds(r.geminiMs)}</td><td>${r.arm === "B" ? seconds(r.jevMs) : "—"}</td><td class="${!r.error && r.gradeMatch ? "pass" : "fail"}">${r.error ? "오류" : `${gradeNames[r.grade]} · ${r.gradeMatch ? "일치" : "불일치"}`}</td><td><details><summary>판독 보기</summary><pre>${esc(JSON.stringify(r.photo ?? { error: r.error }, null, 2))}</pre><p>기준: ${esc(gradeNames[r.expectedGrade])} · 판독 ${esc(JSON.stringify(r.expectedReading))}</p></details></td></tr>`,
  )
  .join("");
const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gemini · Jev 채점 속도 비교</title>
<style>body{font:15px/1.6 system-ui,sans-serif;color:#17202c;background:#f5f7fa;margin:0}main{max-width:1280px;margin:auto;padding:38px 26px 80px}h1{font-size:32px;margin:6px 0 12px}h2{font-size:21px;margin-top:0}p{max-width:1000px}header{margin-bottom:28px}.eyebrow{color:#4a657b;letter-spacing:.07em;font-size:12px}section{background:white;border:1px solid #dfe5ec;border-radius:10px;padding:24px;margin:18px 0}.scroll{overflow:auto}table{width:100%;border-collapse:collapse;white-space:nowrap}th,td{text-align:left;border-bottom:1px solid #e7ebef;padding:12px 10px}thead{color:#4b596c;font-size:13px}tbody th{font-weight:500}small{display:block;color:#627086;font-size:12px}pre{white-space:pre-wrap;max-width:440px;font-size:12px}details{white-space:normal;min-width:100px}summary{cursor:pointer;color:#275f96}.pass{color:#267445}.fail{color:#ae3131}.stat{font-size:26px;font-weight:650;margin:8px 0}.muted{color:#617084}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.grid p{margin:0}li{margin:8px 0}@media(max-width:700px){main{padding:20px 12px}.grid{grid-template-columns:1fr}h1{font-size:26px}section{padding:16px}}</style>
<main><header><div class="eyebrow">CONCEPT PHOTO PILOT · 2026-10-02</div><h1>사진 채점, Jev를 붙이면 빨라질까?</h1><p>${verdict} 같은 사진 ${photoCount}장 × 방식별 ${repeatCount}회, Antigravity 구독 CLI의 <code>${summary.model}</code>를 사용했습니다. B의 마지막 채점만 TypeSafe 직접 API(${esc(summary.jevModels.join(", "))})입니다.</p><p class="muted">${summary.attempted}/${summary.planned}회 완료 · 사진 판독과 선택 번호 채점 실험 · 교사 검증 전 임시 기준</p></header>
<section><div class="grid"><div><p>쌍별 평균 시간 차이 (B − A)</p><div class="stat">${seconds(summary.paired.meanDeltaMs)}</div><small>양수면 Jev 분리 방식이 더 느림</small></div><div><p>같은 쌍의 전체 시간 절감률</p><div class="stat">${percent(comparison)}</div><small>음수면 시간 증가</small></div><div><p>B가 더 빨랐던 비교</p><div class="stat">${summary.paired.bFaster}/${summary.paired.count}</div><small>사진 단위 95% 부트스트랩 구간: ${interval ? `${seconds(interval[0])} ~ ${seconds(interval[1])}` : "미산출"}</small></div></div></section>
<section><h2>전체 시간과 판정</h2><div class="scroll"><table><thead><tr><th>방식</th><th>성공/시도</th><th>중앙값</th><th>평균</th><th>90백분위</th><th>채점 일치</th><th>판독 일치</th><th>검토 요청</th><th>오류</th></tr></thead><tbody>${table}</tbody></table></div><p>Jev 자체 중앙값: <strong>${seconds(summary.byArm.B.medianJevMs)}</strong>. 최종 시간을 줄이려면 Gemini에 채점을 덜 시켜 절약되는 시간이 이 추가 호출보다 커야 합니다.</p><p>가장 느린 시도: ${esc(longest?.trialId)} · 전체 ${seconds(longest?.totalMs)}, Gemini ${seconds(longest?.geminiMs)}, Jev ${seconds(longest?.jevMs)}. 이 결과도 모두 포함했습니다.</p></section>
<section><h2>측정 조건과 한계</h2><ul><li>사진별 A/B를 연속으로 실행하고 먼저 실행하는 방식을 교대했습니다. 각 호출은 새 이미지·프롬프트 전용 폴더를 사용하며 호출을 동시에 돌리지 않았습니다.</li><li>같은 컴퓨터에서 별도 코드 검증도 진행했으며 시스템 부하와 제공자 대기열은 통제하지 않았습니다. 타이머는 이미지 준비 직전부터 최종 판정 파싱까지입니다. CLI 시작·이미지 도구·어댑터 로그 저장이 포함되며 실제 Gemini API 지연과 다릅니다. 시험지 준비와 결과 보고서 저장 시간은 제외합니다.</li><li>A에는 정답표를 함께 주고 B는 Gemini 판독 후 Jev에만 정답표를 줍니다. 기대 판정 라벨은 어느 모델에도 보내지 않았으며 모델이 낸 판정을 코드로 교정하지 않았습니다.</li><li>실패는 성공률 분모에 포함하고, 시간 차이는 두 방식이 모두 성공한 쌍만 계산했습니다. 재시도는 하지 않았습니다.</li><li>같은 사진을 ${repeatCount}회씩 읽었습니다. 독립된 사진 수는 ${photoCount}장입니다. 신뢰구간은 사진 단위로 반복을 묶어 재추출한 소표본 참고치입니다.</li><li>불확실한 미작성 라벨 1장 제외 시 채점 일치: A ${summary.byArm.A.excludingUncertain.gradeMatches}/${summary.byArm.A.excludingUncertain.attempted}, B ${summary.byArm.B.excludingUncertain.gradeMatches}/${summary.byArm.B.excludingUncertain.attempted}. 제외 시 평균 시간 차이 ${seconds(summary.pairedExcludingUncertain.meanDeltaMs)}.</li><li>선택 번호 비교는 일반 코드만으로도 됩니다. 이 결과는 개념 서술형의 의미 채점·부분점수 정확도나 속도를 입증하지 않습니다. 실제 청구 금액은 측정하지 않았습니다.</li></ul></section>
<section><h2>사진별 비교</h2><div class="scroll"><table><thead><tr><th>사진</th><th>성공한 쌍</th><th>평균 시간 차이 (B − A)</th><th>B가 더 빠름</th></tr></thead><tbody>${caseRows}</tbody></table></div></section>
<section><h2>모든 시도</h2><div class="scroll"><table><thead><tr><th>순서</th><th>사진 / 반복</th><th>방식</th><th>전체</th><th>Gemini</th><th>Jev</th><th>판정</th><th>근거</th></tr></thead><tbody>${details}</tbody></table></div></section></main></html>`;
await writeFile(path.join(output, "report.html"), html);
await writeFile(
  path.join(output, "summary.json"),
  JSON.stringify(summary, null, 2),
);
console.log(
  JSON.stringify({
    report: path.join(output, "report.html"),
    attempted: summary.attempted,
    complete: summary.complete,
  }),
);

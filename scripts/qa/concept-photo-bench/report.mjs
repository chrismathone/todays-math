import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const [manifestFile, resultsDir, jevSummaryFile, jevOcrSummaryFile] =
  process.argv.slice(2);
if (!manifestFile || !resultsDir)
  throw new Error("Usage: node report.mjs manifest.json results-directory");
const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
const jevSummary = jevSummaryFile
  ? JSON.parse(await readFile(jevSummaryFile, "utf8"))
  : null;
const jevOcrSummary = jevOcrSummaryFile
  ? JSON.parse(await readFile(jevOcrSummaryFile, "utf8"))
  : null;
const summarizeJev = (summary) =>
  summary
    ? Object.fromEntries(
        Object.entries(summary).filter(([key]) => key !== "results"),
      )
    : null;
const sensitivityCases = manifest.cases.filter((c) => !c.labelUncertain);
const files = (await readdir(resultsDir)).filter(
  (f) =>
    f.endsWith(".json") && !f.startsWith("summary-") && !f.startsWith("report"),
);
const records = (
  await Promise.all(
    files.map((f) =>
      readFile(path.join(resultsDir, f), "utf8").then(JSON.parse),
    ),
  )
).filter((r) => manifest.cases.some((c) => c.id === r.id));
const byModel = Map.groupBy(records, (r) => `${r.model} / ${r.effort}`);
const sampleDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul",
}).format(new Date(records[0]?.startedAt ?? Date.now()));
const median = (xs) => {
  const a = xs.toSorted((x, y) => x - y);
  return a.length
    ? (a[Math.floor((a.length - 1) / 2)] + a[Math.floor(a.length / 2)]) / 2
    : null;
};
const stats = [...byModel].map(([model, rows]) => {
  const successful = rows.filter((r) => !r.error);
  const matched = (predicate) =>
    successful.filter((r) =>
      predicate(
        r,
        manifest.cases.find((c) => c.id === r.id),
      ),
    ).length;
  return {
    model,
    completed: successful.length,
    total: manifest.cases.length,
    exactMatches: matched(
      (r, c) =>
        r.answer.status === c.expected.status &&
        r.answer.choice === c.expected.choice,
    ),
    choiceMatches: matched((r, c) => r.answer.choice === c.expected.choice),
    statusMatches: matched((r, c) => r.answer.status === c.expected.status),
    excludingUncertainLabels: {
      total: sensitivityCases.length,
      exactMatches: matched(
        (r, c) =>
          !c.labelUncertain &&
          r.answer.status === c.expected.status &&
          r.answer.choice === c.expected.choice,
      ),
    },
    riskyAutoAnswers: matched(
      (r, c) =>
        ["blank", "review"].includes(c.expected.status) &&
        r.answer.status === "answered",
    ),
    reviewCount: successful.filter(
      (r) =>
        r.answer.status === "review" ||
        (r.answer.choice === null && r.answer.status === "answered"),
    ).length,
    medianMs: median(successful.map((r) => r.ms)),
  };
});
const report = {
  createdAt: new Date().toISOString(),
  labelStatus: manifest.labelStatus,
  stats,
  jev: jevSummary
    ? {
        ...summarizeJev(jevSummary),
        completed: jevSummary.completed,
        total: jevSummary.total,
        accessError: jevSummary.results.find((r) => r.error)?.error ?? null,
        diagnosis: jevSummary.diagnosis ?? null,
      }
    : null,
  jevOcr: summarizeJev(jevOcrSummary),
  limitations: [
    "Small convenience sample from three middle-school exam scans; only two contain handwriting. Original authorship and correction timing are unknown.",
    "Assistant-reviewed labels, not teacher-validated ground truth. Agreement below is not a population accuracy estimate.",
    "Choice selection, blank detection and conflict routing only; full handwritten transcription, concept semantics and partial credit are not scored.",
    "CLI timing includes agent initialization and image-tool overhead; APIs may behave differently. One run per case, with model groups running concurrently.",
    "No API charges measured. API token unit prices and hypothetical estimates are separate from subscription usage.",
    "Direct Jev results, when included, use synthetic concept text and existing extracted answers. Their HTTP timings are separate from vision CLI timings; token counts are not billing receipts.",
  ],
};
await writeFile(
  path.join(resultsDir, "report.json"),
  JSON.stringify(report, null, 2),
);
const e = (s) =>
  String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const status = {
  answered: "답 표시 있음",
  blank: "미작성",
  review: "확인 필요",
};
const cells = stats
  .map(
    (s) =>
      `<tr><th>${e(s.model)}</th><td>${s.exactMatches}/${s.total}</td><td>${s.choiceMatches}/${s.total}</td><td>${s.riskyAutoAnswers}</td><td>${s.reviewCount}</td><td>${(s.medianMs / 1000).toFixed(1)}초</td></tr>`,
  )
  .join("");
const sensitivity = stats
  .map(
    (s) =>
      `${e(s.model)} ${s.excludingUncertainLabels.exactMatches}/${s.excludingUncertainLabels.total}`,
  )
  .join(" · ");
const jevNote = report.jev
  ? `<p class="notice"><b>Jev · ${e(report.jev.transport || "Vercel AI Gateway")}:</b> ${report.jev.completed}/${report.jev.total}건 완료. ${report.jev.completed ? `기대 분류와 ${report.jev.matches}건 일치, 중앙 ${(report.jev.medianMs / 1000).toFixed(3)}초. ${e(report.jev.responseModels?.join(", "))}. 합성 개념 답안의 결과이며 실제 학생 채점 정확도를 뜻하지 않습니다.` : e(report.jev.diagnosis || report.jev.accessError)} 사진 입력은 지원하지 않으므로 텍스트 채점 단계에만 사용했습니다.</p>`
  : "";
const gradeLabels = {
  correct: "정답",
  incorrect: "오답",
  partial: "부분정답",
  blank: "미작성",
  review: "확인 필요",
};
const semanticRows =
  jevSummary?.mode === "semantic"
    ? jevSummary.results
        .filter((r) => !r.error)
        .map(
          (r) =>
            `<tr><td>${e(r.state.question)}</td><td>${e(r.state.studentAnswer)}</td><td>${e(gradeLabels[r.expected])}</td><td>${e(gradeLabels[r.choice])}</td><td>${e(r.answers.grade.confidence)}</td></tr>`,
        )
        .join("")
    : "";
const ocrRows =
  jevOcrSummary?.bySourceModel
    ?.map(
      (r) =>
        `<tr><th>${e(r.sourceModel)}</th><td>${r.matches}/${r.total}</td><td>${r.ruleMatches}/${r.total}</td><td>${r.upstreamReviewOverrides}</td></tr>`,
    )
    .join("") ?? "";
const jevSection =
  semanticRows || ocrRows
    ? `<section id="jev-results"><h2>Jev 직접 API 채점 결과</h2>${semanticRows ? `<p>직접 만든 한국어 예시 ${jevSummary?.completed ?? 0}개입니다. 루브릭이 명시된 조건에서만 검사했으며, 다른 모델과의 서술 채점 우열을 입증한 결과는 아닙니다. confidence는 분류 확률의 집중도이며 정답률이 아닙니다.</p><table><thead><tr><th>문항</th><th>합성 답안</th><th>기대 분류</th><th>Jev</th><th>confidence</th></tr></thead><tbody>${semanticRows}</tbody></table>` : ""}${ocrRows ? `<h3>사진 판독 후 채점</h3><p>사진을 새로 읽히지 않고 기존 판독 결과만 전달했습니다. 중앙 ${(jevOcrSummary.medianMs / 1000).toFixed(3)}초. 정답표 비교 및 검토 규칙과 ${jevOcrSummary.bySourceModel.reduce((sum, r) => sum + r.ruleMatches, 0)}/${jevOcrSummary.completed}건이 같아, 이 선택형 표본에서는 Jev 추가로 판정이 개선되지는 않았습니다.</p><table><thead><tr><th>앞 단계 판독 모델</th><th>임시 기준과 일치</th><th>기존 규칙과 일치</th><th>검토 요청을 다른 분류로 변경</th></tr></thead><tbody>${ocrRows}</tbody></table>` : ""}</section>`
    : "";
const details = [];
for (const c of manifest.cases) {
  const png = await readFile(c.imagePath);
  const rows = [...byModel]
    .map(([name, rs]) => {
      const r = rs.find((x) => x.id === c.id);
      if (!r || r.error)
        return `<article><h3>${e(name)}</h3><p>실행 실패 / 미완료</p></article>`;
      const a = r.answer,
        match =
          a.status === c.expected.status && a.choice === c.expected.choice;
      const jev = jevOcrSummary?.results.find(
        (j) => j.sourceModel === r.model && j.sourceCase === c.id,
      );
      const jevDetail =
        jev && !jev.error
          ? `<p><b>Jev 채점: ${e(gradeLabels[jev.choice])}</b> · 기존 규칙과 ${jev.ruleMatch ? "일치" : "불일치"}</p>`
          : "";
      return `<article class="${match ? "match" : "diff"}"><h3>${e(name)}</h3><p><b>${e(status[a.status])} · ${a.choice ?? "—"}번</b> · ${(r.ms / 1000).toFixed(1)}초</p><p>읽은 손글씨: ${e(a.writtenAnswer) || "없음"}</p><p>${e(a.evidence)}</p>${jevDetail}</article>`;
    })
    .join("");
  details.push(
    `<section><h2>${e(c.id)} <small>${e(c.category)}</small></h2><p>임시 기준: ${e(status[c.expected.status])} · 선택 ${c.expected.choice ?? "없음"}${c.labelNote ? ` — ${e(c.labelNote)}` : ""}</p><div class="case"><img src="data:image/png;base64,${png.toString("base64")}" alt="${e(c.id)} 문항 영역"><div class="models">${rows}</div></div></section>`,
  );
}
const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>개념 백지 사진 판독 · 모델 비교</title><style>
body{font:16px/1.65 system-ui,'Malgun Gothic',sans-serif;color:#172534;background:#f3f6fa;margin:0;padding:32px}main{max-width:1500px;margin:auto}h1{font-size:30px;line-height:1.3}h2{font-size:22px}h3{font-size:16px;margin:0}small{font-size:13px;color:#536575}section,.intro{background:white;padding:24px;border-radius:12px;margin:22px 0;border:1px solid #d8e1eb}.notice{border-left:4px solid #ba6c10;padding:10px 16px;background:#fff6e5}table{width:100%;border-collapse:collapse}td,th{padding:12px;text-align:left;border-bottom:1px solid #dae2ea}thead{background:#eaf0f7}.case{display:grid;grid-template-columns:minmax(260px,1fr) minmax(420px,1.5fr);gap:24px}.case img{width:100%;height:auto;align-self:start}.models{display:grid;grid-template-columns:1fr 1fr;gap:12px}article{border:1px solid #ced8e5;border-top:4px solid #1e8262;padding:16px;border-radius:6px}article.diff{border-top-color:#c77c16}article p{font-size:14px;margin:8px 0}a{color:#155cb0}@media(max-width:900px){body{padding:14px}.case,.models{grid-template-columns:1fr}table{font-size:12px}td,th{padding:6px}}@media print{body{background:white}section{break-inside:avoid}.case{grid-template-columns:1fr 1.5fr}}
</style><main><h1>사진에서 학생 답을 읽는 모델 비교</h1><p>${sampleDate} · 구독 CLI 실측 · 선택 문항 ${manifest.cases.length}개</p><div class="intro"><p class="notice">이 수치는 <b>임시 판독 기준과의 일치 건수</b>입니다. 교사 검증 전이며 개념 서술·부분점수 채점 정확도를 뜻하지 않습니다. 이름과 학교 머리말은 모델에 전달하지 않았습니다.</p><table><thead><tr><th>모델 / 추론 강도</th><th>상태+번호 일치</th><th>번호 일치</th><th>미작성·충돌을 자동 답 처리</th><th>확인 필요</th><th>CLI 중앙 시간</th></tr></thead><tbody>${cells}</tbody></table><p>기준이 애매한 ${manifest.cases.length - sensitivityCases.length}문항 제외: ${sensitivity}</p>${jevNote}<p>Gemini는 Antigravity의 이미지 보기 도구, OpenAI는 Codex의 이미지 첨부를 사용했습니다. 도구·에이전트 실행 시간까지 포함하므로 API 응답 속도로 비교하면 안 됩니다.</p><p>API 입력/출력 100만 토큰: Luna $0.10/$0.50, Flash $0.75/$3.75(2026년 말까지), Sol $2/$10. Flash는 2027-01-01부터 $1.50/$7.50입니다. 실제 이미지 토큰·추론 토큰은 모델별로 달라 장당 비용을 이 단가만으로 확정할 수 없습니다. <a href="https://ai.google.dev/gemini-api/docs/pricing">Google 가격</a> · <a href="https://developers.openai.com/api/docs/models/gpt-6-luna">Luna</a> · <a href="https://developers.openai.com/api/docs/models/gpt-6.1-sol">Sol</a></p></div>${jevSection}${details.join("")}</main></html>`;
await writeFile(path.join(resultsDir, "report.html"), html);
console.log(JSON.stringify(report, null, 2));

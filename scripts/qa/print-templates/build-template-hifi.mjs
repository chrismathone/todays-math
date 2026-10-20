import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { templates, labels, directions } from "./directions.mjs";

// Keep the chosen A structure and the captured real WorksheetPrint question DOM.
const wirePath = "docs/design/mockups/print-templates-wire-20261020.html";
const wire = await readFile(wirePath, "utf8");
const source = JSON.parse(
  wire.match(
    /<script id="payload" type="application\/json">([\s\S]*?)<\/script>/,
  )[1],
);
const base = source.records.slice(12, 18);
const snapshotMetrics = JSON.parse(
  await readFile("scripts/qa/print-templates/evidence/metrics.json", "utf8"),
);
const changedSinceSnapshot = [];
for (const [file, expected] of Object.entries(snapshotMetrics.sourceSha256)) {
  if (
    createHash("sha256")
      .update(await readFile(file))
      .digest("hex") !== expected
  )
    changedSinceSnapshot.push(file);
}
if (
  changedSinceSnapshot.some(
    (file) =>
      ![
        "src/components/unified/print/AnswerPage.tsx",
        "src/components/unified/print/WorksheetPrint.tsx",
      ].includes(file),
  )
)
  throw Error(
    `Question renderer changed since snapshot: ${changedSinceSnapshot}`,
  );
if (
  base.length !== 6 ||
  !base.every((record) => record.html.includes("구조 A"))
)
  throw Error("Expected the six chosen A archetypes");
const schemes = [
  {
    id: "T1",
    name: "정밀한 정보표",
    line: "얇은 남색 이중선, 작은 사각 번호, 가는 풀이 경계로 학교 양식의 정돈감을 높입니다.",
  },
  {
    id: "T2",
    name: "분명한 머리와 번호",
    line: "남색 윗선과 번호 테두리로 읽기 시작점을 분명히 하고, 풀이 자리는 옅은 선으로 남깁니다.",
    recommended: true,
  },
  {
    id: "T3",
    name: "조용한 바탕 글씨",
    line: "바탕체 제목과 괄호 번호, 가는 회색선으로 흑백 인쇄에서도 차분한 읽기 흐름을 만듭니다.",
  },
  {
    id: "T4",
    name: "또렷한 대비",
    line: "굵은 지면선과 채운 번호로 작은 축소 인쇄나 여러 번 복사할 때에도 구분을 또렷하게 합니다.",
  },
  {
    id: "T5",
    name: "학습 흔적을 남기는 선",
    line: "머리의 남색 세로선, 밑줄 번호와 점선 풀이 경계로 직접 쓰는 공간을 먼저 드러냅니다.",
  },
];
const css = `
.wire-page{filter:none;--navy:#1b2a4e;--soft:#d4d9e2;--ink:#0e0e10;color:var(--ink);print-color-adjust:exact;-webkit-print-color-adjust:exact}
.wire-head h1{letter-spacing:-.6px}.info,.exam-info{color:#20242c}.note-box{color:#20242c}.wire-foot{color:#454b55}
.t1 .wire-head{border-top:3px double var(--navy);border-bottom:1px solid var(--navy);padding-top:12px;padding-bottom:12px}
.t1 .wire-head h1{color:var(--navy);font-size:24px}.t1.exam .wire-head h1{font-size:30px}
.t1.brand .wire-head{border-left:2px solid var(--navy);padding-left:16px}.t1 [data-question-number]{background:white!important;color:var(--navy)!important;border:1px solid #9ca6b8!important;min-width:23px!important;min-height:23px!important;font-size:12px!important;border-radius:0!important}
.t1 .info,.t1 .exam-info{border-color:#8a94a5}.t1 .info span,.t1 .exam-info span{border-color:#b7bfcc}.t1 .note-box{border:1px solid #9ca6b8;border-left:3px solid var(--navy);background:#fafbfc}
.t1 .split .work{border-left-color:#9ca6b8}.t1.split .work{border-left:1px solid #9ca6b8}.t1 .wire-foot{border-top:1px solid var(--navy)}
.t2 .wire-head{border-top:4px solid var(--navy);border-bottom:1px solid #b9b9be;padding-top:14px;padding-bottom:14px}
.t2 .wire-head h1{font-size:26px;color:var(--navy);font-weight:800}.t2.exam .wire-head h1{font-size:30px}.t2.brand .wire-head{border-left:0;padding-left:0}
.t2 [data-question-number]{background:white!important;border:1.5px solid var(--navy)!important;color:var(--navy)!important;min-width:25px!important;min-height:25px!important;font-size:12px!important;border-radius:4px!important}
.t2 .info,.t2 .exam-info{border:1px solid #a7b0bf}.t2 .info span,.t2 .exam-info span{border-color:#c2c9d3}.t2 .exam-info span:nth-child(2){background:#f1f4f8}
.t2 .note-box{border:0;border-left:4px solid var(--navy);background:#f3f5f8;padding:12px 14px}.t2.split .work{border-left:1px dashed #a7b0bf}
.t2.grid .work{background-image:linear-gradient(#d3dbe6 1px,transparent 1px),linear-gradient(90deg,#d3dbe6 1px,transparent 1px)}.t2 .wire-foot{border-top:1px solid #b9b9be}
.t3 .wire-head{border:0;border-bottom:1px solid #737373;padding-top:8px;padding-bottom:16px}
.t3 .wire-head h1{font-family:var(--paper-font-serif);font-size:27px;font-weight:700;color:#0e0e10;letter-spacing:0}.t3.exam .wire-head h1{font-size:32px}.t3.brand .wire-head{border-left:0;padding-left:0}
.t3 [data-question-number]{display:inline-flex!important;align-items:center;justify-content:center;gap:2px;background:transparent!important;color:#0e0e10!important;border:0!important;min-width:26px!important;font-size:12px!important;font-family:var(--paper-font-serif)!important}
.t3 [data-question-number]:before{content:'('}.t3 [data-question-number]:after{content:')'}
.t3 .info,.t3 .exam-info,.t3 .info span,.t3 .exam-info span{border-color:#a0a0a0}.t3 .note-box{border:0;border-top:1px solid #a0a0a0;border-bottom:1px solid #a0a0a0;padding:12px 0;background:white}
.t3.split .work{border-left:1px solid #aaa}.t3.grid .work{background-image:linear-gradient(#dedede 1px,transparent 1px),linear-gradient(90deg,#dedede 1px,transparent 1px)}.t3 .wire-foot{border-color:#a0a0a0;color:var(--navy)}
.t4 .wire-head{border-top:5px solid #0e0e10;border-bottom:2px solid #0e0e10;padding-top:12px;padding-bottom:12px}
.t4 .wire-head h1{font-size:26px;font-weight:900;color:#0e0e10}.t4.exam .wire-head h1{font-size:30px}.t4.brand .wire-head{border-left:0;padding-left:0}
.t4 [data-question-number]{background:var(--navy)!important;color:white!important;border:0!important;min-width:26px!important;min-height:26px!important;font-size:12px!important;border-radius:0!important}
.t4 .info,.t4 .exam-info{border:2px solid #333}.t4 .info span,.t4 .exam-info span{border-color:#777}.t4 .note-box{border:2px solid #333;background:white}.t4.split .work{border-left:2px solid #7b818c}
.t4.grid .work{background-image:linear-gradient(#b9c0cb 1px,transparent 1px),linear-gradient(90deg,#b9c0cb 1px,transparent 1px)}.t4 .wire-foot{border-top:2px solid #333}
.t5 .wire-head{border:0;border-left:5px solid var(--navy);padding:10px 0 10px 16px;text-align:left}
.t5 .wire-head h1{font-size:26px;font-weight:800;color:var(--navy)}.t5.exam .wire-head h1{font-size:30px}
.t5 [data-question-number]{background:transparent!important;color:var(--navy)!important;border:0!important;border-bottom:2px solid var(--navy)!important;min-width:25px!important;min-height:25px!important;padding:0 4px!important;font-size:12px!important}
.t5 .info,.t5 .exam-info{border:0;border-top:1px solid #aab3c0;border-bottom:1px solid #aab3c0}.t5 .info span,.t5 .exam-info span{border:0;border-right:1px solid #d0d5df}
.t5 .note-box{border:1px dashed #aab3c0;border-left:3px solid var(--navy);background:white}.t5.split .work{border-left:1px dashed #aab3c0;background:repeating-linear-gradient(transparent 0 29px,#e1e5eb 29px 30px)}
.t5.grid .work{background-image:linear-gradient(#d5dbe3 1px,transparent 1px),linear-gradient(90deg,#d5dbe3 1px,transparent 1px);border-bottom:1px dashed #aab3c0}.t5 .wire-foot{border-top:1px dashed #aab3c0}
.wire-page.grid .wire-head{padding-top:2px;padding-bottom:2px}.wire-page.grid .note-box{padding-top:10px;padding-bottom:10px}
.split .work{position:relative}.split .work:before{content:'풀이';position:absolute;left:8px;top:2px;font:10px/1.5 var(--paper-font-sans);color:#808997}.t3.split .work:before{font-family:var(--paper-font-serif);color:#888}.t4.split .work:before{color:#1b2a4e;font-weight:800}.t5.split .work:before{content:'직접 풀기'}
`;
const records = [];
const sections = schemes
  .map(
    (scheme) =>
      `<section id="${scheme.id}"><div class="section-head"><div><h2>${scheme.id} ${scheme.name}${scheme.recommended ? '<span class="recommend">추천</span>' : ""}</h2><p>${scheme.line}</p></div><button class="print" data-scheme="${scheme.id}">이 안의 여섯 쪽 인쇄</button></div><div class="gallery">${base
        .map((record, i) => {
          const html = record.html
            .replace("wire-page ", `wire-page ${scheme.id.toLowerCase()} `)
            .replace("구조 A · 제안 첫 쪽", `${scheme.id} · 제안 첫 쪽`);
          const index =
            records.push({ scheme: scheme.id, template: templates[i], html }) -
            1;
          return `<figure data-template="${templates[i]}"><figcaption><strong>${labels[i]}</strong><span>${directions[0].identities[i]}</span></figcaption><div class="viewport"><div class="mount" data-index="${index}"></div></div></figure>`;
        })
        .join("")}</div></section>`,
  )
  .join("");
const payload = JSON.stringify({
  records,
  styles: source.styles,
  wireCss: source.wireCss,
  hifiCss: css,
  provenance: {
    source: wirePath,
    sourceSha256: createHash("sha256").update(wire).digest("hex"),
    selectedStructure: "A",
    questionDOM: "captured WorksheetPrint / jeongtong",
    sourceRecords: [12, 13, 14, 15, 16, 17],
  },
}).replaceAll("<", "\\u003c");
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>템플릿 A Hi-fi 다섯 안</title><style>
*{box-sizing:border-box}html{scroll-behavior:auto}body{margin:0;background:#e6e9ee;color:#172033;font:15px/1.6 'Malgun Gothic',sans-serif}main{max-width:1800px;margin:auto;padding:40px 32px 64px}h1{font-size:32px;line-height:1.35;letter-spacing:-1px;margin:0 0 16px}p{max-width:1000px;margin:8px 0}.intro{border-top:6px solid #1b2a4e;padding-top:28px;margin-bottom:24px}.intro p{color:#4b5565}.toolbar{position:sticky;top:0;z-index:5;display:flex;align-items:center;flex-wrap:wrap;gap:16px;padding:14px 0;background:#e6e9eef5;border-bottom:1px solid #bac2ce}nav{display:flex;gap:8px;flex-wrap:wrap}nav a{color:#1b2a4e;text-decoration:none;border:1px solid #98a4b8;padding:7px 12px;background:#fff}button,select{font:inherit;min-height:40px;border:1px solid #98a4b8;border-radius:3px;background:white;color:#1b2a4e;padding:7px 12px;cursor:pointer}button:hover,select:hover,nav a:hover{background:#eef2f8;border-color:#1b2a4e}button:active,nav a:active{background:#dce4ef}button:focus-visible,a:focus-visible,select:focus-visible{outline:3px solid #526fa7;outline-offset:3px}label{display:flex;align-items:center;gap:8px}section{padding-top:32px;margin-top:24px;border-top:1px solid #b5becb;scroll-margin-top:90px}.section-head{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:18px}h2{font-size:24px;margin:0 0 5px;letter-spacing:-.5px}.section-head p{color:#4b5565}.recommend{display:inline-block;vertical-align:middle;margin-left:12px;background:#1b2a4e;color:white;font:700 12px/1.4 'Malgun Gothic',sans-serif;padding:4px 8px}.gallery{display:flex;flex-wrap:wrap;gap:28px 24px}figure{margin:0}figure[hidden]{display:none}figcaption{display:flex;flex-direction:column;gap:5px;width:357.17px;min-height:74px;margin-bottom:10px}figcaption strong{font-size:17px}figcaption span{font-size:12px;color:#536075}.viewport{width:357.17px;height:505.14px;background:white;outline:1px solid #b8c0cc}.mount{width:793.7008px;height:1122.5197px;transform:scale(.45);transform-origin:top left}body.full .viewport{width:793.7008px;height:1122.5197px}body.full .mount{transform:none}body.full figcaption{width:793.7008px;min-height:55px}details{margin-top:32px;color:#536075}summary{cursor:pointer;text-decoration:underline;text-underline-offset:3px}summary:focus-visible{outline:3px solid #526fa7}@media(max-width:850px){main{padding:24px 16px}.section-head{align-items:flex-start;flex-direction:column;gap:10px}.gallery{flex-wrap:nowrap;overflow-x:auto;padding:1px 1px 10px}figure{flex-shrink:0}.toolbar{position:static}h1{font-size:26px}}@media print{@page{size:A4;margin:0}body{background:white}main{padding:0}.intro,.toolbar,.section-head,details,figcaption,section:not(.printing){display:none!important}section{margin:0;padding:0;border:0}.gallery{display:block}.viewport{width:793.7008px!important;height:1122.5197px!important;outline:0}.mount{transform:none!important}figure{display:block!important;break-after:page}}
</style></head><body><main><header class="intro"><h1>같은 여섯 양식, 다섯 가지 인쇄 인상</h1><p>선택하신 A 구조입니다. 평가원 2단 · 정통 정보표 · 모던 안내 머리 · 워크북 오른쪽 풀이 · 자습 개념과 모눈 · 유형 반복을 유지합니다.</p><p>각 안에서 머리, 번호, 선과 풀이 공간의 인상만 비교해 주세요. 추천은 T2입니다. H2 빠른 채점표와 남색 머리·번호의 읽기 흐름이 이어지고, 본문과 쓰는 공간은 담백하게 남습니다.</p></header><div class="toolbar"><nav aria-label="시안 바로 가기">${schemes.map((s) => `<a href="#${s.id}">${s.id} ${s.name}</a>`).join("")}</nav><label>양식<select id="template"><option value="all">여섯 양식 모두</option>${templates.map((t, i) => `<option value="${t}">${labels[i]}만 비교</option>`).join("")}</select></label><button id="size" aria-pressed="false">실제 A4 크기로 보기</button></div>${sections}<details><summary>표본과 검토 범위</summary><p>2026-10-20 Wire에 보존한 실제 WorksheetPrint 문항·수식·도형 DOM을 그대로 사용했습니다. 각 지면은 같은 표본의 첫 3~6문항을 배치한 첫 쪽 제안이며, 25문항 전체의 새 쪽수·자동 쪽 나눔을 확정한 제품 구현이 아닙니다. 기존 저장 프리셋과 제품 선택 화면은 바뀌지 않습니다. 글꼴은 현재 시스템 지면 글꼴이며 별도 글꼴 설치가 필요하지 않습니다.</p></details></main><script id="payload" type="application/json">${payload}</script><script>
const data=JSON.parse(document.getElementById('payload').textContent);document.querySelectorAll('.mount').forEach(node=>{const shadow=node.attachShadow({mode:'open'});const style=document.createElement('style');style.textContent=data.styles.replaceAll(':root',':host')+'\\n'+data.wireCss+'\\n'+data.hifiCss;shadow.append(style);const box=document.createElement('div');box.innerHTML=data.records[Number(node.dataset.index)].html;shadow.append(box);});document.getElementById('size').onclick=e=>{const full=document.body.classList.toggle('full');e.target.setAttribute('aria-pressed',String(full));e.target.textContent=full?'한눈에 비교하기 (45%)':'실제 A4 크기로 보기';};document.getElementById('template').onchange=e=>{document.querySelectorAll('figure').forEach(f=>{f.hidden=e.target.value!=='all'&&f.dataset.template!==e.target.value;});};document.querySelectorAll('.print').forEach(button=>{button.onclick=()=>{document.querySelectorAll('.printing').forEach(s=>s.classList.remove('printing'));document.getElementById(button.dataset.scheme).classList.add('printing');window.print();};});document.getElementById('T2').classList.add('printing');window.templateHifiReady=true;
</script></body></html>`;
await writeFile("docs/design/mockups/print-templates-hifi-20261020.html", html);
console.log(
  `Wrote ${records.length} A4 first-page proposals (5 visual schemes × 6 A structures).`,
);

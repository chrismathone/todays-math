# HWPX 내보내기 깨짐 수정 이식 — mathg-gen → todays-math

가지 `chrismathone/hwpx-writer-port` · 2026-09-18 · **main 병합·푸시 안 함** · **한글(HWP) COM 안 돌림** ·
`D:\mathg-gen` 은 읽기만(`git show`·`cat-file`·파일 읽기) · 공유 DB 안 건드림

> 한 줄 결론: writer 는 mathg-gen 과 **바이트 단위로 같게** 옮겼고, 증상 넷을 XML 안에서 재는 시험 4건이
> 옛 writer 로 빨강 → 새 writer 로 초록이다. 🔴 다만 **우리 미리보기에서는 구역 위 여백이 모든 쪽 8px** 가
> 된다(§6). 고치지 않았다 — 리드 결정이 필요하다. 한글에서 실제로 어떻게 보이는지는 **못 봤다**(§8).

---

## 1. 가져온 것

| 파일 | 원천 | 비고 |
|---|---|---|
| `scripts/hwpx/writer.py` (교체) | mathg-gen `b289619` | `144ac19`(탭 정렬·줄 고정·위 여백) + `b289619`(수식 폭) |
| `scripts/hwpx/eqsize.py` (신규, 517줄) | mathg-gen `b289619` | 표준 라이브러리(math, re)만 · walrus(`:=`) 라 Python 3.8+ |

**안 가져온 것**: `6f01058`(HWP 도우미 버튼) · `eq_measure.py`(한글 COM 재측정 도구) ·
`b289619` 의 AGENTS.md/CLAUDE.md 절 · `b289619` 의 vercel.json 변경(저쪽은 `api/export-hwpx.py` 에
eqsize.py 를 한 줄 더한 것 — 우리는 `scripts/hwpx/**` 라 필요 없다, §3).

작업 트리가 아니라 **커밋에서** 꺼냈다(`git -C D:\mathg-gen cat-file -p b289619:…`).

## 2. 바뀐 줄 수 · 줄끝

- 기준 확인: 우리 HEAD 의 `scripts/hwpx/writer.py` 블롭 `62b1928` = mathg-gen `144ac19^` 블롭 `62b1928` (같은 해시).
- 교체 뒤 정규화 블롭: writer `6a9772b` = mathg-gen `b289619` · eqsize `1aa0f36` = mathg-gen `b289619` (같은 해시).
- `git diff --numstat`: **writer.py +55 / −13** — mathg-gen `144ac19^..b289619` 의 numstat 과 같다.
  CR 을 뺀 `+`/`-` 줄 68줄을 `cmp` 로 대조해 **완전히 같다**(줄끝 때문에 파일 전체가 바뀐 것처럼 보이지 않는다).
- 줄끝: 이 저장소에 `.gitattributes` 없음 · `core.autocrlf=true` · 기존 writer.py 는 **index LF / 작업 트리 CRLF**.
  같은 방식으로 두 파일 모두 작업 트리 CRLF 로 썼다(커밋되는 블롭은 LF).

| 커밋 범위 | 파일 | 줄 |
|---|---|---|
| 이식 | `scripts/hwpx/writer.py` | +55 −13 |
| 이식 | `scripts/hwpx/eqsize.py` | +517 (신규) |
| 시험 | `src/__tests__/unit/hwpxHancomLayout.test.ts` | 신규(증상 넷) |
| 검수 잔고 | `src/app/dev/print-check/items.ts` · `PrintCheck.test.tsx` | 항목 1 추가 · 개수 56→59 (§7) |

## 3. 배포 번들 — 내 눈으로 다시 봤다

- **Next(로컬·비 Vercel)**: `next.config.ts:95-98` `outputFileTracingIncludes["/api/exports/hwpx"]` =
  `./scripts/hwpx/*.py` · `./vendor/hwpx/**/*.py` · `./vendor/hwpx/template/**/*`.
  picomatch 로 저장소 파일에 대 보니 `scripts/hwpx/{eqsize,export_parts,writer}.py` 셋이 실린다.
- **Vercel(운영)**: `hwpxServer.ts` 가 `VERCEL=1`(개발 환경 제외)이면 `requestEngine("hwpx")` →
  `api/mathgen-engine.py` → 자식 프로세스 `scripts/hwpx/export_parts.py` → `writer` → `eqsize`.
  `vercel.json` 의 `api/mathgen-engine.py` includeFiles 에 `scripts/hwpx/**` · excludeFiles 는
  `scripts/!(figure|hwpx)/**`·`**/*.pyc` 등 — picomatch 평가로 **eqsize.py 포함 · 제외 규칙 비해당**.
- **실린 파일만으로 도는가**: 위 include/exclude 로 고른 14개 파일만 빈 폴더에 복사해
  `api/mathgen-engine.py` 의 `run_engine("hwpx", …)` 를 불렀다 → `\frac{1}{2}` 상자 폭 **1050**(한글 실측값과 같음).
- import 경로: writer.py 가 자기 폴더를 `sys.path` 에 넣고 `from eqsize import hwpeq_width` 한다.
  로컬 경로(`hwpxServer.ts` 의 `python -B scripts/hwpx/export_parts.py` 자식)와 엔진 경로(`run_engine`) 둘 다
  시험으로 탔다(§5 — `hwpxExport.test.ts` · `hwpxHancomLayout.test.ts` 는 로컬 자식, `mathgenEngineHttp.test.ts` 는
  실제 파이썬 HTTP 엔진).
- 이 기계 Python: **3.11.9**.

## 4. payload 필드 (`src/lib/export/hwpxLayout.ts` vs mathg-gen `src/lib/hwpxLayout.ts`)

prettier 로 모양을 맞춘 뒤 diff 하면 다른 곳은 넷뿐이다: `onProgress` 인자 · 복제본 스타일
(`min-width:0` · `--preview-scale:1` · `--preview-trailing-space:0px`) · 쪽 선택자
(`[data-unified-paper]` ↔ `[data-print-page="true"]`) · 풀이 칸이 있을 때의 본문 노드.
writer 가 읽는 `fontSize`·`w`·`latex`(그리고 `x`·`y`·`h`·`baseline`·`text`·색·굵기) 를 만드는
`styleFor`·`box`·`.katex`/`data-export-tex` 수집 코드는 **한 글자도 다르지 않다** → 고칠 것 없음.
단, 쪽 선택자 차이가 §6 의 원인과 닿아 있을 수 있다(미확인).

## 5. 시험 결과

| 시험 | 결과 |
|---|---|
| `hwpxHancomLayout.test.ts` (신규 4건) — **옛 writer** | **4/4 빨강** (아래) |
| `hwpxHancomLayout.test.ts` — **새 writer** | **4/4 초록** |
| HWPX 에 닿는 vitest 6파일 (`hwpxExport`·`hwpxHancomLayout`·`hwpxLayout`·`api/worksheetExports`·`mathgenEngineHttp`·`WorksheetEditor.progress`) | **38/38 통과** |
| `PrintCheck.test.tsx` | 10/10 통과 (§7) |
| `python -m unittest src/__tests__/unit/mathgen_engine_test.py` | 4 OK |
| `npm run type-check` (`prisma generate` 선행) | **0 오류** |
| eslint · prettier (새/바뀐 TS) | 통과 |
| E2E `e2e/worksheet-figure` — `exports.spec.ts` 1 + `hwpxSolving.spec.ts` 3 | **4 passed** (격리 vite 127.0.0.1:4191 · headless Chromium · DB·인증 없음) |

옛 writer 로 돌린 빨강(= 시험이 증상을 실제로 잡는다):

| # | 증상 | 옛 writer | 기대(새 writer) |
|---|---|---|---|
| ① | 수식 뒤 글자 겹침 — `<hp:sz width>` | KaTeX 폭 그대로 `750, 2850, 3150, 1875` | 한글 실측 `1050, 2682, 2694, 1050` |
| ② | ③ 혼자 줄바꿈 — 보기 간격 | `<hp:tab>` 0개 (공백 뭉치) | 탭 2개 · tabItem pos = 미리보기 x (반 HWPUNIT) |
| ③ | 박스 배경 어긋남 — 줄 접기·줄 높이 | `lineWrap="BREAK"` · `PERCENT` | `SQUEEZE` · `FIXED` = 줄 높이 20px |
| ④ | 2쪽이 중간부터 — 구역 위 여백 | `top=11250`(본문 y 150px) | `top=3000`(쪽 머리 y 40px) · 첫 줄 위 간격 = `(160−40−1)px` |

①의 기대값은 **eqsize 출력이 아니라 한글(COM)이 직접 잰 값**이다 — mathg-gen 세션이 한글 2022 로 잰
10.5pt(= 미리보기 14px) 측정 파일 `D:\mathg-gen\.checks.local\eqfit\sweep_10.5.json` 에서 옮겼다
(저장소 밖 · 커밋 안 된 파일이라 값만 시험에 박았다).

### eqsize 를 한글 실측 전부에 다시 대 봤다 (커밋된 eqsize, 읽기만)

mathg-gen `.checks.local` 의 한글 측정 11,644식:

| 묶음 | n | 정확 | 1% 이내 | 최악 |
|---|---|---|---|---|
| `valid` (보류 검증 — mathg-gen 이 말한 3,000식) | 3,000 | **97.9%** | **99.9%** | +1.2% / −0.1% |
| `sweep` (22개 글꼴 크기) | 682 | 99.6% | 100% | +0.4% |
| `com_truth` (12pt) | 49 | 100% | 100% | 0 |
| `com_corpus` (옛 말뭉치, 10pt) | 439 | 93.4% | 98.2% | **+102%** · −6.3% |
| 전체 (합성 탐침 포함) | 11,644 | 95.7% | 98.0% | — |

`com_corpus` 의 +102% 두 건은 `"{"0,~3"}" rm {NOT} rm {SUBSET} A` 처럼 옛 변환이 만든 **깨진 스크립트**다.
실질적인 과소는 `bar {rm AP} : bar {rm PB}=it {n} : it {m}` 한 건(**−6.3%**, 상자가 좁아 뒤 글자가 겹칠 수 있는 쪽)이다.

## 6. 🔴 발견 — 우리 미리보기에서는 구역 위 여백이 **모든 쪽 8px**

E2E 하네스(`/?native`, 5쪽 — 기본 · 오른쪽 풀이 칸 두 설정)의 실제 `collectHwpxLayout` payload 를
옛/새 writer 에 넣어 비교했다(E2E 가 내려받은 `worksheet.hwpx` 도 풀어 같은 값 확인).

| | 옛 writer | 새 writer |
|---|---|---|
| 구역 위 여백(px) 1~5쪽 | 285.5 · 45.3 · 45.3 · 45.3 · 102.3 | **8 · 8 · 8 · 8 · 8** |
| 수식 15개 중 KaTeX 폭 그대로 | 15 | 0 (평균 0.916배로 좁아짐) |
| 넓은 간격 | 공백 뭉치 12 | 탭 12 |
| 줄 고정 | FIXED 0 · SQUEEZE 0 | FIXED 22 · SQUEEZE 23 |

**원인**: 새 writer 는 위 여백을 `max(8, min(body.y, 모든 object.y))` 로 잡는다. 우리 쪽 `[data-unified-paper]`
안에는 템플릿 뿌리 div(`background: PAPER_COLORS.paper` = 흰색, 793.7×1122.5)가 있어 `collectHwpxLayout` 이
그것을 **y=0 흰 rect** 로 싣는다 → 최솟값 0 → 8px. 그 rect 하나만 빼면 다섯 쪽 모두 **45.3px**(미리보기 내용 시작점)로
mathg-gen 의 의도대로 나온다.

**영향(추정 — 한글에서 못 봤다)**: 넘치지 않는 쪽은 첫 줄이 문단 위 간격으로 미리보기 y 까지 내려가므로 모양은 같을 것이다.
넘친 줄이 생기면 다음 쪽은 **종이 맨 위 약 2mm** 에서 시작한다 — 옛 증상(중간부터)은 사라지지만 프린터 비인쇄 영역에
걸려 **잘려 찍힐** 수 있다. 줄이 FIXED·SQUEEZE 라 넘침 자체는 옛 writer 보다 드물 것이다.

**mathg-gen 도 같을 가능성**: mathg-gen 템플릿 뿌리 div 도 같은 `background: PAPER_COLORS.paper` 다 — 거기서도 8px 일 수 있다.
직접 재 보지는 않았다(mathg-gen 에서 앱을 띄우지 않았다).

**고치지 않은 이유**: 브리프 3번(«다르면 고치지 말고 보고») · writer 는 양쪽 동기화 대상이다.
**리드께 고를 것**:
- (가) 그대로 둔다 — 넘침이 드물다면 수용.
- (나) writer 에서 위 여백 계산에 **쪽 전체를 덮는 rect** 를 빼기 — mathg-gen 과 함께 고쳐야 한다(동기화).
- (다) `hwpxLayout.ts` 에서 쪽 전체를 덮는 종이색 배경을 장식으로 싣지 않기 — 우리만의 수정, HWPX 종이가 원래 흰색이라 잃는 것은 없어 보인다.

## 7. 검수 잔고 (`/dev/print-check`)

CLAUDE.md 절대 규칙 6 에 따라 `hwpx-hancom-layout` 항목을 **대기**로 추가했다(종이에서 볼 것 ①~④ · «제안» 표시).

곁에서 찾은 것: `PrintCheck.test.tsx` 의 «항목 수가 바뀌면 알아차린다» 가 **main 에서 이미 빨강**이었다 —
HEAD 에 항목 58개인데 시험은 56 을 기대. 2026-09-14 `283841ec`(studio-native-hwpx-pdf)·`8749b02c`
(studio-export-condition-and-solve-layout)가 숫자를 안 올렸다. 주석에 둘을 적고 내 항목까지 **59** 로 맞췄다.
(이 시험은 HWPX 시험 묶음에 안 들어 있어 이식과 무관하게 빨강이었다 — 병합 시 다른 세션이 같은 숫자를 고치면 충돌한다.)

## 8. 못 본 것

- **한글에서 실제로 어떻게 보이나** — 한글 COM 을 돌리지 않았다(CLAUDE.md 절대 규칙 9). 증상 넷이 한글 화면·인쇄에서
  정말 사라지는지, 탭 위치를 1.2 판독기가 반 HWPUNIT 로 읽는지, FIXED 줄 높이·SQUEEZE 가 의도대로인지,
  쪽 맨 위 첫 문단의 위 간격(prev)을 한글이 적용하는지, 8px 위 여백이 인쇄에서 잘리는지 — 전부 **못 봤다**.
  mathg-gen 커밋 메시지는 «template harness 14/14 pages, Hancom edit check passes» 라고 적었다(저쪽 주장).
- **Vercel 실제 번들** — 배포하지 않았다. glob 은 picomatch 로 평가했을 뿐 Vercel 의 매처로 돌린 것이 아니다.
- **Vercel Python 런타임 버전** — `vercel.json` 에 지정이 없어 기본값을 따른다. 3.8 이상인지 확인하지 않았다.
- **실데이터 시험지** — 하네스 픽스처(5쪽)만 봤다. 운영 DB 의 문항·템플릿 넷 전부는 안 봤다.
- **mathg-gen 쪽 8px 여부** — §6.

## 9. 다시 재기

```
npx vitest run src/__tests__/unit/hwpxHancomLayout.test.ts
npx vitest run src/__tests__/unit/hwpxExport.test.ts src/__tests__/unit/hwpxLayout.test.ts \
  src/__tests__/api/worksheetExports.test.ts src/__tests__/unit/mathgenEngineHttp.test.ts \
  src/__tests__/components/WorksheetEditor.progress.test.tsx src/__tests__/components/PrintCheck.test.tsx
npx playwright test --config e2e/worksheet-figure/playwright.config.ts exports.spec.ts hwpxSolving.spec.ts
# 옛 writer 로 빨강 보기: 작업 트리의 writer.py 만 611e8578^ 판으로 바꾸고 첫 줄을 돌린 뒤 되돌린다
#   git show 611e8578^:scripts/hwpx/writer.py > scripts/hwpx/writer.py   (끝나면 git checkout -- scripts/hwpx/writer.py)
```

## 10. 커밋

- `611e8578` fix(HWPX): 배치 넷 — writer.py(블롭 `6a9772b` = mathg-gen `b289619`) · eqsize.py(`1aa0f36`) · 시험 4건
- 다음 커밋: 이 보고서 · `/dev/print-check` 항목 · 항목 수 56→59

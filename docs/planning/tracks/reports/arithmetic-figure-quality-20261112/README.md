# 연산대장 도형 전수 감사와 공통 엔진 교정

2026-11-12~14, 현재 arithmetic-v2 정적 카탈로그와 **실제 최종 표시 경로**를 조사했다. 보고된 사다리꼴, 조건 누락과 수학적 비율 왜곡을 공통 경로에서 교정했다. **모든 그림의 개별 육안 품질 통과를 선언하지 않는다.** 치수 예외 626개/451개 ID, 동결 원본 부채와 작은 기존 글자 사례는 아래에 남긴다. DB·학생 기록·환경 파일은 읽거나 쓰지 않았다.

[전체 ID 갤러리](gallery.html), [실제 카탈로그·출력 컴포넌트](production.html), [A4 PDF](production.pdf), [문제지 1](production-page-1.png)·[2](production-page-2.png)·[3](production-page-3.png)·[정답지](production-page-4.png)를 제공한다. 갤러리는 마지막의 로컬 서버로 열며 검색·유형·예외·개별 육안 미검토 필터, 최종/동결 전환, 실제 남는 조건과 접촉판 링크를 제공한다. 감사용 정답은 접기 안에 있으며 학생 도형에는 넣지 않는다.

## 실제 유한 모집단

| 범위 | 수 |
|---|---:|
| 등록 정의 / domainSize까지 목록화 | 737 |
| 전개한 도형 영역 정의 | 267 |
| 실제 도형 생성 유형 | 252 = 등록 ID 248 + 인라인 4 |
| 전개했으나 asset 없는 정의 | 15 |
| 유한 후보 | 42,193 = 등록 ID 17,552 + 인라인 24,474 + noasset 167 |
| 현재 표시 / 숨김 또는 그림 없음 | 32,152 / 10,041 |
| 표시 유형 / 숨김 asset 유형 | 127 / 125 |
| 서로 다른 동결 원본 / 최종 표시 SVG | 15,183 / 31,115 |
| 원본·최종 SVG 해시 합집합 | 46,298 |

[manifest.json.gz](manifest.json.gz)는 모든 후보의 ID·인덱스·파라미터·발문·정답·렌더러·조건·화면/출력 크기·SVG 해시를 가진다. [families.tsv](families.tsv)는 737개 정의와 각 domainSize, 전개·표시·렌더러·육안 범위를 기록한다. [summary.json](summary.json)의 manifestSha256는 압축을 푼 manifest SHA-256이다. 남은 470개 비도형 정의는 수치 조합 전체를 그림으로 렌더했다는 뜻이 아니다. 무한 난수나 모든 미래 seed를 검사한 주장도 아니다.

등록 SVG 맵과 전개 ID 집합을 양방향 대조했다. 고아·중복 등록 ID, 후보 검증 실패, 그리기·수식 조판 fallback은 각각 0개다. 바이트 중복은 렌더 검사에서만 합쳤다. 조건과 정답 검사는 42,193행 각각 수행했다. 같은 원본 바이트를 쓰는 추가 등록 ID는 2,369개다.

초등 도형·길이·넓이·각, angle pack, 중등 삼각형·사각형 관계·중심·닮음·피타고라스·삼각비·원·입체까지 실제 생산 정의와 맵을 포함한다. 그래프·함수·통계·자료 영역의 현행 정의는 문장·계산식·표 계산이며 별도 SVG 생산 경로가 없음을 registry, 정의, figure-first 등록과 소비자 호출 검색으로 확인했다. src/lib/middle 레거시 은행만 조사한 결과가 아니다. 그림은 카탈로그에서 생성되므로 DB 목록 조회가 필요하지 않았다.

## 실제 경로와 결함

registry → problemAt → geometry.ts/extraGeometry.ts의 동결 원본 → GradeArithmeticPrompt 또는 arithmeticOutput → figureFirstSvg → 기존 수식 조판 → NativeProblem/A4가 실제 경로다. figure-first는 앞단 presentation 검사 뒤에 다시 그릴 수 있어 앞단만 검사하면 실제 결함을 놓친다.

| 심각도·범위 | 확인한 결함 | 결과 |
|---|---|---|
| P1 · 사다리꼴 대각선 중점 20개 | PQ target이 밑변처럼 보이고 올바른 치수선·중점 구분 부족 | 실제 PQ 강조, 양 밑변·PQ 치수, 별도 midpoint tick 그룹 |
| P1 · 평행 단면 64개 | AE:EB 비 조건이 최종 그림/조건에서 누락 | 실제 공개 조건에 복원 |
| P1 · 인라인 20,038개 | 스케일 불변 길이 비·삼각비·정규화 면적이 공개 조건과 불일치 | 실제 제약으로 모든 24,474개 재계산, 최종 불일치 0 |
| P2 · 68유형/26,693개 교정 범위 | 자체 TS 그리기·치수/기호·서체/배치가 기준 엔진과 다름 | 기존 Python FigureScene으로 오프라인 컴파일 |
| P2 · 감사 중의 확대 후보 | 세로 합성으로 414개의 명목 수학 font-size가 10 CSSpx 미만 | 2,996개 전체 재컴파일, 아래 공통 합성 규칙 적용 |
| 원본 부채 | 동결 원본 숫자 각 겹침 45개, 숨김 BD leader 길이 0인 3개 | 역사적 바이트 보존, 현재 표시와 구분 |

P2의 26,693은 공통 교정 범위이며 전부에 같은 개별 결함을 확인했다는 수가 아니다. 표의 범위는 겹치므로 합산하지 않는다. 유형별 모집단·교정·잔존·육안 수는 [quality-findings.tsv](quality-findings.tsv)에 있다. 인라인 기존 불일치는 length-given-ratio 2,380, area-given-sine 1,889, side-from-area-sine 14,847, sine-from-area 922개다. 균일 축척은 이 불변량을 바꾸지 않으므로 단순 축척 차이를 결함으로 센 것이 아니다.

동결 geometryTriangles/core.ts는 regex로 given을 추출한 뒤 첫 값만 남기는 역사적 TS 240×240 렌더러다. 이 원본은 덮어쓰지 않았다. 현재 표시에서 별도의 자체 그리기와 삼각비 clamp도 확인되어 생산 projection을 교체했다.

## 공통 교정과 치수 예외

기준은 [엔진 가이드](../../../09-figure-engine-guide.md)와 실제 vendor/figure-engine/core 구현이다. 기존 authoritative Python FigureScene으로 **등록 2,219개/64유형 + 인라인 24,474개/4유형 = 26,693개/68유형**을 컴파일했다. 공개 제약에서 좌표를 계산하고 기존 엔진이 치수 곡선, 동등·평행·직각 표시와 글자 배치를 결정한다. TS에 도형 엔진을 이식하지 않았다. 클라이언트는 안전 SVG의 손실 없는 문자열 codec만 실행하며 AI·runtime Python·생성 시 네트워크 호출은 없다.

공통 엔진에서 전체 치수의 변을 중점 표시용 부분 선분이 가로지른다고 오인하던 포함 관계를 양방향 기하 판정으로 수정했다. 실제 tick·parallel 잉크도 충돌 검사한다. 글자 여백, 비공선 충돌과 직각의 수학 검증은 유지한다. MathJax는 기존 편집기의 실제 glyph/metrics를 재사용한다. 144개 label의 metrics 일치, 기존 사전 불변, 유한 새 entry 8개와 새 glyph 0개를 확인했다.

모든 공개 given과 치수 표시 대상 target을 먼저 시도한다. 기본 실패 시 같은 엔진의 7개 공통 offset/inset 설정을 시도해 실제 누락이 최소인 배치를 채택한다. 임의 좌표, 무시한 충돌, 글자 축소로 검사를 우회하지 않는다. 원래 group instruction이 AC를 직접 묻는 whole-side 45개는 그 관례대로 AC를 강조하고 중복 x 치수를 요청하지 않는다. 실제 given을 빠뜨리거나 치수 거부를 해결했다고 센 것이 아니다.

[dimension-audit.json.gz](dimension-audit.json.gz): 요청 54,714 = 실제 배치 54,088 + **잔존 626개/451개 ID**(given 474 / target 152), 분실·중복 0개다. 잔존 치수는 AC=2 cm, BO=x cm처럼 정확한 선분명·값·단위를 실제 본문에 남기고 대상 선분을 강조한다. 이전 prose-only 예외도 자동 면제하지 않는다. 10,008회 거부 시도는 최종 누락 수가 아니다. **7개 설정 실패는 모든 가능한 배치의 불가능성 증명이 아니다.** 이 451개를 전체 그래픽 치수 품질 통과로 분류하지 않는다.

원래 조건·실제 채택 치수·시도와 거부·최종 residual은 [engine-proof.json.gz](engine-proof.json.gz)에 있다. 부모가 최대 누락 대표 23개/23유형의 [추가 접촉판](residual-contacts/contact-1.png)·[2](residual-contacts/contact-2.png)·[3](residual-contacts/contact-3.png)·[4](residual-contacts/contact-4.png)을 열었고, 실제 presentation에서 451개 ID의 626개 조건이 정확히 한 번 남는지 독립 확인했다([조건](parent-residual-public-lines.json), [시각 범위](parent-residual-visual.json)). 이는 451개 전부의 개별 육안 승인이 아니다. 직사각형 대각선과 외각 이등분선 예외도 실제 A4 3쪽에 포함했다.

매우 가까운 꼭짓점에는 전체 그림과 정확한 국소 확대를 함께 제공한다. 2,996개 모두 기존 엔진으로 실제 재컴파일했다. geometry만 공통 0.65 view budget으로 균일 조정하고 measured 수학 type은 유지한다. 실제 엔진 bounds에서 가로/세로 중 최대 extent가 작은 배치를 고른다(490 가로/2,506 세로). 확대 긴 변의 잘림, 점 이름과 설명을 남기며 숫자 zoom이나 target 수치 답을 넣지 않는다. 최종 280px 기준 **최소 명목 수학 font-size 13.0076 CSSpx, 설명 font-size 10.8397 CSSpx**다. 이는 glyph의 실제 ink 높이나 전수 인간 가독성 보장이 아니다. [detail-invariants.json](detail-invariants.json)과 A4 2~3쪽을 함께 본다.

## 보고된 사다리꼴의 실제 전후

동일한 AD=4 cm, BC=10 cm 조건에서 실제 PQ를 그린다. AD∥BC, AP=PC / BQ=QD를 구분한 tick 그룹, 양 밑변의 치수선과 PQ의 x cm가 있다. target에 답 3 cm를 적지 않는다. 전 20개 변형의 기하·givens·target을 독립 검사했다.

| 크기 | 이전 | 최종 |
|---|---|---|
| 화면 | [280×280px](reported-before-screen.png) | [280×228.758px](reported-after-screen.png) |
| 실제 출력 규격 | [74.08×74.08mm](reported-before-paper.png) | [74.08×60.523mm](reported-after-paper.png) |

[이전 SVG](reported-before.svg)와 [최종 SVG](reported-after.svg)는 실제 생산 함수를 호출해 캡처하고 네 PNG를 열어 읽었다. reported-engine-probe.*는 초기 엔진 실렌더 비교 자료이며 최종 납품 이미지가 아니다. A4 1쪽에는 보고 사례와 가장 짧은 PQ 사례를 함께 넣었다. 엔진 기본 도형 1.9 / target 2.6 SVG단위의 선과 단색 인쇄를 확인했다.

## 전수 자동 검사와 실제 육안 범위

46,298개 원본/최종 SVG 전부에 해시, 안전 요소·속성, 유한 좌표, 양수 frame, 비어 있지 않음, 길이 0인 선 검사를 했다([structure.json](structure.json)). 구조 후보는 앞서 설명한 숨김 동결 leader 3개뿐이다. 현재 정책을 바꿔 빈 그림/숨김으로 검사를 통과시키지 않았다.

실제 브라우저에서 화면과 physical print 참조 크기의 **92,596 관측**을 최종 해시와 대조했다([browser-coverage.json.gz](browser-coverage.json.gz)). 출력 참조 크기는 arithmeticGeometryDisplaySize, figureSvgUrlPrintMm, 반올림한 figureWidthStyle에서 얻었다. 새 엔진 최종 해시 25,903개/51,806관측은 checker v2, 기존 최종 5,212개와 동결 원본 15,183개/40,790관측은 앞선 checker다. 버전 범위를 감추지 않는다. 실제 print media/PDF 검사는 별도로 아래 생산 컴포넌트에서 했다.

새 엔진 화면·출력의 잘림/글자·선 겹침 후보는 0개다. 기존 표시의 60개 해시/120관측은 자기 숫자와 수치적으로 같은 각도 호의 bounds 후보로, 접촉판과 실제 mask/halo·잉크를 보고 분류했다. 0폭/보이지 않는 선이라고 주장하지 않는다. 동결 gm-m3-trig-triangle-area의 원본 45개/90관측은 예전 겹침 부채로 남고 현재 presentation은 이미 교정한다. 자동 bounds 검사는 모든 지각적·교육적 품질을 증명하지 않는다.

기본 접촉판은 **표시 402개 ID/127개 모든 표시 유형 + 숨김 원본 250개 ID/125개 모든 숨김 유형 = 652개 ID/42판**이다. [visual-review.json](visual-review.json)은 현재 PNG SHA와 pictured SVG SHA가 실제 view_image 열람 기록과 일치할 때만 inspected로 인정한다. 부모의 마지막 10판/146개 pictured ID 독립 열람은 [parent-contact-review.json](parent-contact-review.json)에 별도 actor로 기록했다. 추가 23개 치수 예외 샘플은 위 별도 목록에 있다. 기본 접촉판 기준 **표시 31,750개는 개별 육안 미검토**다. 일부 예쁜 그림이나 녹색 테스트로 전체 품질을 승인하지 않는다.

2,844개 원본 삼각형/특수각 모델에서 유한 좌표·비퇴화·동등·평행·직각·공개 길이와 실제 표시 GT의 각/길이/넓이 target을 독립 검사했다([triangle-invariants.json](triangle-invariants.json)). 실제 최종 인라인 24,474개의 공개 삼각비·길이 비·면적, 확대 2,996개의 방향·균일 변환·절단·점 소유, 특수 길이 GM 342개의 public a/b/c·각·근호 답은 각각 실패 0개다. 직렬화 좌표 ±0.0005의 반올림 구간을 전개했다. 숨김 모델과 범위 밖 target은 해당 보고서에서 별도 표시하며 수학 검토를 받았다고 확대하지 않는다. 26,693개 raw 엔진 바이트와 82,428개 점 소유자도 실제 TS decoder에서 재생하여 불일치 0개다.

미교정 자체 triangle renderer 1,326개/24유형은 전체 구조·렌더 검사와 유형별 접촉판 범위에 포함하지만 전부 개별 육안 승인한 것은 아니다. gm-m3-trig-triangle-area-2-10-90의 작은 2 cm는 명목 8.177 CSSpx다. A4 3쪽에서 부모와 작업자가 읽었고 잘림/새 겹침은 확인하지 않았지만 **작은 글자라는 가독성 한계**를 남긴다. 새 확대 그림의 최소 font-size를 이 기존 사례에 적용하지 않는다.

## 실제 컴포넌트·저장 호환성

production.tsx는 메모리 sheet를 만들고 동결 snapshot으로 정상 재개하여 GradeArithmeticExpression, arithmeticToStudioProblems, gradeArithmeticPaperPages, A4Page/NativeProblem을 실행한다. 12개 문제의 문제지 3쪽과 정답지 1쪽을 Chromium PDF로 만들고 Poppler 120dpi로 전 페이지를 열어 읽었다. 두 폰트 load와 24개 실제 img decode/DOM 크기는 [production-browser.json](production-browser.json), PDF·페이지 해시는 [production-inspection.json](production-inspection.json)에 있다. 근호·분수·cm², residual 조건과 target 답 누출 여부를 확인했다. 실물 프린터·배포 모바일·학생 학습 효과 검증은 아니다.

[compatibility.json](compatibility.json): 42,193개 후보의 ID·인덱스·파라미터·발문·정답·원본 해시 변경 0개, 제거 display 0개다. 등록 17,552개 ID, v1 angle snapshot과 v2 self-contained subset pack은 그대로다. 최종 display만 26,693개 교정했다. 새 engine-figures-v1/engine-inline-v1은 별도 표시 자산 버전이다. 검증된 동결 원문 전체 일치로 projection을 허용하며 인라인은 순서 정규화된 전체 Unicode prompt가 일치해야 한다. hash는 위치 탐색만 하며 임의 제출 압축 데이터를 풀지 않는다. engine-owned 미등록 변형은 옛 clamp로 돌아가지 않는다.

계약·schema·DB reader/writer·저장 필드를 추가하지 않아 새 writer 활성화가 없다. 출시 자산은 다른 payload로 덮어쓰지 못한다. 모든 교정은 첫 커밋 전 미출시 v1 후보에서 이루어졌다. [engine-provenance.json](engine-provenance.json)은 실제 이전 compile fingerprint와 현재 출처를 구분한다. strict leader 5개 분기의 AST 동일성은 vendor compatibility guard에만 해당한다. compound 2,996개/5,992view는 현재 소스로 실제 재컴파일했고 나머지 23,697개 raw 출력은 보존했다. 옛 cache의 compiler를 새 것으로 재명명하지 않았다. 일반 모드 leader는 원래 fallback으로 복구되어 원래 frozen28 테스트를 수정하지 않고 16개가 통과한다. 포함 선분·marker 충돌의 의도된 엔진 개선까지 모든 ordinary SVG가 바이트 동일하다고 주장하지 않는다.

## 용량과 성능

같은 figureFirstSvg/크기 facade를 esbuild로 비교했다([bundle-comparison.json](bundle-comparison.json)): 기존 6,063,867 bytes / gzip 4,206,106, 현재 11,629,629 / gzip 8,125,428이다. 증가분은 실제 품질 교정 비용이다. Next production build나 배포 chunk 실측으로 부르지 않는다.

| 동일한 2,000개 유일 입력 | 이전 브라우저 projection | 최종 브라우저 projection |
|---|---:|---:|
| 인라인 4유형 | 78.7ms | 473.2ms |
| 등록 64유형 혼합 | 3,316.9ms | 99.8ms |
| 같은 등록 입력 유형별 정렬 | 165.4ms | 96.6ms |
| 전체 68유형 혼합 | 2,430.1ms | 161.6ms |

각 cell은 새 navigation·고유 cold module URL에서 실제 수식 조판과 SVG 생산 함수를 실행했다. 최종 module import 42.3~53.6ms, 첫 이미지 및 20개 실제 img decode가 모두 성공했다([browser-performance.json](browser-performance.json)). 인라인은 이전보다 느리다. localhost 비압축 전송, 단일 trial이며 배포·모바일·전체 앱 성능 보장이 아니다. 브라우저 heap은 양자화될 수 있는 보고값으로 독립적인 retained heap이나 RSS 측정이 아니다.

등록 cache는 lazy 최대 64유형(약 12.1MB **decoded JSON**, JS heap 상한 아님), 인라인 raw chunk는 64행×8개, parsed FIFO는 256행이다. 이전 4유형 cache는 혼합 때 반복 해제로 병목이 생겼다. 독립 검토에서 64유형 첫 전체 pass 64회 inflate, 두 번째 추가 0회를 확인했다. 부모의 최종 raw decoder Node24 측정은 인라인 237.06ms, 등록 혼합 35.03ms, 정렬 40.32ms, 전체 혼합 100.84ms다. retained delta 10.46/20.58/20.55/23.22MB이며 input preload·조판·DOM·네트워크를 제외한 명시적 GC의 단일 trial이다([decoder-performance-final.json](decoder-performance-final.json)). 앞선 decoder-performance.json 등은 이전 단계 기록이며 최종 수치로 사용하지 않는다.

## 검사·독립 검토·재현

기존 산술 8파일/62테스트 통과 후 compact 자산 변경에 해당하는 3파일/17개 중 새 조건문 테스트의 잘못된 빈 prose 기대를 고쳤다. 공개 tan/넓이/sin 조건은 유지하고 engine의 dimension residual을 별도로 검사한다. 교정된 파일 5개 테스트와 나머지 2파일의 12개가 통과했다. 기존 MathJax 회귀 8개, 공유 dimension/marker 검사와 변경 없는 frozen28/16개, Python dimension 7개·detail 3개·leader 3개가 통과했다. 필요한 focused TypeScript(Next의 실제 CSS module 선언 포함)와 변경 production/unit ESLint도 통과했다. 의미 있는 mutation은 잘못된 leader metrics/contained-chord 검사를 실제 실패시켰다. 전체 Next production build와 무관한 전체 테스트 반복은 하지 않았다. 최초 forks startup timeout은 threads 재실행으로 해소했고 최종 성공으로 숨기지 않는다.

[초기](review-initial.md)·[중간](review-staged.md)·[source delta](review-source-delta.md)·[최종 고정 소스/자산](review-stable-final-assets.md) 독립 Codex 리뷰를 보존한다. sanitizer 속성, 64개 비 조건 누락, 부분 pack 게시, 가짜 출력 크기, clamp, fallback 집계와 cache churn 등 도입/확인된 actionable 사항을 교정했다. 최종 source/assets 검토는 새 P1/P2가 없었고 P3 명목 font-size와 ink 높이 용어를 바로잡았다. [최종 증거·보고서 독립 검토](review-final-evidence.md)는 173개 해시, 92,596개 관측, 42개 접촉판과 PDF 전 페이지의 재렌더 digest를 대조하고 전후 이미지·네 A4 페이지를 직접 읽어 **명시된 범위와 한계 안에서 승인**했다. 새 actionable P1/P2는 없으며 source 승인도 유지한다. 부모 main UI 통합은 이 승인의 별도 범위다.

```sh
# repo root; 기존 설치 의존성 사용, DB/env/production build 불필요
node node_modules/tsx/dist/cli.mjs scripts/qa/arithmetic-figure-quality/census.ts
python3 scripts/qa/arithmetic-figure-quality/structure.py
python3 scripts/qa/arithmetic-figure-quality/geometry-after.py
python3 scripts/qa/arithmetic-figure-quality/detail-invariants.py
node scripts/qa/arithmetic-figure-quality/typecheck.mjs
python3 scripts/qa/arithmetic-figure-quality/serve.py
# http://127.0.0.1:3197/docs/planning/tracks/reports/arithmetic-figure-quality-20261112/gallery.html
```

census는 중복 대용량 assets.json.gz와 bounded read용 assets.ndjson을 재생성한다. 두 파일과 raw browser JSONL·runtime bundle은 git에서 제외하며 최종 manifest·관측·proof는 압축 보존한다. source 모델 입력과 compiler scratch는 models.ts/trig-models.ts로 /tmp/arithmetic-figure-quality에 만들 수 있다. engine.py는 전체 기대 ID가 성공한 경우에만 자산을 게시하고 출시 version guard를 유지한다. recompile-details.py는 이 작업의 특정 미출시 후보에 대한 one-time migration이며 출시 자산에 재적용할 명령이 아니다. SHA256SUMS는 최종 code/자산/증거를 고정한다. 통합·push·배포와 main UI 소비자 검토는 부모가 소유한다.

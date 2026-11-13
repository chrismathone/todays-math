Final read-only evidence/report delta, 2026-11-14.
대상: `/Volumes/새 볼륨/today-worktrees/today_/arithmetic-figure-quality-20261112`.
대상/main 변경, browser·worker·build·network·DB/env 작업 없이 검토했다.
PDF skill의 read-only 절차에 따라 기존 페이지 PNG를 직접 읽고,
PDF를 stdout으로만 재렌더해 보존 이미지와 대조했다; 생성 파일은 이 보고서뿐이다.

**최종 증거/보고 승인: 승인한다.**
이는 README에 명시한 유한 모집단, 자동 검사, 표본 육안, 실제 메모리 fixture/A4,
잔존 조건과 성능 측정의 범위·한계에 대한 승인이다.
이전 stable-source/assets 승인도 유지한다; 새 actionable P1/P2는 없고 P3는 교정됐다.
모든 개별 도형의 인간 가독성·학생 효과·배포 앱·실물 프린터 품질의 보증은 아니다.
부모의 별도 main UI 통합 검토는 이 승인 범위에 넣지 않았다.

**해시와 수치 일관성**

- SHA256SUMS의 173개 현재 파일을 독립 재해시해 불일치 0개였다.
  안정된 decoder/등록/inline/compiler/vendor의 3f2a/ba9/9321/a66/8ad 출처는 유지된다.
  manifest의 압축 해제 SHA는 summary의
  `45a735266518e5a41253e2ee21bb3e0f7855b8f8b10874ed624a3431b3770575`와 같다.
- 42,193후보 = 17,552등록 + 24,474inline + 167noasset,
  32,152표시 + 10,041hidden/nonfigure의 축이 일관된다.
  families.tsv는 737행, quality-findings는 전개 정의 267행이며 실제 figure 유형은 252개다.
  470개 다른 수치 도메인의 모든 수치 조합을 시각 검사했다고 확대하지 않는다.
- quality-findings 합계는 migration 26,693, 알려진 겹치지 않는 P1 이전 사례 20,122
  (=20,038+64+20), residual ID 451 / 조건 626, own-arc 60, frozen overlap 45,
  zero leader 3, primary visual 652와 일치한다.
  migration 범위와 개별 결함 확인 수가 다른 열/설명으로 명시돼 있다.

**최종 browser와 육안 범위**

- current manifest의 최종 31,115해시와 동결 15,183해시 합집합 46,298개를 직접 만들었다.
  coverage는 정확히 92,596개의 서로 다른 `(hash, media)`이며
  screen/print 누락 0개, 현재 집합 밖 hash 0개다.
- checkerVersion=2는 51,806관측, 이전 checker는 40,790관측이다.
  accepted-own-angle-arc-bounds 120관측 / retained-frozen-source-overlap 90관측이 남고,
  이를 새 엔진 실패나 모든 원본 품질 통과로 바꿔 쓰지 않았다.
  기존 60개 own-angle 후보의 수치/수동 분류 및 원본 부채 45개가 문서에서 구분된다.
- visual-review의 42개 PNG를 모두 현재 파일 SHA, 명시적 열람 기록의 SHA,
  pictured SVG의 현재 manifest SHA에 대조했다: stale/hash 오류 0개였다.
  primary 652 ID = display 402 /127유형 + hidden source 250 /125유형,
  unreviewedRows 0개라는 기록은 이 **선정 접촉판**에 대한 것이다.
  전체 표시 중 primary 개별 육안 미검토 31,750개라는 제한도 맞다.
  부모 마지막 10판/146 pictured ID와 추가 residual 23유형 샘플은 별도 actor/범위다.
- residual-public-lines는 실제 presentation의 451개 ID/626조건에 실패 0개다.
  이 조건 보존은 그래픽 치수를 모두 배치했다는 뜻이 아니며,
  7개 설정 실패를 모든 가능한 배치의 불가능성으로 주장하지 않는다.

**실제 PDF/생산 경로 직접 확인**

- production.tsx는 실제 GradeArithmeticExpression, arithmeticToStudioProblems,
  gradeArithmeticPaperPages/A4Page/NativeProblem을 호출하고 정상 동결 pack reader를 사용한다.
  이는 메모리 fixture의 실제 생산 projection 검사이며 DB 저장/앱 navigation 검사는 아니다.
- PDF는 Chromium/Skia 문서, 4쪽, A4 594.96×841.92pt,
  JavaScript 없음, 암호화 없음으로 확인했다.
  SHA는 `2d1279ae7790aaa385bdbfbe4a5726f31054d72868b70804a02e8262ca897cb6`다.
- PDF 4페이지를 현재 Poppler로 120dpi/PNG stdout에 각각 재렌더했다.
  네 digest가 보존된 production-page-1~4 PNG와 **모두 정확히 같았다**.
  이미지 크기 992×1404도 PDF page size/120dpi와 일치한다.
  네 페이지를 직접 열고 읽었으며 새 clipping·잘못된 target/조건·답 누출을 찾지 못했다.
- 1쪽: PQ의 두 midpoint tick 그룹과 base/PQ 치수, 좁은 PQ, AE:EB=1:2,
  피타고라스의 x/9cm/3cm와 직각 표기를 확인했다.
  2쪽: tan=12/8과 area/sine 조건은 실제 본문에 남고,
  detail caption과 짧은 변의 점/치수 연결이 명확하다; worst12237도 실제 페이지에 있다.
  3쪽: S=1, rectangle AC=2/BO=x, external BD=56 residual이 남고,
  기존 thin GM의 2cm는 작다는 한계를 문서대로 확인했다.
  4쪽: 12개 답의 번호·분수·근호·단위가 맞고 앞 문제 도형에 답 숫자를 적지 않는다.
- 공개 조건으로 spot 계산한 답 3,1,11/3,6√2,24,24,1/4,44,1/72,1,21,10cm²가
  정답지와 일치한다.
- 24개 img가 모두 decoded, 두 폰트 loaded인 retained DOM 기록과
  reported 전후 screen/rounded 74.08mm sizing 수치가 실제 helper 사용과 맞는다.
  reported 전후 네 PNG도 직접 열었다: 이전 x가 BC처럼 보이던 문제와
  현재 실제 PQ target/치수/조건의 교정이 확인된다.

**용어·검사·성능의 한계**

- P3는 source/JSON/README 모두 `minimumNominalMathFontCSSPx` /
  `minimumNominalCaptionFontCSSPx`로 고쳤고 formula도 font-size임을 명시한다.
  13.0076/10.8397을 glyph ink 높이나 전체 가독성 승인으로 쓰지 않는다.
  기존 noncompound GM 2cm의 nominal 8.177 CSSpx도 숨기지 않았다.
- validation 로그에서 62 pass, final compact의 초기 잘못된 assertion 1 fail,
  그 교정 후 5 pass 및 나머지 12 pass, ordinary frozen의 16 pass를 확인했다.
  초기 실패를 삭제하지 않고 공개 prose 보존/치수 residual 검사를 구분한 교정이다.
  TSC14-entry·ESLint8-file 및 Python/독립 재사용 검사의 제한 범위도 명시돼 있다.
- browser-performance의 8 cell은 각각 2,000입력, missing=0,
  실제 수치와 README의 네 전후 비교가 일치한다; 기록된 source/bundle 8개 hash도 맞다.
  gzip 4,206,106→8,125,428 bytes의 증가와 inline 78.7→473.2ms의 악화도 공개한다.
  등록 mixed 3,316.9→99.8ms 등 개선만 골라 보고하지 않는다.
  단일 trial, 비압축 localhost, browser-reported heap, 별도 raw Node decoder라는
  한계가 적절하며 배포/mobile/전체 Next 앱 성능으로 확대하지 않는다.

**종료 조건**

새 수정 요구나 미해결 review blocker는 없다.
이미 예정된 FINAL-REVIEW-PENDING 문장 교체, 이 최종 리뷰의 보존,
checkpoint/SHA256SUMS의 기계적 refresh를 마친 뒤 진행해도 된다.
그 refresh가 제품 소스·자산·검사 내용 변경을 동반한다면 변경된 부분은 별도 검토 대상이다.

Stable source/assets review, 2026-11-14.
Target: `/Volumes/새 볼륨/today-worktrees/today_/arithmetic-figure-quality-20261112`.
최신 dispatch의 고정 source/asset SHA와 실제 파일을 기준으로 검토했다.
CHECKPOINT의 이전 batch 설명과 provisional 최종 증거를 현재 승인으로 해석하지 않았다.
대상 파일·main 수정, browser/worker 실행, DB/env, build, push 없이 읽기와 짧은 단일-process
in-memory 검사만 수행했고 이 보고서만 자신의 worktree에 작성했다.

**판정:** 새로 재현한 P1/P2 product/source 결함은 없다.
현재 소스·자산과 별개로 진행 중인 browser/A4/PDF/performance/report 증거는 승인하지 않았다.
아래 cache·identity·동결 snapshot·기하·residual 검사는 직접 실행한 결과다.

**Decoder / cache / 저장 gate**

- 실제 현재 TS decoder를 메모리에 transpile하여 두 최종 JSON 자산과 기존 fflate로 실행했다.
  모든 26,693개 raw SVG가 최신 완료 proof의 SHA와 일치했고,
  inline 24,474개의 JSON key 역순도 모두 같은 SVG였다.
  등록 canonical 변조 2,219회, inline text/latex/instruction/answerUnit 및 extra key
  변조 20회, 합계 2,239회가 거부됐다.
  hash는 후보 위치 탐색이고 전체 원문 비교가 승인 조건이라는 구조는 유지된다.
- cache는 처음 0/0/0, 등록 한 예시를 읽으면 family 1개만 풀었다.
  등록 2,219개를 모두 읽은 뒤 정확히 64회 inflate / 64개 family였고,
  같은 전체 등록 행을 다시 읽을 때 추가 inflate는 **0회**였다.
  이후 inline 전개까지 cache 상한은 registered 64 / raw chunk 8 / parsed row 256이었다.
  `engineFigures.ts:39–53`의 lazy finite-set cache는 이전 4-family mixed churn을 해소한다.
  이 상한은 decoded JSON 문자열·객체의 전체 heap/RSS나 정적 bundle 비용을 뜻하지 않는다;
  주석의 약 12.1MB는 decoded JSON 크기이며 실제 JS heap 상한으로 읽으면 안 된다.
- 같은 production geometry/figureFirst 함수를 메모리에서 실행해 실제 v1 angle pack과
  v2 subset pack을 각각 만들고 projection 전후 원문과 pack의 byte identity를 확인했다.
  두 경우 모두 변경된 `svgPack`은 submitted compressed payload를 inflate하기 전에 거부됐다.
  사용자 DB/기존 학생 기록을 읽은 검사가 아니라, 현 저장/소비자 함수의 deterministic 검사다.
- geometry.ts, geometryPack.ts, frozen TS core, v1 angle asset, 저장 contract에 diff가 없다.
  기존 저장 canonical을 검증한 뒤 display projection을 허용하는 순서는 유지된다.
  새 record 필드/DB writer나 임의 SVG inflation 통로는 찾지 못했다.

**Shared engine compatibility / 실제 compile 출처**

- 최종 vendor의 5개 `clear_angle_labels` 조건식을 strict=True branch로 독립 정규화했다.
  그 AST는 보존된 실제 b501 compile source와 정확히 같았다.
  완료 proof의 main 26,693개 및 detail 2,996개 모두 strict style이다.
  ordinary 모드에서 leader helper에 이전 None fallback을 주는 source delta라는 설명과 맞는다.
- 따라서 ordinary compatibility guard 때문에 이전 strict raw 출력을 새 compiler로
  “재생성했다”고 재명명할 필요가 없다; provenance는 이전 실제 compile을 남기고 있다.
  compound 2,996개는 두 engine view를 실제 재컴파일한 별도 출처가 있고,
  나머지 23,697개 raw 출력 보존도 부모의 자료와 일치한다.
- ordinary-compatibility.patch, engine-provenance, recompile-details의 guard를 읽었다.
  recompile script는 HEAD에 없는 미출시 candidate와 특정 이전 asset SHA를 요구하고,
  기존 engine.py의 출시 version guard는 유지한다.
  기존 cache entry의 compiler fingerprint를 덮어 새 출처인 것처럼 만드는 코드는 없다.
- 부모가 확인한 원래 frozen 28 / unchanged test 16 pass는 그 범위의 별도 증거다.
  이를 “모든 ordinary SVG가 과거 byte와 같다”로 확대해서는 안 된다:
  contained-chord 및 실제 tick/parallel ink 교정은 공통 dimension 배치의 의도된 변화다.

**Compact 상세도 / 가독성 / 답 누출**

- 이전 proof와 현재 proof의 모든 compound overview/detail을 직접 비교했다:
  2,996개, 26,964개 point coordinate에서 정확한 균일 0.65 배율이었고,
  다른 spec 필드의 예상 밖 변경은 0개였다.
  수치 label 크기를 0.65로 줄이는 SVG wrapper가 아니라,
  authoritative scene_spec의 geometry budget만 바꾸고 measured type은 유지한다
  (`engine.py:17–23`); 실제 resolved bounds로 수평/수직을 고른다(138–156).
- 기존 2,996개 close-pair의 정확한 short vector, 각, crop 방향과 far vertex 이전의
  잘림 규칙은 이 균일 배율로 보존된다.
  caption 두 줄, 양끝 point names, 긴 변 continuation dash는 남고,
  detail의 잘린 ray 길이를 전체 긴 변 길이로 표기하지 않는다.
  숫자 zoom/새 조건/target numeric answer를 넣는 경로는 찾지 못했다.
- 부모 final-compact-detail-probe의 실제 최종 projection 280px PNG 4개
  (length:197, side:12555, side:960, sine:1515)를 직접 열었다.
  197의 수평 두 panel은 이전 긴 세로 배치보다 분명하고,
  960/1515의 가까운 점·짧은 변은 detail에서 구분되며 잘림 caption이 보인다.
- 실제 current figureFirstSvg로 최소 nominal font 사례 side:12237도 읽고,
  파일을 만들지 않는 메모리 raster에서 280px 실제 extent로 직접 보았다.
  viewBox 182.910 × 361.634, 실제 frame 약 141.621 × 280px,
  projection SHA `f8b1e66806e32188fbf160f2cb33e7cd738f4af0d52ef594f85be71cd626d16a`다.
  overview의 A/B가 가깝지만 아래 A·B detail의 2 cm와 점 연결이 구분되고,
  x cm는 전체 AC를 가리킨다; 확대부 긴 변의 완성 길이로 읽게 하는 새 숫자는 없다.
  이 5개 raster 관찰은 2,996개 전부의 육안 승인이나 Chromium/실제 인쇄 승인이 아니다.
- **증거 용어 정밀화 (P3, 새 compact 측정 표기):**
  detail-invariants의 `minimumMathGlyphCSSPx` 13.0076은 `data-fs × 화면 배율`의
  nominal font-size이며 glyph의 실제 ink 높이가 아니다.
  caption 10.8397도 nominal CSS font-size다.
  최종 문서에서는 font-size라고 명시하거나 metric 이름을 바꾸고,
  이를 실제 glyph ink의 최소 높이/전수 인간 가독성 증명으로 쓰지 않는 것이 정확하다.
  이 표기 문제를 수치 기하 실패나 새 P2 제품 결함으로 세지는 않는다.

**공개 조건 / census / 남는 예외의 정확한 의미**

- 모든 26,693개 proof에서 initial condition = fitted ∪ residual, 중복/분실 0개였다.
  요청 54,714 = 실제 치수 표기 54,088 + 잔존 626이다.
  잔존 ID는 451개, given 474 / target 152이며 compound residual은 0개다.
  named given/target x의 조건 보존과 그래픽 치수의 생략은 다른 판정이다.
- whole-AC의 원래 group instruction은 AC를 직접 묻는다.
  그 45개에서 중복 x dimension을 요청하지 않고 highlight하는 정책은 임의 target 삭제가 아니다;
  AE 같은 실제 given을 보존하며 그 선택을 residual “해결”로 섞어 세면 안 된다.
- 7개 공통 설정에서 남은 626개는 모든 가능한 배치가 불가능하다는 증명이 아니다.
  예외를 포함한 451개 문제를 별도 공개하고 최종 실제 print에서 읽히는지 평가해야 한다;
  “전체 도형 결함 0” 또는 “모든 치수 표시”로 요약하면 안 된다.
- census source는 actual figureFirstSvg 및 policy/typography 경로를 포함하고,
  map의 고아/중복 ID와 typesetting fallback을 추적한다.
  모집단 42,193 = 등록 17,552 + inline 24,474 + noasset 167,
  표시 32,152 + hidden/nonfigure 10,041은 서로 다른 축으로 일관된다.
  267개 전개 정의 중 실제 figure types는 252개이고, 모든 737개 수치 도메인을
  시각 전개했다는 뜻은 아니다; byte dedup과 조건별 행 검사는 계속 분리해야 한다.

**최종 증거 단계의 잔여**

진행 중인 변경 hash별 browser 관측, 최신 contact·예외 검토,
실제 11문제 A4/PDF, 최종 성능/용량 수치와 문서·hash 정리는 별도 delta에서 확인해야 한다.
이번 source/assets 판정은 해당 작업이나 부모가 담당하는 main UI lazy 소비자를 승인하지 않는다.

검토한 고정 hashes:
engineFigures `3f2a49b12417340d2a50248f5c04eef2cb8d46b8431448735c4ed36858c3abe5`;
registered `ba9ec5eb49bb8dfa0592c1af96b84b81c4607abf4499d23d5b773f9ad6249fef`;
inline `9321fe702de3643955a93fdf1ece059376873509353b28f45826be726393a6c6`;
engine.py `a66bd2b3af1c0b11a74cfbc77b5825f9b4f1321a87250075f345375b861758d7`;
vendor `8ad0d62916ab5060e6f4ab1f6beb78d8ef569bf4d95cb71f7cd96889a9610faa`.

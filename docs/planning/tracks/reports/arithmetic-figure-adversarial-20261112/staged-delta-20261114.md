2026-11-14 read-only staged delta review.
대상 `/Volumes/새 볼륨/today-worktrees/today_/arithmetic-figure-quality-20261112`의
최신 CHECKPOINT를 먼저 읽었다; 전체 최종 자산 승인 요청으로 해석하지 않았다.
대상 소스·DB/env를 변경하거나 browser/Chromium·install·build·push를 실행하지 않았다.
자산 두 개의 일시 부재와 이전 후보 report/hash는 실행 중인 재생성의 잔여이며 회귀로 세지 않았다.

**P1/P2 판단:** 이 delta에서 새로 재현한 P1/P2는 없다.
이전 tick P2는 실제 원래 반례로 교정을 확인했다.
수학적 의미·조판 경로·prototype 이미지는 아래 범위에서 개선을 확인했지만,
새 전체 자산·관측·PDF·성능을 아직 승인한 것은 아니다.

- `vendor/figure-engine/core/figure_scene.py:2514–2524`는 supporting segment가
  own chord여도 equality/parallel mark를 별도로 검사한다.
  원래 A=(0,0), M=(20,0), B=(40,0), 두 부분 tick, 전체 AB=10 cm,
  offset=1/inset=0 반례를 실제 resolve했다.
  이제 control=(20,13.829508...)의 더 큰 곡선을 선택하며 실제 tick 교차 0개다.
  contained-chord 교정을 되돌리거나 충돌 검사를 약하게 만들지 않고 회복한 수정이다.
- measured leader metrics는 stop radius → drawable 판정 → 선택 중 leader obstacle →
  resolve obstacle → 최종 SVG emission에 모두 같은 `self.label_metrics`를 넘긴다
  (`figure_scene.py:615–694`, `1979–1984`, `2657–2660`, `2916–2922`).
  선택과 출력이 다른 폭을 사용하는 새 갈림은 찾지 못했다.
  metrics=None/default empty mapping에서는 기존 측정 fallback이 유지된다.
  부모의 actual strict preflight 538 및 editor/render 11개 결과는 현재 vendor hash와
  일치하므로 출처를 구분해 유지하며, 내가 같은 browser/editor 검사를 재실행했다고 하지 않는다.

**조판과 이전 사전·소비자**

- 현재 editor `mathjaxLabel.ts`, arithmetic label grammar/typography TS를 메모리에서만
  transpile해 기존 설치 MathJax/fflate와 실행했다.
  `/tmp/.../label-metrics.json`의 144개 라벨 모두 editor 실측과 정확히 같았다.
  기존 base entry 136개는 기존 width/ascent/descent와 같고, 나머지 8개는 새 extension에 있다.
  extension은 8 entries / 0 glyphs이며 기존 entry overwrite와 범위 밖 glyph ref는 0개다.
- 144개 각 라벨에 대해 실제 `data-mj` plain text를 arithmetic typography에 넣어
  전부 `data-arithmetic-typeset`/`data-label` path 조판으로 가는 것을 확인했다.
  이전처럼 tspan 때문에 수치·단위가 조판을 우회하는 경로는 이 입력들에서 재현되지 않았다.
  한글 설명 caption은 의도적으로 보통 text로 남는 별도 범주다.
- `engine.py:59–65,98`의 tspan 평탄화는 새로 생성된 trusted FigureScene SVG에만
  적용되고 이후 다시 sanitizer를 지난다; `data-mj`를 unescape한 뒤 text로 escape한다.
  임의 입력 SVG나 저장 v1/v2 원문을 새로 정규화하는 소비자 경로는 추가되지 않았다.
  top-level italic 제거 후 변수/단위의 기울임 의미는 기존 label grammar가 결정한다.
- `typography.ts:45–49`는 기존 dictionary를 손실 없이 푼 뒤 유한 vocabulary를 덧붙인다.
  typographyData.ts / typographyLabel.ts / geometry.ts / geometryPack.ts의 diff는 없다.
  기존 복합 tspan/textPath의 일반 처리 정책은 그대로다.
  새 라벨 vocabulary의 의도된 추가 외에 기존 수치 사전이나 저장 그림을 덮어쓰는 변경은 없다.
- 새 normalizer/측정/상세도는 답 필드를 입력하지 않는다.
  학생 target에 numeric answer를 복사하거나 임의 제출 압축 데이터를 inflate하는
  새 통로를 찾지 못했다; 이전 exact canonical/full prompt gate는 별도 최종 replay 대상이다.

**상세도의 수학과 실제 이미지**

- 지정된 두 screen-detail PNG(실제 longest extent 280px)와 두 typed-detail PNG(560px),
  해당 typed SVG를 모두 직접 열고 읽었다.
  960의 A/C, x cm와 짧은 변의 연결은 이전 단일 얇은 삼각형보다 분명하다.
  1515의 B/C도 확대도에서 서로 분리된다.
  상세도에는 잘라낸 긴 변의 전체 길이 숫자나 새 right/parallel 조건을 넣지 않으며,
  같은 점 이름·“부근 확대 · 긴 변은 일부만 표시” caption·끝 continuation dash가 있다.
  이 caption/dash는 잘린 두 ray를 별개 완성 도형이나 새 평행 조건으로 읽지 않도록 유지해야 한다.
- 순수 deterministic 계산으로 모든 상세도 2,996개를 다시 대조했다:
  length 448 / area 33 / side-from-area 2,477 / sine-from-area 38.
  짧은 변의 vector는 원래 vector의 양의 균일 배율이고, ray는 원래 긴 변과 같은 방향이며
  실제 far vertex에 도달하기 전에서 끝난다.
  원래 right/angle과 대응 detail angle의 최대 차이는 약 2.22e-16 rad,
  point-label 소유자는 모두 해당 가까운 두 점뿐이며 불일치 0개였다.
  crop된 ray 길이끼리의 비를 원래 전체 긴 변의 길이 비로 주장하지 않아야 한다.
- 960/1515를 현 source로 각각 한 번 실제 compile했다:
  residual 0, tspan 0이고 full-triangle data-px 소유자는 overview만 가진다.
  960은 overview angle 없음 / detail UAC angle이며,
  1515는 overview BAC / detail angle 없음으로 정확한 각의 소유 관계를 유지한다.
- **요청된 prototype 이미지에는 알려진 이전 상태가 남아 있다.**
  typed-detail-side-from-area-sine-960.svg의 overview에는 아직
  `M 57 35 A 22 22 ...` arc가 있고, 280/560px 사진에서도 짧은 변을 넘는 arc가 보인다.
  반면 현 compile의 overview `angles`는 비어 있어 이미 소스로 교정됐다.
  이는 shipping 회귀로 보고하지 않지만 이 prototype을 새 최종 이미지로 재사용하면 안 된다:
  배치 후 recapture하고 최종 이미지 hash로 다시 열어야 한다.

**Whole AC와 공개 조건**

- `gt1-m2-parallel-triangle-whole-side-4-4-2`를 실제 compile했다.
  group instruction이 AC를 직접 묻는 기존 convention에서
  target.dimension=false는 중복 x 치수만 억제하며 AC highlight는 유지한다.
  실제 요청/표기에는 AD=4 cm, DB=8 cm, AE=4 cm가 모두 있고 residual은 0이었다.
  target 답이나 새로운 수치 조건을 주입하지 않았다.
  이 정책 변경 후 치수 요청 수는 이전 후보의 수치를 그대로 쓰지 말고 최종 proof에서 다시 계산해야 한다.

**최종 artifact/evidence 단계에 남은 것**

- 새 두 pack이 완성되면 final manifest/proof/codec byte replay와 JSON 재정렬·단위/지시문
  변조 gate, overview·detail 각각의 수치 조건/표기/반복 count를 최종 hash로 대조한다.
- 모든 새 glyph/layout/detail hash의 screen/physical-print 관측,
  변경 contact 재열람, 위 두 prototype의 새 arc 없는 recapture,
  실제 saved v1/v2 소비자·catalog·A4/PDF를 최종 조판 상태에서 확인한다.
- 확장한 unique 2,000개 registered mixed/grouped 및 all-68 workload는
  작은 family에 중복 500개를 억지 배정하던 범위 문제를 피한다.
  registered family cache 4개의 churn과 grouped의 차이를 최종 수치로 함께 남기는 것이 적절하다.
  기존 3.56MB gzip/Node 334ms 값은 새 상세도·glyph 자산의 측정값으로 재사용할 수 없다.
  raw decoder/actual browser projection/20-image preview는 서로 다른 측정 범위다.
  parent lazy UI 통합과 배포 chunk 영향도 이 worktree의 facade 측정과 구분한다.
- README provisional markers, 예외 수, 최신 출처·SHA와 부모가 수행할 최종 shared tests가 남는다.
  이 검토의 “새 P1/P2 없음”은 위 잔여를 완료했다는 뜻이 아니다.

검토한 안정 source hashes:
vendor = `b501282976a3e374552ee09162fe650e1ae4fd2922715c852a670bedd4bece54`;
typography = `d0a3a9c37522ce013e4ae27569ca978899376bb9aa348b9f39a90f1ad5b7f043`;
extension = `92e6f3b41fcd39b0010f636ef1fbf503da3cd8fc62cdbcaf48948ddc92d71ec7`;
engine.py = `314d13dada0a282d149864bcefd91ee60f58de52d78a9c42ebd9d89600739d64`.

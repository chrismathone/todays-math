# 실물 에셋 트랙 — codex 병렬 생성 브리프 (2026-08-23, 원장님 지시)

RPM 중1 지면 조사(접촉 시트 16장 + 확대 실측) 결과, 문항용 실물 그림(기차·수조·
가로등류)은 **전부 벡터 일러스트**다(래스터 12장은 모두 응원 카드 — 문항 무관).
목표는 그 실물 그림을 **자작 SVG 에셋**으로 만들어 두고, `assetScene` kind
(`scripts/figure/figure_assets.py`, main `배선 완료`)가 에셋 + 치수 화살표·선분·
라벨을 **한 그림으로 합성**해 실물 맥락 문항을 출제하는 것이다.
원본 지면의 «기차/터널 그림 + ↔ 터널의 길이» 구조가 표본이다 (RPM 1-1 p118).

⚠️ RPM 그림을 **베끼지 않는다** — 소재(무엇을 그릴지)만 가져오고 형태는 새로 그린다.

## 에셋 규격 (figure_assets.py 로더가 강제 — 위반은 던진다)

1. 루트 `<svg viewBox="0 0 W H" xmlns="http://www.w3.org/2000/svg">` 하나.
   `width`/`height` 속성 금지.
2. 허용 태그: `g rect circle ellipse line polygon polyline path` 만.
   **text·id·href·url()·style·script 금지** (글자는 장면 label 이 얹는다).
   `<g>` 의 transform 은 translate/scale/rotate 수 인자만 (정제기 검증).
3. 선화 스타일: stroke #222~#555 · stroke-width 1.2~1.8 (viewBox 100 기준) ·
   fill 은 옅은 채움(무채색 또는 저채도 파스텔). 흑백 인쇄에서 형태가 살아야 한다.
4. viewBox 비율은 실물 비례로 (가로등은 세로로 길게, 기차는 가로로 길게).
   기준 치수는 폭 또는 높이 100 안팎.
5. `scripts/figure/assets/<slug>.svg` + **자기 세션의 manifest 조각**에 등록:
   `{"slug","label"(한글),"file","viewBox":[w,h],"tags":[...]}`.
   로더가 `manifest*.json` 전부를 병합하고 slug 겹침을 던진다.

## 검수 (에셋마다)

- `assetScene` 스펙으로 렌더해 스크린샷 확인 — 스모크는:
  `echo '{"version":"elem-1","kind":"assetScene","items":[{"asset":"<slug>","x":10,"y":10,"w":80}],"canvas":[120,120]}' | python scripts/figure/render_spec.py`
- 전 에셋을 한 HTML 에 모은 갤러리 스크린샷을 `C:/tmp/` 에 남긴다 (원장님 육안용).
- 금지 규격 위반 에셋 1개를 일부러 만들어 로더가 던지는 것 확인 후 삭제(변이).

## 세션 소유권 · 목록

### 세션 codex-야외 — `manifest-outdoor.json` 소유

| slug | 무엇 | 쓰이는 맥락 (RPM 실측) |
|---|---|---|
| train-side | 기차 옆모습(2~3량) | 거리·속력 «기차가 다리/터널» (1-1 p118) |
| tunnel | 터널(반원 입구, 옆에서) | 〃 |
| bridge | 다리(교각 있는 옆모습) | 〃 |
| streetlamp | 가로등 | 높이·그림자 맥락 |
| building | 건물(3~5층) | 높이 비교 |
| flagpole | 깃대(깃발 포함) | 높이 |
| mountain | 산 능선 | 등산 왕복 (1-1 p113) |
| person-standing / person-walking | 사람 실루엣 2종 | 속력·마주 보기 (1-1 p114) |
| bicycle | 자전거 | 속력 |
| car-side | 자동차 옆모습 | 속력 |
| boat | 배(강 문제) | 유속 |

### 세션 codex-사물 — `manifest-objects.json` 소유

| slug | 무엇 | 쓰이는 맥락 (RPM 실측) |
|---|---|---|
| water-tank | 직육면체 수조(물 높이선 포함 — 물면은 옅은 파랑) | 부피 (1-2 p132·138) |
| cup-cylinder / cup-cone | 원기둥 컵·원뿔 컵 | 들이 비교 (1-2 p133) |
| can | 음료 캔 | 끈 묶기 (1-2 p93) |
| cake-roll | 롤케이크 | 원기둥 부피 (1-2 p140) |
| pizza | 피자 원판(조각선 없음) | 부채꼴 |
| ice-cream-cone | 아이스크림콘 | 원뿔+반구 (1-2 p133) |
| baduk-black / baduk-white | 바둑돌 2종 | 규칙 찾기 (1-1 p118 Y자) |
| matchstick | 성냥개비 1개(빗겨 놓아도 쓰게 수직 기준) | 규칙 찾기 |
| picture-frame | 액자(빈 속) | 규칙·자석 (1-1 p118) |
| balance-scale | 양팔저울 | 등식의 성질 |
| thermometer | 온도계 | 정수(영하) |
| dice | 주사위(1의 면) | 확률 예고편·경우의 수 |

## 작업 절차 (공통)

1. 워크트리 브랜치에서 작업. **에셋 하나 끝날 때마다 커밋** (배치 재개 교훈).
2. main 병합 금지 — main 세션이 검수(스크린샷 육안) 후 병합.
3. 끝나면 `orca worktree set --worktree active --comment` 로 요약 + 갤러리 경로.
4. 참고 실물이 필요하면 원본 지면을 렌더해 **보기만** 한다:
   `C:/Creative/testautocreator/.rpm-src/` (main 절대경로 — 워크트리에 없음).

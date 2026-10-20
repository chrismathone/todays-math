# 템플릿 A Hi-fi — 2026-10-20

## 결과와 커밋

원장님이 고른 A의 여섯 원형을 유지한 **5안 × 6양식, 30개 A4 첫 쪽**이다. 작성 커밋 `7b7ef556e`, 검증·캡처 커밋은 이 보고서의 Git 이력에서 확인한다. push하지 않았다. 제품 프리셋·선택 화면·저장 키를 수정하지 않았다.

파일: [Hi-fi HTML](../../../design/mockups/print-templates-hifi-20261020.html), `scripts/qa/print-templates/build-template-hifi.mjs`, `verify-template-hifi.mjs`, 이 보고서와 캡처 디렉터리 `docs/design/mockups/print-templates-hifi-20261020/`.

## 다섯 안

| 안 | 한 줄 설명 | 추천 |
|---|---|---|
| T1 정밀한 정보표 | 얇은 남색 이중선·작은 사각 번호·가는 풀이 경계로 학교 양식을 정돈한다. | 정보표를 먼저 또렷하게 읽을 때 |
| **T2 분명한 머리와 번호** | 남색 윗선과 번호 테두리로 읽기 시작점을 잡고, 본문·쓰기 공간의 선은 옅게 남긴다. | **최종 추천** |
| T3 조용한 바탕 글씨 | 바탕체 제목·괄호 번호·회색 가는 선으로 흑백 인쇄의 차분한 읽기를 우선한다. | 장식과 잉크를 줄일 때 |
| T4 또렷한 대비 | 굵은 지면선·채운 번호로 축소 인쇄와 반복 복사의 경계를 강하게 만든다. | 복사 후 대비를 우선할 때, 실물 확인 필요 |
| T5 학습 흔적을 남기는 선 | 남색 세로선·밑줄 번호·점선 경계로 직접 쓰는 풀이 공간을 드러낸다. | 수업용 필기 인상을 우선할 때 |

**T2를 추천한다.** 선택한 H2 채점표의 남색 머리·분리 번호와 같은 방향으로 읽힌다. 평가원은 영역 제목과 2단, 정통은 학교 정보표, 모던은 안내 머리와 넓은 1단, 워크북은 오른쪽 풀이, 자습은 개념과 모눈, 유형은 전략과 촘촘한 반복으로 구별된다. 색 장식보다 문항과 필기 공간에 시선이 남는다. T4의 복사 적합성은 실물 검증 전의 설계 의도이며 측정 효과를 주장하지 않는다.

## 실제 문항 DOM과 범위

이전 Wire의 payload 12~17번인 선택 A 여섯 지면을 사용한다. 해당 문항은 `WorksheetPrint`로 실제 조판해 보존한 정통 템플릿 문항 DOM이다. 수식·분수·선택지·문장제·SVG 도형과 순서를 재작성하지 않았다. 캡처 소스의 65개 파일 지문 중 **63개 일치**를 다시 확인했다. 차이는 이번 H2의 `AnswerPage.tsx`와 답지 분기를 연결한 `WorksheetPrint.tsx`뿐이다. 문항 조판·공통 CSS·질문 템플릿에는 변화가 없음을 확인했고, 빌더는 그 밖의 지문이 달라지면 중단한다.

양식별 첫 문항 수는 평가원 6 / 정통 4 / 모던 4 / 워크북 3 / 자습 3 / 유형 6이다. 이전 A 구조의 열 수·정보표·개념 상자·오른쪽 풀이·85px 모눈과 문항 수를 유지했다. 제목 글꼴, 선 굵기·장식, 번호, 남색의 위치, 풀이 표시만 달리한다. 본문은 시스템 지면 글꼴(Batang 계열), 번호·일반 머리는 시스템 산세리프, T3 머리만 본문 바탕체다. 글자색은 본문 `#0e0e10`, 남색 `#1b2a4e`, 회색 경계·옅은 배경으로 제한한다.

이것은 첫 3~6문항의 **시각 제안**이다. 25문항 전체를 이 구조로 자동 재배치한 새 제품 쪽수는 아니다. 본문 조판은 실제지만 새로운 전체 pagination이나 서버 PDF·HWPX·프린터 출력의 통과를 주장하지 않는다.

## 검증과 보기

Chromium에서 **30/30 지면 793.69 × 1122.52px**, 문항·풀이 영역 이탈 0, 지면 가로·세로 넘침 0을 확인했다. 양식별 5안의 실제 문항 HTML이 완전히 일치한다. 30/30 PNG가 비어 있지 않음을 픽셀 검사하고 전체 비교판 및 추천안의 실물 크기 캡처를 눈으로 검토했다. 처음 확인에서 자습형 일부 안의 머리 높이가 풀이 칸을 밀어 1.95~20.95px 넘던 것을, 자습형 머리·개념 상자의 안쪽 여백만 줄여 수정했다. 85px 모눈·3문항은 유지했다.

HTML의 45% 비교/실제 A4 보기, 한 양식만 비교(5개 표시), 선택 안 인쇄(6쪽 표시)가 통과했다. 390px 화면에서도 문서 폭 390px로 바깥 가로 넘침 0. JS 오류 0, 외부 HTTP 요청 0이다. 인쇄 검사는 print media에서 선택한 여섯 지면이 보이는 것까지이며 실제 프린터·PDF 파일 검사는 아니다. 캡처는 1단계에서 확인한 LCD 가장자리 색이 검토를 방해하지 않도록 `--disable-lcd-text`를 쓴다. 제품 렌더링 설정을 바꾼 것이 아니다.

원자료: [측정 JSON](../../../design/mockups/print-templates-hifi-20261020/measurements.json), [PNG 검사](../../../design/mockups/print-templates-hifi-20261020/image-checks.json). [30쪽 비교판](../../../design/mockups/print-templates-hifi-20261020/overview.png), [모바일 검토](../../../design/mockups/print-templates-hifi-20261020/mobile-review.png).

| 추천 T2의 여섯 첫 쪽 | 캡처 |
|---|---|
| 평가원 · 영역 2단 | [보기](../../../design/mockups/print-templates-hifi-20261020/t2-pyeongga.png) |
| 정통 · 학교 정보표 | [보기](../../../design/mockups/print-templates-hifi-20261020/t2-jeongtong.png) |
| 모던 · 안내 머리 | [보기](../../../design/mockups/print-templates-hifi-20261020/t2-modern.png) |
| 워크북 · 오른쪽 풀이 | [보기](../../../design/mockups/print-templates-hifi-20261020/t2-workbook.png) |
| 자습 · 개념과 모눈 | [보기](../../../design/mockups/print-templates-hifi-20261020/t2-jaseup.png) |
| 유형 · 반복 | [보기](../../../design/mockups/print-templates-hifi-20261020/t2-yuhyung.png) |

재현: `node scripts/qa/print-templates/build-template-hifi.mjs` 다음, 3GiB 이상일 때 `node scripts/qa/print-templates/verify-template-hifi.mjs`. Vite·Next·추가 전체 타입 검사 없이 독립 HTML을 Chromium 하나에서 차례로 확인하고 바로 종료한다.

1단계 제품 결과와 `/dev/print-check` 대기 항목·내보내기 조사는 [H2 제품 보고](quick-key-h2-production-20261020.md)를 참조한다. 템플릿 A는 제품에 구현하지 않았으므로 새 프린터 완료 항목을 만들거나 통과 표시하지 않았다.

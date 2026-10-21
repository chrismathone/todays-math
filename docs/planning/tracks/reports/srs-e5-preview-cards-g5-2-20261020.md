# 초5 SRS 예습 카드 8장 — 5-2-2 · 5-2-3

작업일: 2026-10-21 · 가지: `feat/srs-preview-cards-g5-2` · 지시서: [brief-srs-e5-preview-cards-g5-2-codex.md](../brief-srs-e5-preview-cards-g5-2-codex.md)

## 구현

- 분수의 곱셈 4장과 합동·대칭 4장을 추가했다. 기존 5-2-1 여섯 장과 합쳐 14장이다. 각 장은 뜻 → SVG 그림과 설명 → 예제 둘 → 따라 풀기 하나다.
- `fractionCards.ts` · `geometryCards.ts`에 코드 데이터만 더했다. 지정된 탐험 개념이 있는 여섯 장은 `meaning: { cardId }`로 기존 뜻을 그대로 읽는다. 분수×자연수·자연수×분수 두 장만 뜻을 직접 썼다.
- `PreviewCard.figure`는 `numberLine | engine` 갈래다. 기존 여섯 장의 수직선 SVG는 바이트 단위로 동일하다.
- 분수 입력은 강좌의 텍스트 입력 방식·`getCourseProblemInput`의 예시와 도움말을 사용한다. 채점도 같은 `parseCourseAnswerQuantity` · `sameCourseAnswerValue`로 대분수·동치분수를 정확히 비교한다. 기존 자연수 카드의 입력 판정은 유지했다.
- 화면 틀은 `StudentCoursePreview` · `StudyBook`을 그대로 쓴다. 제품 변경은 분수 입력의 키보드 모드·도움말뿐이다. 서버·계약·저장 구조·공유 DB·`public/`는 바꾸지 않았다.

## 그림의 출처와 검산

새 그리기 함수는 만들지 않았다. 기존 초등 엔진 `scripts/figure/elem_advanced.py`를 `render_spec.py`의 검증·정제 경로로 **로컬에서만** 호출하여 `generatedFigures.ts`에 SVG 문자열을 저장했다. 원본 스펙은 `figureSpecs.ts`, 재생성 도구는 `scripts/qa/srs-preview-cards/generate-figures.ts`다. Python 3.12.15로 실행했다(이 기계의 `python3`는 3.9.6이므로 `python`을 사용).

| 소단원 | 기존 엔진 | 그림이 나타내는 수·좌표 |
| --- | --- | --- |
| 5-2-2-1 | `fracBars` | 2줄 × 4칸, 색칠 6칸. 한 줄=1, 한 칸=1/4 → 3/4 × 2=6/4 |
| 5-2-2-2 | `fracBars` | 1줄 × 4칸, 색칠 3칸. 띠 전체=4, 한 칸=1 → 4 × 3/4=3 |
| 5-2-2-3 | `fracBars` | 3줄 × 4칸, 위 두 줄에 3칸씩. 전체=1, 한 칸=1/12 → 6/12 |
| 5-2-2-4 | `fracBars` | 2줄 × 3칸, 왼쪽 두 세로 묶음 4칸. 전체=1 1/2, 한 칸=1/4 → 1 |
| 5-2-3-1 | `rotateFlip` | 4×4 모눈의 네 칸 도형. 오른쪽 90도 회전 `(x,y) → (3-y,x)` |
| 5-2-3-2 | `rotateFlip` | 3칸×2칸 직사각형을 같은 크기로 회전. 한 칸의 변=1 cm |
| 5-2-3-3 | `symmetry` | 6×6 모눈, 좌우 반사 `(x,y) → (5-x,y)`. 좌우 4칸씩, 세로 축 x=58 |
| 5-2-3-4 | `symmetry` | 6×6 모눈, 반 바퀴 회전 `(x,y) → (5-x,5-y)`. 색칠 6칸, 중심 (58,58) |

엔진의 좌표·칸·대칭 표지는 그대로 두고, 색만 기존 수직선의 잉크 `#172b4d`·강조 `#3159df`·흰색에 맞췄다. 색칠에는 강조색의 불투명도, 모눈 선에는 잉크의 불투명도를 적용했다. SVG 안에 새 글자나 외부 이미지 경로는 없다.

## 시험과 화면 확인

- TDD: 그림 모듈이 없어서 RED → 기존 수직선 보존을 포함한 12시험 GREEN. 분수 카드 부재로 6시험 RED → 19시험 GREEN. 합동·대칭 카드 부재로 7시험 RED → 구현 뒤 해당 단위 시험 GREEN.
- 최종 관련 Vitest **5파일 · 48시험 통과**, `--maxWorkers=3`만 사용했다.
  - `previewCards.test.ts` 19: 새 24문항의 답을 발문의 수로 재계산, 실제 SVG의 칸 수·색칠·좌표와 대응 관계 검산.
  - `previewFigures.test.ts` 3: 원 엔진 재렌더 결과와 산출물 일치, 수직선 보존, SVG 접근성 제목.
  - `previewNumberLine.test.ts` 4: 기존 수직선 회귀.
  - `StudentCoursePreview.test.tsx` 18: 여덟 카드 진입, 분수 도움말·채점·busy·저장 호출 없음.
  - `StudyBook.test.tsx` 4: 기존 넘김책 회귀.
- 전체 타입 검사: `npm run type-check` 한 번 실행, 종료 코드 0으로 통과.
- 변경 TypeScript 파일 ESLint, Prettier, `check-affordance.mjs`, SVG 재생성 `--check` 통과. 커밋 후크 `lint-staged`의 자동 stash는 지시서의 stash 금지와 충돌하므로, 같은 검사를 수동으로 끝내고 `HUSKY=0`으로 커밋했다.
- 실제 Chromium: **8장 × 3테마(classic·sea·forest) × 2폭(1280·390) = 48조합**. PC 펼친 면 24장과 폰의 뜻·예습 면 48장, 합계 **72 PNG**. 가로 넘침·내부 가로 스크롤·브라우저 오류·API 요청 **0건**. 오답 → 힌트 → 답 수정 → 정답, 분수/대분수 입력, 문제 풀기·학습 홈 버튼을 모두 확인했다.
- 하네스는 기존 Vite 검증 꼴을 따랐다. 운영 `app/layout.tsx`와 같은 KaTeX CSS를 불러오고, 지연 수식 렌더와 글꼴이 준비된 뒤 촬영했다. 스크린리더용 MathML의 숨김 상태도 검사한다. [기계 판정 결과](srs-e5-preview-cards-g5-2-shots/results.json).
- 부하: 메모리 3GiB·다른 `tsc --noEmit` 없음 관문을 도구에 넣었다. 초기 그림 GREEN 직전에는 관문 실패 뒤 셸이 시험을 이어 실행하는 실수가 있었고, 이후 `set -e`로 막았다. 저메모리·다른 tsc 실행 중에는 추가 시험·브라우저·타입 검사를 대기했다. 운영 빌드는 실행하지 않았다.

## 스크린샷

각 링크는 최종 캡처다. PC는 펼친 면, 폰은 두 면을 각각 보존했다.

| 소단원 | 테마 | PC 1280 | 폰 390 뜻과 그림 | 폰 390 예와 연습 |
| --- | --- | --- | --- | --- |
| 5-2-2-1 | classic | [펼친 면](srs-e5-preview-cards-g5-2-shots/5-2-2-1-classic-1280-spread.png) | [뜻·그림](srs-e5-preview-cards-g5-2-shots/5-2-2-1-classic-390-meaning.png) | [예·연습](srs-e5-preview-cards-g5-2-shots/5-2-2-1-classic-390-practice.png) |
| 5-2-2-1 | sea | [펼친 면](srs-e5-preview-cards-g5-2-shots/5-2-2-1-sea-1280-spread.png) | [뜻·그림](srs-e5-preview-cards-g5-2-shots/5-2-2-1-sea-390-meaning.png) | [예·연습](srs-e5-preview-cards-g5-2-shots/5-2-2-1-sea-390-practice.png) |
| 5-2-2-1 | forest | [펼친 면](srs-e5-preview-cards-g5-2-shots/5-2-2-1-forest-1280-spread.png) | [뜻·그림](srs-e5-preview-cards-g5-2-shots/5-2-2-1-forest-390-meaning.png) | [예·연습](srs-e5-preview-cards-g5-2-shots/5-2-2-1-forest-390-practice.png) |
| 5-2-2-2 | classic | [펼친 면](srs-e5-preview-cards-g5-2-shots/5-2-2-2-classic-1280-spread.png) | [뜻·그림](srs-e5-preview-cards-g5-2-shots/5-2-2-2-classic-390-meaning.png) | [예·연습](srs-e5-preview-cards-g5-2-shots/5-2-2-2-classic-390-practice.png) |
| 5-2-2-2 | sea | [펼친 면](srs-e5-preview-cards-g5-2-shots/5-2-2-2-sea-1280-spread.png) | [뜻·그림](srs-e5-preview-cards-g5-2-shots/5-2-2-2-sea-390-meaning.png) | [예·연습](srs-e5-preview-cards-g5-2-shots/5-2-2-2-sea-390-practice.png) |
| 5-2-2-2 | forest | [펼친 면](srs-e5-preview-cards-g5-2-shots/5-2-2-2-forest-1280-spread.png) | [뜻·그림](srs-e5-preview-cards-g5-2-shots/5-2-2-2-forest-390-meaning.png) | [예·연습](srs-e5-preview-cards-g5-2-shots/5-2-2-2-forest-390-practice.png) |
| 5-2-2-3 | classic | [펼친 면](srs-e5-preview-cards-g5-2-shots/5-2-2-3-classic-1280-spread.png) | [뜻·그림](srs-e5-preview-cards-g5-2-shots/5-2-2-3-classic-390-meaning.png) | [예·연습](srs-e5-preview-cards-g5-2-shots/5-2-2-3-classic-390-practice.png) |
| 5-2-2-3 | sea | [펼친 면](srs-e5-preview-cards-g5-2-shots/5-2-2-3-sea-1280-spread.png) | [뜻·그림](srs-e5-preview-cards-g5-2-shots/5-2-2-3-sea-390-meaning.png) | [예·연습](srs-e5-preview-cards-g5-2-shots/5-2-2-3-sea-390-practice.png) |
| 5-2-2-3 | forest | [펼친 면](srs-e5-preview-cards-g5-2-shots/5-2-2-3-forest-1280-spread.png) | [뜻·그림](srs-e5-preview-cards-g5-2-shots/5-2-2-3-forest-390-meaning.png) | [예·연습](srs-e5-preview-cards-g5-2-shots/5-2-2-3-forest-390-practice.png) |
| 5-2-2-4 | classic | [펼친 면](srs-e5-preview-cards-g5-2-shots/5-2-2-4-classic-1280-spread.png) | [뜻·그림](srs-e5-preview-cards-g5-2-shots/5-2-2-4-classic-390-meaning.png) | [예·연습](srs-e5-preview-cards-g5-2-shots/5-2-2-4-classic-390-practice.png) |
| 5-2-2-4 | sea | [펼친 면](srs-e5-preview-cards-g5-2-shots/5-2-2-4-sea-1280-spread.png) | [뜻·그림](srs-e5-preview-cards-g5-2-shots/5-2-2-4-sea-390-meaning.png) | [예·연습](srs-e5-preview-cards-g5-2-shots/5-2-2-4-sea-390-practice.png) |
| 5-2-2-4 | forest | [펼친 면](srs-e5-preview-cards-g5-2-shots/5-2-2-4-forest-1280-spread.png) | [뜻·그림](srs-e5-preview-cards-g5-2-shots/5-2-2-4-forest-390-meaning.png) | [예·연습](srs-e5-preview-cards-g5-2-shots/5-2-2-4-forest-390-practice.png) |
| 5-2-3-1 | classic | [펼친 면](srs-e5-preview-cards-g5-2-shots/5-2-3-1-classic-1280-spread.png) | [뜻·그림](srs-e5-preview-cards-g5-2-shots/5-2-3-1-classic-390-meaning.png) | [예·연습](srs-e5-preview-cards-g5-2-shots/5-2-3-1-classic-390-practice.png) |
| 5-2-3-1 | sea | [펼친 면](srs-e5-preview-cards-g5-2-shots/5-2-3-1-sea-1280-spread.png) | [뜻·그림](srs-e5-preview-cards-g5-2-shots/5-2-3-1-sea-390-meaning.png) | [예·연습](srs-e5-preview-cards-g5-2-shots/5-2-3-1-sea-390-practice.png) |
| 5-2-3-1 | forest | [펼친 면](srs-e5-preview-cards-g5-2-shots/5-2-3-1-forest-1280-spread.png) | [뜻·그림](srs-e5-preview-cards-g5-2-shots/5-2-3-1-forest-390-meaning.png) | [예·연습](srs-e5-preview-cards-g5-2-shots/5-2-3-1-forest-390-practice.png) |
| 5-2-3-2 | classic | [펼친 면](srs-e5-preview-cards-g5-2-shots/5-2-3-2-classic-1280-spread.png) | [뜻·그림](srs-e5-preview-cards-g5-2-shots/5-2-3-2-classic-390-meaning.png) | [예·연습](srs-e5-preview-cards-g5-2-shots/5-2-3-2-classic-390-practice.png) |
| 5-2-3-2 | sea | [펼친 면](srs-e5-preview-cards-g5-2-shots/5-2-3-2-sea-1280-spread.png) | [뜻·그림](srs-e5-preview-cards-g5-2-shots/5-2-3-2-sea-390-meaning.png) | [예·연습](srs-e5-preview-cards-g5-2-shots/5-2-3-2-sea-390-practice.png) |
| 5-2-3-2 | forest | [펼친 면](srs-e5-preview-cards-g5-2-shots/5-2-3-2-forest-1280-spread.png) | [뜻·그림](srs-e5-preview-cards-g5-2-shots/5-2-3-2-forest-390-meaning.png) | [예·연습](srs-e5-preview-cards-g5-2-shots/5-2-3-2-forest-390-practice.png) |
| 5-2-3-3 | classic | [펼친 면](srs-e5-preview-cards-g5-2-shots/5-2-3-3-classic-1280-spread.png) | [뜻·그림](srs-e5-preview-cards-g5-2-shots/5-2-3-3-classic-390-meaning.png) | [예·연습](srs-e5-preview-cards-g5-2-shots/5-2-3-3-classic-390-practice.png) |
| 5-2-3-3 | sea | [펼친 면](srs-e5-preview-cards-g5-2-shots/5-2-3-3-sea-1280-spread.png) | [뜻·그림](srs-e5-preview-cards-g5-2-shots/5-2-3-3-sea-390-meaning.png) | [예·연습](srs-e5-preview-cards-g5-2-shots/5-2-3-3-sea-390-practice.png) |
| 5-2-3-3 | forest | [펼친 면](srs-e5-preview-cards-g5-2-shots/5-2-3-3-forest-1280-spread.png) | [뜻·그림](srs-e5-preview-cards-g5-2-shots/5-2-3-3-forest-390-meaning.png) | [예·연습](srs-e5-preview-cards-g5-2-shots/5-2-3-3-forest-390-practice.png) |
| 5-2-3-4 | classic | [펼친 면](srs-e5-preview-cards-g5-2-shots/5-2-3-4-classic-1280-spread.png) | [뜻·그림](srs-e5-preview-cards-g5-2-shots/5-2-3-4-classic-390-meaning.png) | [예·연습](srs-e5-preview-cards-g5-2-shots/5-2-3-4-classic-390-practice.png) |
| 5-2-3-4 | sea | [펼친 면](srs-e5-preview-cards-g5-2-shots/5-2-3-4-sea-1280-spread.png) | [뜻·그림](srs-e5-preview-cards-g5-2-shots/5-2-3-4-sea-390-meaning.png) | [예·연습](srs-e5-preview-cards-g5-2-shots/5-2-3-4-sea-390-practice.png) |
| 5-2-3-4 | forest | [펼친 면](srs-e5-preview-cards-g5-2-shots/5-2-3-4-forest-1280-spread.png) | [뜻·그림](srs-e5-preview-cards-g5-2-shots/5-2-3-4-forest-390-meaning.png) | [예·연습](srs-e5-preview-cards-g5-2-shots/5-2-3-4-forest-390-practice.png) |

## 정답 없이 풀기와 원문 누출 검사

[정답 없이 풀기 표](srs-e5-preview-cards-g5-2-blind.md)에 예제 16문항과 따라 풀기 8문항만 실었다. 리드의 다른 모델 독립 풀이 대조는 후속이다. 생성 도구 `blind-prompts.ts`는 답·풀이·힌트를 읽지 않고 문제만 내보낸다.

누출 검사는 **못 셈**이다. `scripts/qa/concept-blank/check-leak.ts`를 읽었으나 개념 백지 은행만 입력으로 받고, 지정 원문 경로 `C:/Creative/testautocreator-data/I-개념용어`가 없다. 확인한 macOS 후보 `/Users/pss/Desktop/creative/testautocreator-data/I-개념용어`, `/Volumes/새 볼륨/testautocreator-data/I-개념용어`도 없다. 원문 없이 어댑터를 만들어도 유효한 대조가 되지 않아 실행하지 않았다. 누출 0건으로 보고하지 않는다.

## 커밋

| 커밋 | 내용 |
| --- | --- |
| `19abc0655` | 그림 갈래 확장·초등 엔진 SVG 재사용·기존 수직선 보존 |
| `62fa6c13b` | 분수 예습 4장·강좌 분수 입력과 채점 재사용 |
| `380948cf3` | 합동·대칭 예습 4장·답과 좌표 검산 |
| 본 보고서 커밋 `docs(srs): record grade five preview-card verification` | Vite 하네스·블라인드 문제표·72장 캡처·보고서 |

작성자 `SUN <chrismathone@gmail.com>`, 모든 커밋에 지시된 공동 작성자 꼬리말을 넣었다. 명시한 경로만 스테이징했고 `._*`는 제외했다.

## 남은 것

- 리드: 블라인드 24문항 독립 대조, 원문이 있는 기계에서 누출 검사, 통합·운영 빌드·배포.
- 이 작업에서는 푸시·공유 DB 쓰기·새 작업트리·의존성 설치를 하지 않았다. 커밋 후 지정 리드 터미널로 완료를 알린다.

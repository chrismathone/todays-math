# H-01 기억 학습 수직선 수정 — 2026-10-21

브리프 `/Users/pss/Desktop/creative/display-survey/consensus/brief-srs-h01-numberline-20261021.md`에 따른 로컬 수정이다. 기준 가지 `fix/srs-h01-numberline`, 시작 HEAD `79dcf92dc21e03ddfc21dd054eeea42ab94c3ec0`.

## 원인과 수정

`fadingFigureFor`는 소단원·난이도로 그림 하나를 고른다. 문장을 넘기는 화면들이 모두 그 그림을 그대로 그려, 이하 문장에도 3 이상 그림, 3 미만 문장에도 4 미만 그림을 붙였다. 원래 은행 그림 자체는 해당 그림 문제에 맞으므로 은행 SVG를 고치지 않았다.

표시 직전에 `fadingNumberLineForProposition`이 **현재 문장**으로 수직선을 선택한다. 대상은 `e5-2-1-1-f1`, `e5-2-1-2-f1` 두 그림뿐이다. 관련 두 소단원의 실제 정의 43문장을 읽어 28문장에는 단일 수직선을 연결했다. 그림의 경계·포함 여부·방향은 표로 고정하고, 숫자가 있는 문장은 그 숫자를 따른다(3 미만, 90 이상, 3 이상 7 이하, 4 초과 8 미만 등). 수가 없는 일반 설명은 작은 수 예시를 쓴다.

나머지 15문장(이상/초과 비교, 자연수에 한정한 동치, 서로 다른 조건 둘 등)은 한 수직선으로 모든 뜻을 담지 못하므로 기존의 불일치 그림을 생략한다. 비교 그림 두 줄 같은 새 화면 형식은 만들지 않았다. 표에는 원문도 고정하여, 같은 ID의 문장이 바뀌면 옛 그림을 재사용하지 않는다.

기존 `200×125` 캔버스, 축·범위 선의 높이, 색, 점 크기, 글꼴·글자 크기를 보존했다. 눈금과 경계점은 같은 좌표식으로 계산한다. 예습의 `numberLineSvg`는 다른 캔버스·색을 쓰므로 대체하지 않았다. 예습 코드와 공용 문제 그림 엔진은 변경하지 않았다.

## 변경 파일

- `src/lib/fading/numberLineFigures.ts`: 검토한 문장·범위 표와 결정적 SVG 선택.
- `src/components/fading/FadingFigureView.tsx`: 현재 문장을 필수 prop으로 받고 표시 직전에 선택.
- `FadingCardSessionScreen.tsx`: 카드 1~4단계와 4단계 직접 쓰기 완료 대조의 현재 문장 전달.
- `FadingSessionScreen.tsx`: 기존 칩 방식 1~4단계의 현재 문장 전달.
- `FadingConceptReader.tsx`: 개념 읽기의 현재 문장 전달.
- `FadingComparisonSheet.tsx`: 완료 대조에서 넘긴 문장 전달.
- `src/__tests__/components/fadingNumberLine.test.tsx`: 운영 두 오류의 재현 및 실제 로컬 source를 이용한 화면 연결 회귀.
- `src/__tests__/unit/fadingNumberLineFigures.test.ts`: 28문장의 경계·점·방향, 15문장 생략, 원문 변경과 무관한 그림의 처리 검증.

컴포넌트 파일은 모두 `src/components/fading/` 안이다. CSS·사용자 문구 변경 없음. H-02 소유 `StudentCoursePractice`는 만지지 않았다.

## 검증

먼저 실제 은행 문장과 `createLocalFadingSource`로 두 회귀 시험을 작성했다. 수정 전 둘 다 실패했다: 이하의 `M80 61H183`(오른쪽), 3 미만의 `cx=120`(4의 눈금). 수정 뒤 둘 다 통과했다.

최종 관련 Vitest **9파일 195검사 통과**, `--maxWorkers=3`:

```text
npx vitest run \
  src/__tests__/components/fadingNumberLine.test.tsx \
  src/__tests__/unit/fadingNumberLineFigures.test.ts \
  src/__tests__/unit/fadingFigures.test.ts \
  src/__tests__/components/fadingSingleCard.test.tsx \
  src/__tests__/components/fadingCardSession.test.tsx \
  src/__tests__/components/fadingScreens.test.tsx \
  src/__tests__/unit/fadingSource.test.ts \
  src/__tests__/unit/fadingContentGuard.test.ts \
  src/__tests__/unit/previewNumberLine.test.ts --maxWorkers=3
```

변경 8개 TS/TSX 파일과 그 의존 경로의 **부분 type-check 통과**(`tsc --noEmit`, 4GB 힙, 외부 `tsconfig.json`). 전체 프로젝트 type-check나 빌드라고 보고하지 않는다. 워크트리에 `next-env.d.ts`가 없어 외부 설정에서 기존 Next 전역 타입을 직접 포함했다. ESLint, 변경 컴포넌트 어포던스 검사, `git diff --check` 통과.

리드의 Chromium 차례 허용 뒤 별도 헤드리스 Chromium 한 엔진으로 로컬 Vite 하네스를 사용했다. 실제 제품 컴포넌트와 메모리 source이며 운영 로그인·운영 학습 제출은 없다. 1440/390 폭에서 두 오류의 전후, 카드·칩 2~4단계, 카드 4단계 완료 대조를 캡처했다. 수정 후 캡처의 방향·점 위치와 문장을 직접 열어 확인했다. 브라우저는 닫았고 차례 반환을 리드에게 알렸다. 로컬 서버도 종료했다.

## 증거와 한계

증거 폴더: `/Users/pss/Desktop/creative/display-survey/srs-h01-20261021/`.

| 증거 | 내용 |
|---|---|
| `red.log` | 수정 전 운영 오류 두 건의 실패 |
| `related-tests.log`, `type-check.log`, `tsconfig.json` | 최종 시험 및 부분 타입 검사 |
| `sentence-review.json` | 실제 43문장과 연결/생략 결정 |
| `before-at-most-*`, `before-below-three-*` | 로컬 수정 전 그림 재현 |
| `after-at-most-{1440,390}.png` | 이하: 3의 닫힌 점·왼쪽 |
| `after-below-three-{1440,390}.png` | 3 미만: 3의 열린 점·왼쪽 |
| `after-{cards,chips}-step{2,3,4}.png` | 단계가 바뀌어도 현재 문장과 같은 그림 |
| `after-cards-comparison.png` | 완료 대조의 이하 문장도 왼쪽 |
| `after-figures.json` | 캡처한 SVG 원문 |
| `harness/` | DB 없는 재현 코드·실제 은행에서 읽은 표본 |

수정 전 운영 정본은 기존 `display-survey/srs-eye/80-기억-이하수직선.png`, `256-초과미만관계.png`다. 로컬 하네스는 제품의 학생 탐험 외곽 틀 전체가 아니며, KaTeX 글꼴 요청의 로컬 허용 목록 문제로 수식은 대체 글꼴을 사용했다. 이 캡처는 **문장과 SVG의 경계·방향을 확인하는 증거**이며 전체 글꼴·배치 검수 증거로 쓰지 않는다. SVG의 기존 `sans-serif` 표기는 바꾸지 않았다.

두 대상 소단원 밖의 문장·그림 정합성, 생략한 15문장의 새 비교 그림 형식, 운영 반영 후 눈검수는 남아 있다. 전체 단원/전체 SVG가 정상이라는 판정은 하지 않는다.

## 호환성과 금지 사항

저장·응답 계약, 콘텐츠 문장/ID/순서, 콘텐츠 지문·세션 토큰, 학생 기록, FSRS·일정 모두 불변이다. 새 reader floor나 DB 마이그레이션은 없다. 기존 화면 응답을 표시할 때만 고르므로 이전 저장 기록도 그대로 읽는다. 이미 열린 구 번들 탭의 그림은 새 번들을 받은 뒤 고쳐진다.

빌드·푸시·배포·DB 쓰기·유료 API·이미지 생성·광범위 콘텐츠 재생성 없음. 로컬 커밋 뒤 리드에게 SHA와 이 보고서를 전달한다. main 병합과 운영 반영은 리드 담당이며, 아직 병합하지 않은 작업트리와 가지는 보존한다.

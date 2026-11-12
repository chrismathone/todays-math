# 지시서 — 문제 추출 «쪽 순서» 단계 (H3-B) · 2026-11-12

리드: Claude(오늘 세션). 작업자: Codex. 작업트리: `/Volumes/새 볼륨/today-worktrees/studio-page-order`, 가지 `phase/9-studio-page-order`.
푸시하지 않는다. 가지에 커밋만 하고 끝나면 이 문서 끝 «보고»를 채운다.

**4차 리뷰의 최신 결정:** 작은 미리보기에서 잉크가 없는 쪽은 **빈 쪽 후보**다. 후보만 PDF 텍스트 층과 원래 크기 이상의 렌더로 확인하고, 쪽당 3초 안에 모든 검증을 통과한 빈 쪽만 자동 제외한다. 실패는 캐시하지 않고 카드·오른쪽 칸에 재시도 단추를 제공한다. 보고의 초기 구현·1차·2차·3차 측정과 설명은 당시 이력이며, 현재 동작은 끝의 «4차 리뷰 반영»을 따른다.

## 원장님 결정(다시 묻지 않는다)
- 시안: `docs/design/mockups/hifi-studio-page-order-h3-20261112.html` 의 **H3-B (카드 + 오른쪽 크게 보기)**. 그 파일을 브라우저로 열어 동작까지 그대로 따른다.
  - 모든 파일의 쪽을 **한 줄 차례**로 잇는다. 파일이 달라도 쪽을 섞을 수 있다. 쪽 카드 왼쪽에 파일 색 띠, 아래에 «새 번호 · 파일 짧은 이름 원본 번호».
  - 옮기기 세 길: 손잡이 ⠿ 끌기(놓일 자리 파란 세로줄) · 오른쪽 칸 «맨 앞 · 앞으로 · 뒤로 · 맨 뒤» · 키보드 ←→(쪽 넘기기) / Alt+←→(옮기기).
  - 오른쪽 칸: 고른 쪽 크게, «새 6쪽 ← 서술형 스캔.pdf 원본 2쪽», «이 쪽 빼기» / «되살리기».
  - 뺀 쪽은 제자리에 흐리게(점선 · «뺌») 남고 «되살리기»로 돌아온다. 원본 파일은 바뀌지 않는다.
  - 위 줄: 단계 띠 맨 앞 «쪽 순서» · «되돌리기»(직전 한 번씩 계속) · «처음 차례로» · 주 단추 «이 순서로 시작 →». 둘째 줄: 파일 딱지(색 · 이름 · 쪽 수) · «시작할 쪽 N · 뺀 쪽 M».
  - 할 때마다 아래 가운데 알림 «… 옮겼습니다.» + [되돌리기] (6초).
- **파일을 하나만 올려도 이 단계를 늘 보여 준다.**
- **빈 쪽만 미리 빼 둔다.** 노란 알림 줄에서 «빈 쪽으로 보여 미리 뺐습니다»를 알리고 [되살리기]를 제공한다. 표지·정답표는 자동으로 빼지 않는다. 시안에 남아 있는 다른 자동 제외 이유도 이 최신 결정을 따른다.

## 지금 코드(읽고 시작할 곳)
- `src/components/unified/StudioView.tsx` (3,700줄): `step` 은 `"upload" | "crop" | "review"`. `importFiles()`(약 912행)가 PDF · 그림을 `StudioSource{id,name,kind,pages,pdf|image,pageRotations}` 로 연다. 쪽 이동은 `chooseSource(sourceId, page)` · 이전/다음 단추(약 2157~2183행) · 파일 고르기 select(약 2322행). 전체 인식은 `recognizeSource()`(약 1994행) — **지금은 현재 파일 하나의 1..pages**. 쪽 회전 `pageRotations` 가 있다(쪽 단위 상태의 선례).
- 단계 띠 `StudioStepBar.tsx`, 작업 저장 `studioSessionStore.ts`(`StoredStudioSource`, `pageRotations`), 문항 상자 `crops`(sourceId + page 로 쪽에 묶임), 담기 `studioCart.ts`.
- 시연(`useStudioDemo.ts` · `src/lib/studio-demo/`)은 쪽 그림 지문으로 녹화본을 찾는다 — 차례가 바뀌어도 맞아야 한다. **시연 녹화본(공유 DB)은 건드리지 않는다.**

## 만들 것
1. **쪽 차례 모델(순수 함수 · 시험 먼저 — TDD)** — 예: `src/components/unified/studioPageOrder.ts`.
   새 판정은 `{ sourceId, page, out: boolean, autoOut?: "빈 쪽" }[]`. 옛 저장본의 `"표지"`·`"정답표"` 값은 그대로 읽고 보존하되 새로 판정하지 않는다. 처음 차례(파일 차례 → 쪽 차례) · 옮기기(앞 · 뒤 · 맨 앞 · 맨 뒤 · 어느 쪽 앞으로) · 빼기/되살리기 · 되돌리기 쌓기 · 파일 추가(뒤에 붙임) · «새 번호»(뺀 쪽 제외) · 복원 때 모르는 쪽 버리고 빠진 쪽 뒤에 붙이기.
2. **쪽 순서 단계 화면** — 올린 직후(파일 하나여도) 이 단계로 온다. «이 순서로 시작 →» 이 지금의 영역 지정(`crop`)으로 간다. 영역 지정 화면에서 다시 열 수 있는 «쪽 순서» 단추를 둔다(단계 띠의 «쪽 순서»를 눌러도 된다). 쪽 그림은 이미 있는 렌더 길(pdfjs 페이지 렌더)로 작은 그림을 만든다 — 쪽마다 한 번, 캐시.
   - D-159: 지면 여러 쪽을 보이는 화면이다. `src/components/paper-strip/` `PaperStrip` 을 먼저 보고, 맞으면 넓혀서 쓰고(끌기 · 빼기 칸), 맞지 않으면 왜 안 맞는지 보고에 적는다. 따로 한 벌을 새로 짓기 전에 리드에게 알린다(보고에 쓰고 진행해도 된다).
   - D-30: 카드 자체는 누르는 표면이 아니다(손가락 커서 · hover 배경 금지). 손잡이 · 단추만. `npm run lint:affordance` 통과.
   - 문구는 시안 그대로(간결 · 사무적 · 느낌표 · 이모지 없음).
3. **차례를 따라가게** — 영역 지정의 이전/다음 쪽 · 쪽 고르기 · 전체 인식 대상과 차례 · 문항 번호 매기기(상자 정렬)가 **새 차례**를 따르고, **뺀 쪽은 건너뛴다**(인식 요청을 보내지 않는다). 이미 만든 상자 · 인식 · 해설은 쪽을 따라간다(쪽 신분 sourceId+page 는 그대로 두고 «차례»만 바꾼다 — 데이터 이전 없음). 여러 파일을 섞었으면 전체 인식은 섞인 차례 전체를 한 번에.
4. **작업 저장 · 복원** — 차례와 뺀 쪽을 세션에 저장(`studioSessionStore` 에 선택 칸 추가 — 없는 옛 저장본은 처음 차례로). 옛 저장본이 그대로 열리는지 시험.
5. **미리 빼기 판정(AI 없음 · 결정적)**
   - PDF·이미지 모두 작은 그림에서 잉크가 보이면 유지한다. 잉크가 0인 후보에 대해서만 추가 검증한다. PDF 후보는 텍스트 층에 글자가 하나라도 있으면 유지하고, 글자가 없다고 확인한 후보를 원래 크기 이상의 해상도로 다시 렌더한다. 이미지 후보도 원래 크기 이상으로 확인한다. 흰 바탕에 합성한 어느 RGB 채널이든 255 미만인 픽셀이 1개 이상이면 유지한다. PDF 확인 배율은 2.5(작은 미리보기 배율보다 낮추지 않음), 이미지 확인은 원래 크기 이상으로 한다. 시연 PDF·재현 A(0.1pt 글자)·B(`#fefefe` 흐린 스캔)의 측정 근거는 끝의 보고에 남긴다.
   - 표지·정답표 분류와 연산 목록 검사는 사용하지 않는다. 작은 미리보기부터 후보 검증까지 쪽당 하나의 3초 제한·취소를 적용한다. 어느 단계든 실패·취소·시간 초과하면 쪽을 유지한다. 성공한 미리보기만 캐시하고 실패한 카드·오른쪽 칸의 명시적 «다시 시도» 단추로 다시 불러온다(D-30: 카드 자체는 클릭 영역이 아니다).
   - 옛 저장본의 제외 이유는 보존한다. 뺀 문항 줄의 표시와 실제 복원은 모두 원래 앞 문항의 신분(`previousId`)으로 자리를 찾는다.
   - **거짓으로 빼면 원장님이 문항을 잃는다.** 문턱은 실제 파일로 잰다: 시연 PDF(8쪽, 1쪽이 표지 · 스캔)는 `scratch/page-order/demo-8p.pdf`(저장소 밖 — 커밋 금지). 판정이 낸 «뺄 쪽»과 실제를 표로 보고.

## 시험 · 관문
- 순수 함수 단위 시험 먼저(RED → GREEN). 화면은 RTL 로 «올리면 쪽 순서 단계 · 끌기 대신 단추로 옮기기 · 빼면 인식 대상에서 빠짐 · 되돌리기 · 저장 복원».
- 바뀐 모듈을 부르는 시험 `npx vitest run <files> --maxWorkers=3`. 전체는 커밋 직전 한 번(`--maxWorkers=3`). 외장 SSD 의 `._*` 잡음은 걸러 판단(메모: 바뀐 파일과 관계없는 실패는 main 에서도 나는지 확인).
- `npm run type-check` · `npm run lint:affordance`.
- 운영 빌드 금지(공유 기계). 브라우저는 한 번에 Chromium 하나.
- 실제로 화면을 띄워 시안과 나란히 스크린샷을 남긴다(`AUTH_SECRET` 임시값 — `.env` 복사 금지).
- 공유 DB 쓰기 금지.

## 보고(끝나면 여기에 채운다)

2026-11-12 · Codex · `phase/9-studio-page-order`.

### 커밋 목록 · 바뀐 파일

- **`784608723` — `feat(studio): add H3-B page order before extraction`**: 구현·시험·스크린샷·측정·검증 기록 37파일. 이 보고는 별도 `docs(studio): record page order implementation and verification` 커밋으로 남긴다.
- 순수 모델·분석·작은 그림: `src/components/unified/studioPageOrder.ts`, `studioPageAnalysis.ts`, `studioPagePreview.ts`.
- H3-B 화면: 같은 폴더의 `StudioPageOrderStep.tsx`, `StudioPageOrder.module.css`.
- 공용 지면: `src/components/paper-strip/PaperStrip.tsx`, `EditablePaperStrip.tsx`, `editable-paper-strip.module.css`.
- 기존 흐름 연결: `src/components/unified/StudioView.tsx`, `StudioView.module.css`, `StudioStepBar.tsx`, `WorksheetEditor.tsx`, `studioSessionStore.ts`, `privateStudioSessionStore.ts`.
- 시험 11파일: `src/__tests__/components/`의 `PaperStrip.editable`, `StudioPageOrder`, `StudioView.pageOrder`, `StudioStepBar`, `StudioView.cart`, `StudioView.headerLayout`, `StudioView.reviewFeedback`와 `src/__tests__/unit/`의 `studioPageOrder`, `studioPageAnalysis`, `studioPagePreview`, `privateWorkspacePersistence`.
- [통합 기록](reports/studio-page-order-20261112/README.md), [모델 TDD 기록](reports/studio-page-order-model-20261112.md), [UI TDD 기록](reports/studio-page-order-ui-20261112.md), [전체 시험의 main 대조](reports/studio-page-order-20261112/test-baseline.md). 측정 JSON·대조 JSON·스크린샷 6장도 통합 기록 폴더에 포함했다.

한 파일을 올려도 쪽 순서를 거친다. 파일 사이 이동·제외·복원·연속 되돌리기·처음 차례·6초 알림을 연결했고, 영역 지정의 탐색·전체 인식·문항 나열·담기가 활성 쪽의 새 차례를 따른다. 원본 `sourceId+page`와 저장한 상자·인식·해설은 보존한다. 새 파일은 뒤에 붙으며 옛 저장본은 원래 파일·쪽 차례로 열린다. 이미 복원하거나 되살린 쪽에 자동 제외를 다시 적용하지 않는다.

### PaperStrip 를 썼나 / 넓혔나 / 못 쓴 까닭

**기존 `PaperStrip`을 넓혀 썼다.** 선택적 `editable` 모드가 격자·명시적 선택 단추·색 띠·제외 표현·끌기 삽입선·340px 옆 칸을 소유한다. 호출자가 도구와 내용을 슬롯으로 전달하며 공용 부품이 Studio 모델을 참조하지 않는다. 기존 가로 띠·배율·확대창 경로는 유지했고 기존 시험 10건도 통과했다.

D-30에 따라 카드 본체에는 클릭·손가락 커서·hover 배경을 두지 않았다. 데스크톱은 H3-B의 단추 밀도, 모바일은 44px 조작 영역을 유지했다. 대소문자를 구분하지 않는 볼륨에서 모델 파일과 충돌하지 않도록 UI 이름을 `StudioPageOrderStep.tsx`로 정했다.

### 미리 빼기 판정 결과 표

제품의 PDF.js 렌더 함수를 실제 Chromium에서 사용했다. 최대 728×1031 그림을 흰 바탕에 합성해 RGB 어느 채널이든 252 미만인 픽셀을 잉크로 센다. **추출 글이 없고 잉크 비율 < 0.000001**일 때만 빈 쪽이다. 이 크기에서 한 잉크 픽셀도 보존하는 기준이다. 표지·정답표는 텍스트의 제목·본문 구조를 함께 검사하고 발문·수식이 있으면 남긴다. [원시 측정값](reports/studio-page-order-20261112/measurements.json).

| 파일 | 원본 쪽 | 잉크 비율 | 실제 내용 | 자동으로 뺀 쪽 |
|---|---:|---:|---|---|
| 시연 `demo-8p.pdf` | 1 | 0.09831221 | 텍스트 없는 스캔 표지 | 없음 · 수동 빼기 대상 |
| 시연 `demo-8p.pdf` | 2 | 0.06674412 | 문항 | 없음 |
| 시연 `demo-8p.pdf` | 3 | 0.06945673 | 문항 | 없음 |
| 시연 `demo-8p.pdf` | 4 | 0.07618763 | 문항 | 없음 |
| 시연 `demo-8p.pdf` | 5 | 0.09623911 | 문항 | 없음 |
| 시연 `demo-8p.pdf` | 6 | 0.06428731 | 문항 | 없음 |
| 시연 `demo-8p.pdf` | 7 | 0.07934657 | 문항 | 없음 |
| 시연 `demo-8p.pdf` | 8 | 0.04870978 | 문항 | 없음 |
| 합성 `synthetic.pdf` | 1 | 0 | 완전히 흰 쪽 | 빈 쪽 |
| 합성 `synthetic.pdf` | 2 | 0.00016388 | 0.2pt·97% 흰색의 희미한 선 | 없음 |
| 합성 `synthetic.pdf` | 3 | 0.00067815 | 12pt 문항 한 줄 | 없음 |
| 합성 `text-fixtures.pdf` | 1 | 0.00199982 | 문제지·2학년·유의 사항 | 표지 |
| 합성 `text-fixtures.pdf` | 2 | 0.00285251 | 빠른 정답·연속 번호/답 표 | 정답표 |
| 합성 `text-fixtures.pdf` | 3 | 0.00264466 | 문제지 제목 아래 01 발문·수식 | 없음 |

관측 14쪽에서 문항의 거짓 제외는 0쪽이다. 작은 표본의 관측이며 모든 교재에 대한 성능 보장은 아니다. **텍스트층 없는 스캔은 빈 쪽만 판단한다.** 시연 1쪽 표지를 그림만으로 추측해 빼지 않았다. 원본 PDF와 합성 PDF는 무시되는 `scratch/page-order/`에만 두고 커밋하지 않았다.

### 시험 · 실제 화면 검수

- 순수 모델·분석·화면·통합은 RED→GREEN. 최종 모델/판정/미리보기 94시험, 최종 통합·헤더·기존/확장 PaperStrip·쪽 순서 화면 5파일 41시험 통과. private 저장 왕복과 기존 cart/review/header 호출자 시험도 통과했다.
- `npm run type-check`, 변경 파일 ESLint, `npm run lint:affordance`, `git diff --check` 통과. 첫 커밋 훅은 검사를 통과한 뒤 Git 재스테이징에서 오류가 났지만, 정상 훅 재실행으로 커밋했다. 검사 우회 없음.
- 전체는 지시대로 **커밋 전 한 번** `npx vitest run --maxWorkers=3`: **1,740파일 통과 / 65 실패 / 33 건너뜀**, **43,212시험 통과 / 57 실패 / 1,030 건너뜀**, 처리되지 않은 오류 1건. 전체 통과로 보고하지 않는다.
- 실패 65파일 모두 깨끗한 main `78eedb0ed`에서 대조: **17파일 main에서도 실패, 48파일 main에서 통과**. AppleDouble `._*`가 마이그레이션·이미지·서식 목록에 들어간 환경 오류와 기존 저장소 실패를 구분했다. `problemActualFormatReader`는 이 가지의 메타파일 오류 뒤에 가려진 기존 fingerprint 실패가 main에서 드러난 경우다. 자세한 목록은 [대조표](reports/studio-page-order-20261112/test-baseline.md). 전체 시험이 재생성한 기존 중3 보고서 두 파일은 원래 내용으로 되돌려 범위에서 제외했다.
- [H3-B와 실제 화면 나란히](reports/studio-page-order-20261112/h3-b-side-by-side.png), [실제 화면](reports/studio-page-order-20261112/actual-desktop.png), [끌기 삽입선](reports/studio-page-order-20261112/actual-drag.png), [미리 뺀 안내](reports/studio-page-order-20261112/actual-auto-excluded.png). 320·390·768px 가로 넘침 없음, 모바일 큰 미리보기 접근과 44px 조작 영역 확인.
- Orca 내장 Chromium 하나, 임시 `AUTH_SECRET`, 연결 불가능한 localhost DB와 API 차단 harness로 확인했다. `.env` 복사 없음. 임시 route·자산 symlink·worker를 제거했고 로컬 서버와 검수 탭을 종료했다.

### 남은 것 · 리드에게 물을 것

지시서의 구현 범위에 남은 작업과 추가로 물을 결정은 없다. 전체 시험의 기존 실패와 외장 SSD 환경 문제는 별도 정비 대상이다. 실제 공유 저장소의 저장·운영 배포는 검증하지 않았다. 새 `order` 단계를 저장한 자료는 이전 코드의 세션 검증이 거부하므로 구버전 화면으로 되돌려 읽는 것은 지원하지 않는다(옛 저장본을 새 코드로 읽는 시험은 통과).

**푸시·main 병합·공유 DB 쓰기·운영 빌드는 하지 않았다.** 시연 녹화본도 변경하지 않았다. 사용자 지시대로 가지 커밋만 남긴다.

### 리뷰 반영

2026-11-12 · Codex · `scratch/review/review-order.md`의 막음 4건·고칠 것 2건을 모두 수정했다. 구현 커밋은 **`5ca42937b` — `fix(studio): address all six page-order review findings`**이며, 이 절과 검증 근거는 별도 보고 커밋으로 남긴다.

여섯 건 모두 재현 시험을 먼저 추가하고 해당 결함으로 RED인 것을 확인한 뒤 구현했다. [RED·GREEN 실행 기록](reports/studio-page-order-review-20261112/validation.md).

| 건 | 구현 전 RED로 확인한 결과 | 수정과 회귀 검증 |
|---|---|---|
| 1 · 현재 쪽과 파괴적 동작 | 1쪽 제외 → 검토 → 영역 지정 → 회전에서 확인창 기대 1회, 실제 0회 | 현재 쪽을 제외하면 차례상 다음 활성 쪽으로 이동하고 끝이면 첫 활성 쪽으로 돌아온다. 활성 쪽이 없으면 선택을 비운다. 활성 쪽만 회전·영역 편집·삭제·일괄 디지털화 대상이 되며, 제외된 상자·인식·해설을 보존한다. 전체 제외 뒤 외부 출력 요청·Delete도 기록을 지우거나 출력으로 넘어가지 않는 시험을 추가했다. |
| 2 · 실패 재시도 | 두 실패 뒤 한 쪽을 제외해도 로더 호출 횟수 `[1,2]` 대신 `[2,2]`; 활성 쪽 0개여도 재호출 | `useStudioAi.activePages`의 최신 `sourceId+page` 범위를 `retryPages`와 전체 `retry`가 함께 사용한다. 제외된 실패 이력·로더는 남겨 되살린 뒤 재시도할 수 있다. 진행·경고·실패 재시도 버튼의 수량도 활성 쪽만 센다. |
| 3 · 그림 문항의 거짓 제외 | 그림이 있거나 연산 목록을 확인하지 못한 표지·정답표 후보를 자동 제외 | PDF.js `getOperatorList()`에서 이미지 그리기 연산을 검사한다. `paintImageXObject`·inline·group·repeat·mask 등 설치된 8종을 모두 보존하고, 연산 목록 실패·미확인도 보존한다. 그림이 없다고 확인한 텍스트 쪽만 표지·정답표 규칙을 적용하며 기존 빈 쪽 판정은 유지한다. |
| 4 · 담은 문항과 출력 | 제외 뒤 배지는 여전히 2문항, 실제 출력 장부는 `a,c` 그대로; 저장 왕복에서 제외 복원 표시 소실 | 기존 뺀 기억에 선택적 `pageExcluded`를 보존한다. 제외한 문항을 실제 시험지 장부에서 옮겨 담은 목록·출력·저장에서도 빠지게 하고, 되살릴 때 원래 자리에 원본 객체 그대로 복원한다. 직접 뺀 문항·다른 원본·은행 문항은 유지한다. 연속 제외·부분 복원·저장 왕복·실제 `WorksheetEditor` 목록으로 확인했다. |
| 5 · 보관함과 이어서 작업 | `documentWorkflow`·목록 API가 `order`에 `undefined`, 작업 중 수량 0 | `workspaceWorkflow` 계약의 추출 자료 단계에 `order`를 추가하고 보관함·개발 시안의 단계 이름을 «쪽 순서»로 연결했다. ‘내 작업 중만’·‘이어서 작업’과 저장된 `order` 화면 복원을 검증했다. 기존 이어서 작업 경로가 저장 단계를 복원하므로 별도 강제 단계 전환은 추가하지 않았다. |
| 6 · Alt+방향키 | 둘째 손잡이에 초점을 둔 Alt+→가 `[2,1,3]`; Alt+←는 `[1,2,3]` | 키 이벤트의 손잡이에서 쪽 신분을 읽고 그 쪽으로 이동·경계를 판정한다. 초점이 둘째 손잡이에 있을 때 →는 `[1,3,2]`, ←는 `[2,1,3]`; 재배열 뒤에도 같은 손잡이 초점이 유지된다. |

최종 관련 시험은 아래 명령으로 **34파일·629시험 모두 통과**했다. `npm run type-check`, `npm run lint:affordance`, 변경 22파일 ESLint와 `git diff --check`도 통과했다.

```sh
npx vitest run StudioView UnifiedWorkspace useStudioAi StudioBulkSolution StudioPageOrder studioPageAnalysis studioPagePreview studioPageOrder studioCart draftStore workspaceDraftStore workspaceExplicitResume studioExplicitResume privateWorkspacePersistence privateDocumentWorkflow PrivateLibrary StudioQueueStatus StudioStepBar PaperStrip --maxWorkers=3
```

실제 합성 PDF의 표지·정답표 두 쪽에 번호가 있는 문항 그림을 삽입한 뒤, PDF.js의 실제 연산 목록과 제품의 `renderStudioPagePreview`로 다시 확인했다. Node의 PDF.js legacy 로더와 `@napi-rs/canvas`를 사용한 지면 렌더 검증이며 새 브라우저 시각 검수로 기록하지 않는다. [원시 측정값](reports/studio-page-order-review-20261112/image-pages-verification.json).

| 실제 PDF 구성 | 쪽 | 이미지 연산 | 잉크 비율 | 자동 제외 |
|---|---:|---|---:|---|
| 텍스트 표지 | 1 | 없음 | 0.00199982 | 표지 |
| 텍스트 정답표 | 2 | 없음 | 0.00285251 | 정답표 |
| 같은 표지 + 문항 그림 | 1 | `paintImageXObject` | 0.00262335 | 없음 |
| 같은 정답표 + 문항 그림 | 2 | `paintImageXObject` | 0.00347603 | 없음 |

Orca 새 작업트리는 설정된 `/Volumes/TodayWork/today_`의 권한 오류로 만들지 못했다. 기존 작업트리의 Codex 워커 세 개가 서로 다른 파일을 맡고, 조정자가 현재 쪽·담기·출력 연결과 최종 통합을 맡았다. 현재 가지에만 커밋했으며 **푸시·main 병합·공유 DB 쓰기·운영 빌드·시연 녹화본 변경은 하지 않았다.** 미병합 작업트리는 정리하지 않는다. 이번 여섯 건에 남은 수정은 없다.

### 2차 리뷰 반영

2026-11-12 · Codex · `scratch/review/review-order2.md`와 리드의 후속 결정을 반영했다. 구현·시험 12파일의 커밋은 **`54c5e6aec` — `fix(studio): close second page-order review regressions`**다. 수정 대상 1·2·4·5는 재현 시험의 RED를 먼저 확인했고, 3은 지시대로 참고 사항과 배포 갱신 장치 조사로 남겼다. [RED·GREEN 근거와 조사 범위](reports/studio-page-order-review2-20261112/validation.md).

| 건 | 구현 전 RED | 수정·확인 결과 |
|---|---|---|
| 1 · 저장 시험지의 원본 복원 | 실제 `restoreRequest`로 복원한 뒤 첫 쪽을 제외해도 담은 목록이 `[c1,c2]` | 문항 id로 현재 `storedCrops`의 `sourceId+page`를 찾아 장부와 출력 제외에 사용한다. 같은 옛 원본·쪽에서 서로 다른 새 원본으로 복원된 두 문항도 각각 구분한다. 첫 쪽 제외 시 실제 장부·출력은 `[c2]`, 되살리면 `[c1,c2]`. 담은 문항의 내용 스냅샷은 바꾸지 않는다. 이미 제외한 상자도 원본 복원 시 기존 상자로 찾는다. |
| 2 · 벡터 본문의 거짓 제외 | `fill`·`eoFill`·`fillStroke` 계열을 넣어도 표지·정답표로 제외 | 이미지와 칠하기가 모두 없다고 확인한 경우에만 텍스트 자동 제외를 허용한다. `fill`, `eoFill`, `fillStroke`, `eoFillStroke`, `closeFillStroke`, `closeEOFillStroke`, `shadingFill`, `rawFillPath`와 PDF.js 6의 `constructPath` 인수에 접힌 칠하기를 검사한다. 별도 글자 프로그램을 쓰는 Type3 글꼴과 알 수 없는 path paint도 보존한다. 알려진 칠하기가 있으면 빈 쪽 판정도 하지 않는다. 표 선·장식 때문에 정답표가 남는 것은 허용한다. |
| 4 · 직접 빼기·모두 빼기·되돌리기 | 순수 함수와 `UnifiedWorkspace`＋실제 `useStudioCart` 모두 A는 `[C,B]`, B는 `[B,A,C]` | 제외·직접 빼기·모두 빼기 때 `previousId`로 원래 앞 문항의 신분을 기억한다. 앞 문항도 빠졌으면 그 문항의 이웃을 따라 복원 자리를 찾는다. A는 B 복원 시 `[B,C]`, A까지 복원 시 `[A,B,C]`; B는 모두 빼기 취소 뒤 B 복원 시 `[A,B,C]`. 이웃 정보의 저장 왕복도 RED→GREEN. |
| 5 · 연산 목록 대기 | 3초를 넘기거나 abort해도 Promise가 끝나지 않음 | 쪽마다 연산 목록 검사 대기를 3초로 제한하고 `AbortSignal`을 받는다. 시간 초과·실패 시 제외 없이 렌더된 미리보기를 반환하고, 취소 시 즉시 `AbortError`로 종료한다. 뒤늦은 성공·실패는 결과를 바꾸지 않고 소비하며 타이머·리스너를 정리한다. 실제 `StudioView` 시험에서 응답 없는 연산 목록도 3초 뒤 활성 1쪽·제외 0쪽으로 남고 ‘빼기’·‘이 순서로 시작’이 열린다. |

`previousId: null`은 맨 앞을 뜻한다. 새 제거 기록은 숫자 인덱스 대신 이웃으로 복원하며, 이 필드가 없는 옛 기록에만 기존 숫자 위치를 대체 경로로 쓴다. 시간 제한은 **판정용 연산 목록 대기**에 적용한다. PDF 렌더·텍스트 추출 전체를 3초 안에 끝낸다는 보장은 아니며, PDF.js의 내부 Promise 자체를 파괴하지 않는다.

**3 · 구버전 재저장과 열린 탭 조사:** 리드 결정에 따라 구버전 쓰기 차단·버전 관문·새 마이그레이션을 추가하지 않았다. 구버전 파서가 `pageOrder`·`pageExcluded` 등 새 정보를 버릴 수 있다는 사실은 참고로 남는다. 저장소에서 **배포 판 변경을 주기적으로 확인해 열린 탭에 새로 고침을 알리는 자체 장치는 찾지 못했다.** 새 장치도 만들지 않았다.

- `useWorkspaceAccess.ts`의 30초·focus·visibility 재조회는 `/api/account/access`의 권한 확인이며 배포 판을 비교하지 않는다.
- 루트 `ClientErrorLog`가 쓰는 `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`는 오류 로그의 release 값이다. 알림·갱신에 쓰이지 않는다. `RouteRecovery`의 ‘다시 시도’도 일반 오류 복구다.
- 설치된 Next 16.3.8은 RSC 탐색 응답에서 배포/빌드 신분이 달라지면 전체 페이지 이동으로 복구한다(`fetch-server-response.js` → `app-router.js`). 이는 열린 탭의 주기적 새로 고침 안내가 아니다. 작업실의 로컬 상태·hash 전환과 계속되는 편집·자동저장은 이 탐색을 반드시 일으키지 않는다. 운영 환경의 배포 보호 설정은 조사하지 않았다.

최종 관련 시험은 아래 명령으로 **34파일·687시험 통과**했다. `npm run type-check`, `npm run lint:affordance`, 변경 12파일 ESLint와 `git diff --check`도 통과했으며 정상 커밋 훅의 ESLint·Prettier·affordance 검사를 거쳤다. 이번에는 관련 시험을 실행했고, 앞 보고에 기록한 전체 시험 결과를 새로 통과했다고 주장하지 않는다.

```sh
npx vitest run StudioView UnifiedWorkspace useStudioAi StudioBulkSolution StudioPageOrder studioPageAnalysis studioPagePreview studioPageOrder studioCart draftStore workspaceDraftStore workspaceExplicitResume studioExplicitResume privateWorkspacePersistence privateDocumentWorkflow PrivateLibrary StudioQueueStatus StudioStepBar PaperStrip --maxWorkers=3
```

실제 PDF 검증은 기존 표지·정답표에 래스터 문항 또는 `1. 2 + 3 = ?`·`2. 6 - 2 = ?`의 글자 윤곽을 칠한 벡터 문항을 넣어 실행했다. Node의 PDF.js legacy 로더·`@napi-rs/canvas`와 제품 `renderStudioPagePreview`를 사용했다. [원시 측정값](reports/studio-page-order-review2-20261112/vector-pages-verification.json). 새 브라우저 시각 검수나 운영 성능 측정으로 기록하지 않는다.

| 실제 PDF 구성 | 쪽 | 이미지 연산 | 칠하기 연산 수 | 잉크 비율 | 자동 제외 |
|---|---:|---|---:|---:|---|
| 기존 텍스트 표지 | 1 | 없음 | 0 | 0.00199982 | 없음 |
| 기존 텍스트 정답표 | 2 | 없음 | 0 | 0.00285251 | 없음 |
| 같은 표지 + 문항 그림 | 1 | `paintImageXObject` | 0 | 0.00262335 | 없음 |
| 같은 정답표 + 문항 그림 | 2 | `paintImageXObject` | 0 | 0.00347603 | 없음 |
| 같은 표지 + 칠한 벡터 글자 | 1 | 없음 | 14 | 0.00376115 | 없음 |
| 같은 정답표 + 칠한 벡터 글자 | 2 | 없음 | 14 | 0.00461384 | 없음 |

앞선 보고와 달리 **기존 합성 텍스트 표지·정답표도 이제 유지**한다. 이 PDF에는 페이지 연산 목록 밖의 Type3 글자 프로그램이 각각 11·19개 있어 칠하기 부재를 확정할 수 없기 때문이다. 표의 칠하기 수는 페이지 연산과 `constructPath` 인수만 센 값이며, 글꼴 내부 프로그램의 칠하기 수가 아니다. 거짓 제외를 막으라는 결정에 따른 보수적 결과다. 이미지·칠하기가 없다고 확인된 표지·정답표의 정상 자동 제외는 단위 시험으로 유지했다.

이전 작업트리 생성 오류 때문에 기존 작업트리에서 서로 다른 파일을 맡는 Codex 워커를 사용했다. PDF 수정과 읽기 전용 배포 조사는 완료됐고, 조정자가 원본 복원·차례·통합을 맡았다. 요청된 수정과 조사는 완료했다. **푸시·main 병합·공유 DB 쓰기·운영 빌드·시연 녹화본 변경은 하지 않았고**, 미병합 작업트리와 가지는 보존한다.

### 3차 리뷰 반영

2026-11-12 · Codex · `scratch/review/review-order3.md`의 세 건과 리드 결정을 반영했다. 구현·시험 12파일은 **`b0b03f836` — `fix(studio): limit automatic exclusion to rendered blank pages`**에 커밋했다. 지시서의 현행 규칙도 빈 쪽만 자동 제외하도록 바꿨다. 초기·1차·2차 보고는 당시 측정과 변경 이력이며, 현재 판정은 이 절로 대체한다. [RED·GREEN 실행 근거](reports/studio-page-order-review3-20261112/validation.md).

| 건 | 구현 전 RED로 확인한 것 | 수정·검증 |
|---|---|---|
| 1 · 자동 제외를 빈 쪽으로 축소 | 렌더가 흰 쪽이어도 텍스트 경로 때문에 빈 쪽을 판정하지 않음; 표지·정답표·선 벡터 후보에서 없어야 할 텍스트 API 호출 발생; RGB 254를 빈 쪽으로 취급 | 자동 제외는 렌더 잉크가 정확히 0인 경우의 `빈 쪽`만 반환한다. 표지·정답표 정규식·텍스트 정규화·표 검사·`studioPdfTextLines`·`inspectPageOperators`·연산 검사 전용 타이머·런타임 PDF.js import를 삭제했다. 그림의 희미한 픽셀 하나도 유지한다. |
| 2 · 뺀 문항 표시 자리 | 순수 함수와 실제 `StudioView`에서 B쪽 제외 → C 직접 빼기 → B 복원 후 `[A,C(뺌),B]` | `studioCartRows`가 복원 함수와 같은 이웃 재구성 함수를 사용한다. 표시가 `[A,B,C(뺌)]`, C 다시 담기도 `[A,B,C]`로 일치한다. 직접·반복 빼기, 빠진 이웃, 맨 앞, 중복 기억, 기존 담긴 차례·번호, 옛 숫자 위치 대체 경로도 검증했다. |
| 3 · 텍스트 추출 대기 | 응답 없는 `getTextContent` 뒤 미완료; 실제 화면 통합 시험에서도 텍스트 API 1회 호출로 RED | 텍스트·연산 목록 API 호출을 자동 제외 경로에서 없앴다. 두 API가 영원히 응답하지 않는 대역에서도 호출 0회, 타이머를 진행시키지 않고 렌더 뒤 조작·시작 활성화, 흰 쪽만 제외를 확인했다. 남은 `getPage`와 렌더 대기는 각각 10초 제한·즉시 abort·뒤늦은 결과 무시로 보강했다. |

새 판정 타입 `StudioAutoOut`은 `"빈 쪽"` 하나다. 저장된 `StudioOrderedPage.autoOut`의 옛 `"표지"`·`"정답표"`는 읽고 저장할 때 그대로 보존한다. 기존 작업을 열거나 사용자가 되살린 쪽을 새 미리보기로 다시 제외하지 않는다. 화면은 새 빈 쪽에만 «빈 쪽으로 보여 미리 뺐습니다 — 인쇄된 내용이 거의 없습니다.»를 쓰며, 옛 이유는 «이전 작업에서 뺀 쪽입니다.»로 표시한다. 옛 표지·정답표 값을 빈 쪽으로 바꿔 표시하지 않는다.

잉크 기준은 이전의 ‘채널 < 252, 비율 < 0.000001’에서 **흰 바탕에 합성한 채널 < 255, 비율 = 0**으로 좁혔다. 245·252·254의 희미한 점, 200만 픽셀 중 검은 점 하나, 색·반투명 잉크는 모두 유지한다. 비어 있거나 불완전한 픽셀 배열은 미확인으로 유지한다. 흰색이 아닌 종이 바탕이나 잡음이 있는 빈 쪽이 남는 것은 거짓 제외를 피하기 위한 의도한 결과다.

남은 PDF 대기는 페이지 로드 10초와 렌더 10초를 **각각** 제한하므로 파일 전체가 10초 안에 끝난다는 뜻은 아니다. abort는 즉시 `AbortError`, 시간 초과는 `TimeoutError`로 끝나고 기존 화면의 오류 처리로 넘어가 쪽을 자동 제외하지 않는다. 렌더만 취소하며 공유 PDF를 파괴하지 않는다. 취소할 수 없는 내부 `getPage` 작업의 뒤늦은 성공·실패는 소비하고 무시한다. 9,999ms 미완료 → 10,000ms 종료, 성공·실패·취소 뒤 타이머와 리스너 해제를 시험했다.

최종 관련 검증은 **34파일·609시험 통과**다. 표지·정답표 및 연산 목록 분류 기능을 지우면서 그 기능만을 위한 옛 시험도 제거·대체했으므로 2차의 687개와 시험 수가 다르다. `npm run type-check`, `npm run lint:affordance`, 변경 12파일 ESLint, `git diff --check`와 정상 커밋 훅이 통과했다. 최초 type-check에서 임시 실제 PDF 검증 스크립트의 대역 타입 단언 한 곳이 실패했고 이를 고친 뒤 통과했다. 제품 타입 오류는 없었다.

```sh
npx vitest run StudioView UnifiedWorkspace useStudioAi StudioBulkSolution StudioPageOrder studioPageAnalysis studioPagePreview studioPageOrder studioCart draftStore workspaceDraftStore workspaceExplicitResume studioExplicitResume privateWorkspacePersistence privateDocumentWorkflow PrivateLibrary StudioQueueStatus StudioStepBar PaperStrip --maxWorkers=3
```

실제 PDF.js와 제품 `renderStudioPagePreview`로 20쪽을 확인했다. Node legacy 로더·`@napi-rs/canvas`를 사용했고, 제품에 전달한 페이지의 `getTextContent`·`getOperatorList`는 응답하지 않는 대역으로 감쌌다. **제품의 두 API 호출은 모든 쪽에서 0회**였다. 벡터 연산 수는 제품 밖의 검증 코드가 별도로 측정했다. [원시 측정값](reports/studio-page-order-review3-20261112/pages-verification.json).

| 실제 PDF 구성 | 쪽 수 | 확인한 잉크·벡터 | 자동 제외 |
|---|---:|---|---|
| 기존 텍스트 표지·정답표·문항 | 3 | 잉크 비율 0.00200382 · 0.00287649 · 0.00266598 | 없음 |
| 표지·정답표 + 문항 그림 | 2 | 0.00267264 · 0.00354532 | 없음 |
| 표지·정답표 + 칠한 글자 윤곽 | 2 | 쪽당 fill 14개; 0.00379846 · 0.00467113 | 없음 |
| 표지·정답표 + 선으로만 그린 글자 윤곽 | 2 | 쪽당 stroke 14개, fill 0개; 0.00422613 · 0.00509881 | 없음 |
| 완전히 흰 쪽·희미한 선·문항 한 줄 | 3 | 0 · 0.00016388 · 0.00064884 | 첫 쪽만 `빈 쪽` |
| 시연 스캔 | 8 | 모두 잉크 있음 | 없음 |

관측 20쪽에서 완전히 흰 1쪽만 제외됐다. 새 브라우저 시각 검수·전체 Vitest·실제 DB 왕복·운영 성능 검증은 이번 범위에서 실행하지 않았다. 기존 작업트리에서 Codex 워커 세 개가 서로 다른 파일을 맡았고 조정자가 결합 검증과 보고를 맡았다. **푸시·main 병합·공유 DB 쓰기·운영 빌드·시연 녹화본 변경은 하지 않았다.** 요청된 세 수정과 보고를 완료했으며 미병합 작업트리는 보존한다.

### 4차 리뷰 반영

2026-11-12 · Codex · `scratch/review/review-order4.md`의 두 건과 리드 결정을 반영했다. 구현·시험 9파일의 커밋은 **`e781225ed` — `fix(studio): verify blank candidates and retry failed previews`**다. 이 절과 최신 작업 지시는 별도 보고 커밋으로 남긴다. [실행 근거](reports/studio-page-order-review4-20261112/validation.md), [배율·문턱 측정](reports/studio-page-order-review4-20261112/calibration.json), [최종 판정 정책](reports/studio-page-order-review4-20261112/confirmation-policy.json).

| 건 | 구현 전 RED | 수정·GREEN |
|---|---|---|
| 1 · 작은 글자·흐린 스캔의 거짓 제외 | 실제 제품 함수에 A·B를 넣었을 때 둘 다 작은 미리보기 잉크 0 → `빈 쪽`. 단위 재현도 A·B를 제외하고, 확인하지 않은 흰 후보를 바로 제외 | 작은 그림의 잉크 0은 후보만 된다. PDF 후보의 텍스트 층에 공백 이외의 글자가 있으면 유지한다. 텍스트가 없다고 확인한 후보만 배율 2.5 이상으로 다시 렌더하고, 흰색이 아닌 픽셀 1개 이상이면 유지한다. 독립 이미지 후보는 원래 픽셀 크기로 확인한다. 실제 A는 텍스트에서, B는 확인 렌더에서 유지됐다. |
| 2 · 실패 캐시·재시도 부재 | 실패 뒤 재진입 때 총 호출 기대 3회, 실제 2회. 카드·오른쪽 칸·이미지 디코딩 실패에 재시도 단추 없음 | URL이 있고 오류가 없는 성공만 캐시한다. 실패는 재진입 때 다시 불러오고 카드·오른쪽 칸 모두 명시적 «다시 시도» 단추를 제공한다. 원본 id·쪽·현재 회전으로 요청하고, 같은 쪽의 중복 요청과 취소한 이전 결과 반영을 막는다. 성공한 다른 쪽의 캐시는 유지하며 카드 본체를 클릭 영역으로 바꾸지 않았다. |

후보 확인은 다음 순서다. 작은 미리보기에서 잉크가 보이면 텍스트와 확인 렌더를 모두 건너뛴다. 후보인 PDF는 `getTextContent()`의 실제 글자 유무만 확인하며 표지·정답표 분류는 하지 않는다. 글자가 없으면 PDF는 **`max(2.5, 작은 미리보기 배율)`**, 독립 이미지는 **원래 픽셀 크기**로 확인한다. 두 렌더 모두 흰 바탕에 합성한 RGB 중 하나라도 255 미만인 픽셀을 잉크로 센다. 확인 렌더까지 잉크가 정확히 0이고 모든 단계가 성공해야만 `빈 쪽`을 만든다. 연산 목록 검사는 다시 넣지 않았다. 옛 저장본의 표지·정답표 이유와 되살린 상태는 계속 보존한다.

**쪽당 3초는 모든 단계가 나눠 쓰는 하나의 시간 한도다.** 페이지 로드·작은 렌더·텍스트·확인 렌더마다 3초를 새로 주지 않는다. 동기 픽셀 읽기·인코딩 직후에도 시각을 확인해 이미 한도를 넘긴 결과로 제외하지 않는다. 실패·시간 초과는 제외 없이 오류가 되며, 작은 그림이 만들어졌다면 그 URL을 함께 남겨 재시도할 수 있다. 취소는 `AbortError`로 전달해 화면이 지난 요청을 버린다. 렌더만 취소하고 공유 PDF는 파괴하지 않으며, 늦게 끝난 Promise와 타이머·리스너·임시 캔버스를 정리한다. 3,200만 픽셀을 넘는 확인 캔버스는 축소해 빈 쪽이라고 판단하지 않고 미확인 오류로 유지한다.

배율·문턱은 실제 A·B와 시연 PDF로 정했다. `pdf-lib`로 A는 595×842pt에 Helvetica 0.1pt 문장을 `(50,700)`에 넣었다. B는 2480×3508 흰 그림에 `#fefefe`, 64px sans-serif, 0.2px 윤곽선으로 `(100,200)`·`(100,300)`에 두 문항을 넣고 595×842pt PDF 한 쪽에 배치했다. 원본 B의 잉크는 리뷰와 같은 **866픽셀**, 작은 PDF 미리보기는 **0픽셀**이다.

| 표본 | 작은 미리보기 잉크 | 텍스트 층 | 확인 측정 | 최종 제품 결과 |
|---|---:|---|---|---|
| A · 0.1pt 글자 | 0 | `1. 2 + 3 = ?` | 별도 배율 2 측정은 1픽셀 | 텍스트에서 유지 · 추가 렌더 안 함 |
| B · 흐린 스캔 | 0 | 없음 | 배율 2: 1 · 2.1: 186 · 2.25: 267 · **2.5: 295** · 3: 453 · 4: 731픽셀 | 배율 2.5 확인 뒤 유지 |
| 완전히 흰 대조군 | 0 | 없음 | 배율 2.5에서도 0픽셀 | `빈 쪽` |
| 시연 PDF 8쪽 | 모두 0보다 큼 | 제품에서 읽지 않음 | 제품에서 확인 렌더 안 함 | 8쪽 모두 유지 |

측정 워커는 배율 2도 지정 A·B를 보존하는 최소 충분값으로 보고했다. 조정자는 B가 그 배율에서 **1픽셀만 남는 점**을 보고 측정된 2.5를 선택했다. 더 높은 확인 배율에서 드러나는 픽셀이 여럿이더라도 **보존 문턱은 1픽셀**로 유지한다. B의 배율 4 결과 731은 리뷰의 725와 조금 다르며, 리뷰에 없던 글자 위치를 위처럼 고정한 측정이다. 위치와 모든 배율·원본 해시는 측정 JSON에 남겼다. 노이즈나 비백색 종이 바탕이 남는 것은 허용한다.

실제 제품 함수 검증은 [수정 전](reports/studio-page-order-review4-20261112/product-red.json) A·B 둘 다 `빈 쪽` → [수정 후](reports/studio-page-order-review4-20261112/product-green.json) 둘 다 유지다. PDF 표본 11쪽(A·B·흰 대조군·시연 8쪽)과 독립 이미지 B 1개를 호출했다. 독립 이미지 B는 작은 그림에서도 잉크가 있어 그대로 유지됐다. Node의 PDF.js legacy 로더·`@napi-rs/canvas`와 설치된 표준 글꼴·WASM 경로를 사용했다. 이는 브라우저 성능 측정이나 임의의 모든 작은 내용에 대한 보존 보장이 아니다.

TDD는 후보 검증 **54 실패 / 25 통과 → 최종 86 통과**, 재시도 실제 화면 재현 **5 실패 / 14 선택 제외 → 관련 화면 55 통과**로 확인했다. 추가 `DOMException` 재현 **1 실패 / 85 통과**를 먼저 잡고 `instanceof Error` 대신 오류 이름으로 abort를 전달하도록 고쳤다. 실제 DOM 예외가 다른 실행 영역에서 만들어져도 지난 미리보기를 성공으로 받지 않는다.

최종 관련 검증은 아래 명령으로 **34파일·662시험 통과**했다. `npm run type-check`(프로젝트의 8GB 설정), `npm run lint:affordance`, 변경 9파일 ESLint, `git diff --check`, 정상 커밋 훅도 통과했다. 첫 결합 검증에서 실패 캐시 제거로 재진입 재로딩이 생긴 기존 장부 시험 1건은 단추 활성화를 기다리도록 고쳤고, 새 픽셀 대역의 TypeScript 호출 타입도 명시했다. 워커의 기본 4GB `tsc`는 메모리 부족으로 끝났으므로 성공으로 세지 않았으며, 최종 프로젝트 명령이 통과한 결과를 사용한다.

```sh
npx vitest run StudioView UnifiedWorkspace useStudioAi StudioBulkSolution StudioPageOrder studioPageAnalysis studioPagePreview studioPageOrder studioCart draftStore workspaceDraftStore workspaceExplicitResume studioExplicitResume privateWorkspacePersistence privateDocumentWorkflow PrivateLibrary StudioQueueStatus StudioStepBar PaperStrip --maxWorkers=3
```

기존 작업트리에서 Codex 워커가 후보 검증·재시도·실제 측정을 나누고 조정자가 최종 배율 결정·실제 제품 RED→GREEN·통합 검증을 맡았다. 요청된 수정과 보고를 완료했다. **푸시·main 병합·공유 DB 쓰기·운영 빌드·시연 녹화본 변경은 하지 않았다.** 전체 저장소 Vitest·새 브라우저 시각 검수·실제 DB 왕복은 이번 검증 범위에 포함하지 않았으며 미병합 작업트리를 보존한다.

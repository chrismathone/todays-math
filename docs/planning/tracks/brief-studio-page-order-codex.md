# 지시서 — 문제 추출 «쪽 순서» 단계 (H3-B) · 2026-11-12

리드: Claude(오늘 세션). 작업자: Codex. 작업트리: `/Volumes/새 볼륨/today-worktrees/studio-page-order`, 가지 `phase/9-studio-page-order`.
푸시하지 않는다. 가지에 커밋만 하고 끝나면 이 문서 끝 «보고»를 채운다.

## 원장님 결정(다시 묻지 않는다)
- 시안: `docs/design/mockups/hifi-studio-page-order-h3-20261112.html` 의 **H3-B (카드 + 오른쪽 크게 보기)**. 그 파일을 브라우저로 열어 동작까지 그대로 따른다.
  - 모든 파일의 쪽을 **한 줄 차례**로 잇는다. 파일이 달라도 쪽을 섞을 수 있다. 쪽 카드 왼쪽에 파일 색 띠, 아래에 «새 번호 · 파일 짧은 이름 원본 번호».
  - 옮기기 세 길: 손잡이 ⠿ 끌기(놓일 자리 파란 세로줄) · 오른쪽 칸 «맨 앞 · 앞으로 · 뒤로 · 맨 뒤» · 키보드 ←→(쪽 넘기기) / Alt+←→(옮기기).
  - 오른쪽 칸: 고른 쪽 크게, «새 6쪽 ← 서술형 스캔.pdf 원본 2쪽», «이 쪽 빼기» / «되살리기».
  - 뺀 쪽은 제자리에 흐리게(점선 · «뺌») 남고 «되살리기»로 돌아온다. 원본 파일은 바뀌지 않는다.
  - 위 줄: 단계 띠 맨 앞 «쪽 순서» · «되돌리기»(직전 한 번씩 계속) · «처음 차례로» · 주 단추 «이 순서로 시작 →». 둘째 줄: 파일 딱지(색 · 이름 · 쪽 수) · «시작할 쪽 N · 뺀 쪽 M».
  - 할 때마다 아래 가운데 알림 «… 옮겼습니다.» + [되돌리기] (6초).
- **파일을 하나만 올려도 이 단계를 늘 보여 준다.**
- **«빼기 권장» 쪽은 미리 빼 둔다.** 노란 알림 줄 «새 N쪽은 표지로 보여 미리 뺐습니다 — 문항 번호가 없습니다. [되살리기]» 처럼 «미리 뺐다»를 알리고 되살릴 수 있게. (시안의 «빼기 / 그대로 두기» 문구를 이 뜻으로 바꾼다.)

## 지금 코드(읽고 시작할 곳)
- `src/components/unified/StudioView.tsx` (3,700줄): `step` 은 `"upload" | "crop" | "review"`. `importFiles()`(약 912행)가 PDF · 그림을 `StudioSource{id,name,kind,pages,pdf|image,pageRotations}` 로 연다. 쪽 이동은 `chooseSource(sourceId, page)` · 이전/다음 단추(약 2157~2183행) · 파일 고르기 select(약 2322행). 전체 인식은 `recognizeSource()`(약 1994행) — **지금은 현재 파일 하나의 1..pages**. 쪽 회전 `pageRotations` 가 있다(쪽 단위 상태의 선례).
- 단계 띠 `StudioStepBar.tsx`, 작업 저장 `studioSessionStore.ts`(`StoredStudioSource`, `pageRotations`), 문항 상자 `crops`(sourceId + page 로 쪽에 묶임), 담기 `studioCart.ts`.
- 시연(`useStudioDemo.ts` · `src/lib/studio-demo/`)은 쪽 그림 지문으로 녹화본을 찾는다 — 차례가 바뀌어도 맞아야 한다. **시연 녹화본(공유 DB)은 건드리지 않는다.**

## 만들 것
1. **쪽 차례 모델(순수 함수 · 시험 먼저 — TDD)** — 예: `src/components/unified/studioPageOrder.ts`.
   `{ sourceId, page, out: boolean, autoOut?: "표지"|"정답표"|"빈 쪽" }[]`. 처음 차례(파일 차례 → 쪽 차례) · 옮기기(앞 · 뒤 · 맨 앞 · 맨 뒤 · 어느 쪽 앞으로) · 빼기/되살리기 · 되돌리기 쌓기 · 파일 추가(뒤에 붙임) · «새 번호»(뺀 쪽 제외) · 복원 때 모르는 쪽 버리고 빠진 쪽 뒤에 붙이기.
2. **쪽 순서 단계 화면** — 올린 직후(파일 하나여도) 이 단계로 온다. «이 순서로 시작 →» 이 지금의 영역 지정(`crop`)으로 간다. 영역 지정 화면에서 다시 열 수 있는 «쪽 순서» 단추를 둔다(단계 띠의 «쪽 순서»를 눌러도 된다). 쪽 그림은 이미 있는 렌더 길(pdfjs 페이지 렌더)로 작은 그림을 만든다 — 쪽마다 한 번, 캐시.
   - D-159: 지면 여러 쪽을 보이는 화면이다. `src/components/paper-strip/` `PaperStrip` 을 먼저 보고, 맞으면 넓혀서 쓰고(끌기 · 빼기 칸), 맞지 않으면 왜 안 맞는지 보고에 적는다. 따로 한 벌을 새로 짓기 전에 리드에게 알린다(보고에 쓰고 진행해도 된다).
   - D-30: 카드 자체는 누르는 표면이 아니다(손가락 커서 · hover 배경 금지). 손잡이 · 단추만. `npm run lint:affordance` 통과.
   - 문구는 시안 그대로(간결 · 사무적 · 느낌표 · 이모지 없음).
3. **차례를 따라가게** — 영역 지정의 이전/다음 쪽 · 쪽 고르기 · 전체 인식 대상과 차례 · 문항 번호 매기기(상자 정렬)가 **새 차례**를 따르고, **뺀 쪽은 건너뛴다**(인식 요청을 보내지 않는다). 이미 만든 상자 · 인식 · 해설은 쪽을 따라간다(쪽 신분 sourceId+page 는 그대로 두고 «차례»만 바꾼다 — 데이터 이전 없음). 여러 파일을 섞었으면 전체 인식은 섞인 차례 전체를 한 번에.
4. **작업 저장 · 복원** — 차례와 뺀 쪽을 세션에 저장(`studioSessionStore` 에 선택 칸 추가 — 없는 옛 저장본은 처음 차례로). 옛 저장본이 그대로 열리는지 시험.
5. **미리 빼기 판정(AI 없음 · 결정적)**
   - 빈 쪽: 렌더한 작은 그림의 잉크 비율이 문턱 아래.
   - 텍스트 층이 있는 PDF: 문항 번호 꼴(줄머리 `1.` `01` `[서술형 1]` 등)이 하나도 없고 «유의 사항 · 문제지 · 답안지» 같은 표지 낱말 → 표지, «정답 · 빠른 정답 · 해설» 표 꼴 → 정답표.
   - 텍스트 층이 없는 스캔: 빈 쪽만 판정한다(표지를 그림만으로 가르지 않는다 — 틀리게 빼는 것이 더 나쁘다). 이 한계를 보고에 적는다.
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

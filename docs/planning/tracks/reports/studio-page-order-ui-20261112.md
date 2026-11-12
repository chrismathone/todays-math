# 문제 추출 쪽 순서 — H3-B 화면 구현 기록

2026-11-12 · UI 작업자 · 공유 작업트리 `phase/9-studio-page-order`.

## 범위와 읽은 기준

사용자가 선택한 `docs/design/mockups/hifi-studio-page-order-h3-20261112.html`의 H3-B를 구현했다. 목업 HTML의 배치·문구·조작 코드를 읽었으며 내장 이미지 base64는 출력하지 않았다. 루트 `CLAUDE.md`의 TDD·D-30·D-159, `DESIGN.md`, 작업실 메뉴 적용표, 작업 지시서, 설치된 Next의 `use-client.md`를 읽었다. Orca CLI·orchestration 및 React best-practices 스킬을 적용했다.

상단 단계 띠·되돌리기·초기화·시작·6초 알림, 파일 렌더·분석·저장·인식 연결은 코디네이터/모델 작업자의 범위다. 이 작업자는 해당 파일을 수정하지 않았고 커밋·푸시·병합·DB 접근·환경 파일 복사·운영 빌드·브라우저 실행을 하지 않았다.

## 바뀐 파일

- `src/components/unified/StudioPageOrderStep.tsx`(후속 통합 지시로 파일명 변경)
- `src/components/unified/StudioPageOrder.module.css`
- `src/components/paper-strip/PaperStrip.tsx`
- `src/components/paper-strip/EditablePaperStrip.tsx`
- `src/components/paper-strip/editable-paper-strip.module.css`
- `src/__tests__/components/StudioPageOrder.test.tsx`
- `src/__tests__/components/PaperStrip.editable.test.tsx`
- 이 보고서.

## PaperStrip 확장과 화면 동작

별도 갤러리를 복제하지 않고 `PaperStrip`의 선택적 `editable` 모드를 추가했다. 공용 부품이 카드 격자·선택 버튼·선택 테두리·파일 색 띠·제외/끌기/놓일 자리 표현·340px 오른쪽 칸을 소유한다. 선택 키와 선택 콜백, 앞 안내, 손잡이, 상태 배지, 카드 이벤트, 오른쪽 내용은 슬롯으로 받는다. 공용 폴더는 Studio 도메인을 import하지 않는다.

기존 가로 띠는 `HorizontalPaperStrip` 내부로 옮기고 기존 DOM·스크롤·배율·확대창 로직은 유지했다. `editable`을 주지 않은 기존 호출처는 같은 경로를 사용한다. 새 editable 모드의 지면 node는 호출자가 카드 크기에 맞춰 그리는 프레젠테이션 슬롯이며, 기존 띠의 배율·가로 이동 옵션은 가로 띠 모드용이다.

H3-B 화면은 둘째 줄의 파일 딱지·쪽 수와 본문부터 그린다. 카드 본체에는 클릭 이벤트·손가락 커서·hover 배경이 없다. 명시적 손잡이·크게 보기·빼기/되살리기만 조작이다. 선택과 끌기 표시는 화면 상태이며 쪽 신분·활성 쪽·새 번호는 실제 모델의 `studioPageKey`, `activePageOrder`, `pageNumber`를 사용한다. 이동 규칙·이력·저장 상태는 복제하지 않는다.

- 단추 네 개와 Alt+←→가 부모의 `onMove(key, direction)`를 호출한다. 처음/끝 경계와 선택한 제외 쪽의 이동을 막는다.
- ←→와 오른쪽 앞/다음 단추는 활성 쪽을 넘긴다. 제외 쪽도 크게 보기로 선택하고 그대로 되살릴 수 있다. 제외·복원·재배열 뒤 선택은 원본 키를 따라간다.
- 입력·select·textarea·contenteditable·IME 조합에는 방향키를 가로채지 않는다. Ctrl/Meta/Shift 조합도 가로채지 않는다.
- 손잡이만 draggable이다. 원본 카드로 drag ghost를 만들고 카드의 좌/우 절반에 따라 파란 세로줄을 표시한다. 놓기는 `{ before: key | null }`만 전달한다. 외부 drag·제자리 drop·취소는 변경을 만들지 않는다.
- 제외 카드는 제자리에서 점선·회색 면·흐린 원본 그림·`뺌` 배지를 유지한다. 배지는 그림의 opacity와 분리했다.
- `out && autoOut` 안내는 파일 이름과 원본 쪽을 기준으로 미리 뺐음을 알리며 되살리기를 제공한다. 빈 쪽은 `빈 쪽으로`와 `인쇄된 내용이 거의 없습니다.`로 표현한다. 복원하면 해당 안내가 사라진다.
- 전부 제외하면 `role=status`로 시작할 쪽이 없음을 알린다. 그림 준비 중·전달된 오류·실제 img 로드 실패를 표시한다. 이미지 alt는 파일 이름과 원본 쪽이다.
- 공용 컨테이너 폭 980px 이하에서 오른쪽 칸을 아래로 쌓고 420px 이하에서 카드 두 열을 사용한다. 초기 구현의 조작은 최소 44px였고, 통합 화면 검수에서 데스크톱은 H3-B의 34/28/26px로 조정했다. 모바일·coarse pointer에서는 44px를 유지하며 파일 이름과 알림은 줄바꿈한다. 작업실 전역 버튼 규칙보다 구체적인 선택자로 새 초점색과 손잡이 커서를 유지한다. 폭별 실제 배치 검증은 아래의 코디네이터 범위다.

## TDD와 검증 증거

1. **RED, 13:59:52** — 새 테스트 두 파일을 먼저 만들고 실행했다. 화면 컴포넌트가 없어 화면 suite가 적재에 실패했고, editable 테스트 2건은 기존 확대창이 열리거나 새 슬롯 안내가 없어 실패했다.
2. **연결 확인, 14:04:32** — 실제 모델 파일이 도착한 뒤 세 파일을 실행했다. 기존 띠 10건과 editable 2건은 통과했으나 화면 6건은 default import가 undefined여서 실패했다. 이 볼륨의 대소문자 구분 없는 파일 해석이 원인이었다(아래 참조).
3. **GREEN, 14:05:06** — 화면 테스트에서 `.tsx`를 명시해 3파일 18건이 통과했다. 모델 함수는 mock하지 않고 실제 구현을 사용했다.
4. 제외·복원 후 선택 유지, 외부/제자리/취소 drag, 한 파일, 실제 이미지 로드 실패 검증을 추가했다. jsdom에는 native DragEvent 좌표가 없으므로 `createEvent`에 clientX를 명시해 카드 앞/뒤 절반을 실제로 구별했다.
5. **최종 GREEN, 14:07:42** — 3파일 **21건 통과**(기존 PaperStrip 10, 새 editable 2, 새 화면 9). 이후 수정은 img lint 주석 위치와 CSS 선택자뿐이다.
6. **파일명 변경 후 GREEN, 14:10:39** — 코디네이터의 후속 지시에 따라 `StudioPageOrderStep.tsx`로 변경한 뒤 같은 3파일 **21건 통과**. 변경한 화면·테스트의 ESLint와 Prettier 검사도 통과했다.

```sh
npx vitest run src/__tests__/components/PaperStrip.test.tsx src/__tests__/components/PaperStrip.editable.test.tsx src/__tests__/components/StudioPageOrder.test.tsx --maxWorkers=3
```

`npm run lint:affordance` 통과(exit 0). 변경한 TSX·새 테스트 5파일의 ESLint 통과(exit 0, 경고 0). Prettier 적용. 기존 `PaperStrip.test.tsx`는 수정하지 않았다.

## 통합 시 주의와 남은 검증

이 작업트리 볼륨은 대소문자를 구별하지 않아 확장자 없는 `./StudioPageOrder`가 먼저 `studioPageOrder.ts` 모델로 해석된다. 화면 테스트에서 `.tsx`를 명시하면 RTL은 통과했으나 코디네이터의 타입 검사에서 TS1149가 확인됐다. 따라서 후속 확정 지시대로 UI 파일을 **`StudioPageOrderStep.tsx`**로 변경하고 화면 테스트도 **`@/components/unified/StudioPageOrderStep`**를 import하도록 변경했다. CSS는 기존 `StudioPageOrder.module.css`, 함수와 props 이름은 기존 그대로다. 모델 경로는 변경하지 않았고 코디네이터는 `StudioView`의 `./StudioPageOrderStep` 연결을 소유한다.

브라우저 목업 비교·실제 UI 폭별 검사·스크린샷·실제 drag ghost·문서 가로 넘침 확인은 코디네이터가 담당한다. RTL은 레이아웃과 drag ghost 픽셀을 검증하지 않는다. 전체 타입 검사·통합 테스트·최종 커밋도 코디네이터 범위다. 이 보고서는 해당 검증이 끝났다고 주장하지 않는다.

최종 통합 화면 검수와 실제 PDF 측정은 [통합 기록](studio-page-order-20261112/README.md)에 추가했다.

# 서술형 지면 Hi-fi — 5안 구현·인쇄 검증

2026-10-20 · 작업트리 `today-desc-wire` · 기준 HEAD `b553ad38f`.

**완료 범위:** [Hi-fi 브리프](../brief-descriptive-paper-hifi-codex.md)의 선택된 짜임을 고정한 5안, 일일·확인·기출형, 학생용·교사용, 컬러·흑백 전환과 실제 Chromium PDF 검증.

**열기:** [서술형 지면 Hi-fi](http://127.0.0.1:3034/dev/descriptive-paper-hifi).

제품 코드·서버 로직·DB를 변경하지 않았다. 기존 3034 개발 서버를 그대로 사용했다. 커밋·스테이징·푸시를 하지 않았고 `node_modules` 심볼릭 링크를 보존했다. 기존 Wire 파일도 변경하지 않았다.

## 1. 구현한 비교안

모든 안이 같은 Wire의 자작 7문항·모범풀이·채점 기준을 직접 재사용한다. 문1~~4는 객관식 2개·단답 2개, 문5~~7은 통서술형·소문항·도형 문항이다. 모양만 다르며 아래 배치는 고정했다.

- 일일·확인: 문제 바로 아래 서술형 답란. 학생용 4쪽.
- 기출형: 기존 두 단 문제지 1쪽 + 별도 서술형 답안지 1쪽. 문제지에는 일반·서술형 답란이 없다.
- 소문항: 모든 안에서 ⑴⑵⑶ 분할. 큰 칸 전환은 두지 않았다.
- 배점: 문5·6·7만 6·8·6점, 번호 옆에 표시한다. 별도 답안지의 배점도 번호와 같은 머리표에 있다.
- 교사용: 기준 9개, 기준별 배점·부분점수·기록 □·문항 소계·20점 합계와 선행 오류 원칙을 한 쪽에 둔다.

| 안              | 설명                                                     | 약점                                              | 실제 PDF에서 뽑은 흑백 한 쪽                                            |
| --------------- | -------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------- |
| A · 정돈된 줄   | 8mm 줄·풀이 라벨·사각 배점 상자·기본 채점표              | 큰 식이나 그림이 가로줄과 겹친다.                 | [답안지](descriptive-paper-hifi-codex-20261020/print-A-mono-answer.png) |
| B · 옅은 모눈   | 4mm 모눈·작은 소문항 머리표·넓은 채점 기록 칸            | 실물 복사 상태에 따라 옅은 모눈이 사라질 수 있다. | [답안지](descriptive-paper-hifi-codex-20261020/print-B-mono-answer.png) |
| C · 가벼운 점선 | 점선·풀이 라벨·둥근 배점·높은 채점 행                    | 약한 줄 경계가 필기와 겹치면 읽기 어려울 수 있다. | [답안지](descriptive-paper-hifi-codex-20261020/print-C-mono-answer.png) |
| D · 열린 풀이칸 | 빈칸과 마지막 기준선·대괄호 배점·가로선 채점표·점수 뒤 □ | 글씨 크기와 간격을 스스로 맞춰야 한다.            | [답안지](descriptive-paper-hifi-codex-20261020/print-D-mono-answer.png) |
| E · 번호 구획   | 왼쪽 번호 칸·줄·머리 면·채점표 교차 면과 합계 면         | 번호 칸만큼 필기 폭이 줄어든다.                   | [답안지](descriptive-paper-hifi-codex-20261020/print-E-mono-answer.png) |

| 적용 안               | 일일 학생용 | 확인 학생용 |         기출형 학생용 | 각 교사용 |
| --------------------- | ----------: | ----------: | --------------------: | --------: |
| A·B·C·D·E 모두        |         4쪽 |         4쪽 | 문제 1 + 답안 1 = 2쪽 |       1쪽 |
| 선택된 Wire 대비 증감 |         0쪽 |         0쪽 |                   0쪽 |       0쪽 |

쪽 수는 양면 인쇄의 종이 장수가 아니라 배부하는 쪽 수다. 이 7문항의 명시적인 배치 결과이며 실제 생성 엔진의 자동 페이지 분할을 검증한 것은 아니다.

## 2. 제품 모양과 시안 결정의 구분

[독립 소스 검토](descriptive-paper-hifi-codex-20261020/source-review.md)에서 같은 이름의 Jaseup 두 경로를 구분했다.

- **일일·확인 배치:** `src/components/print/templates/JaseupTemplate.tsx`와 `TestPrint.module.css`의 첫 장 학원명·학습일·제목·목표·개념 상자, 다음 장 간소 머리, 일반 문항의 `1.15fr : 1fr` 문제/모눈 구성을 따른다. 첫 장 `36px 50px 20px`, 다음 장 `24px 50px 20px` 여백을 유지했다.
- **C2 표현:** 통합 인쇄의 `PrintHeader.module.css` 머리 면·제목·개념 상자 스타일과 실제 `QuestionNumber`를 가져왔다. 금색 `PAPER_COLORS.accentGold`를 동일하게 지정했다. C2는 머리 면과 번호 면을 채우는 방식이며 금색만을 뜻하지 않는다. 기존 일일 배치에 최신 C2 표현을 얹은 것은 이 Hi-fi의 결정이다.
- **기출형:** 기존 `PastPaper.module.css`를 직접 사용해 금색 문항 띠·머리말·두 단을 유지했다. 위13·좌우12·아래10mm, 단 간격7mm, 오른쪽 단 왼쪽 경계를 유지한다. 배점을 우측 끝에서 번호 옆으로 옮기고 서술형만 표시한 것은 이번 브리프의 명시적 변경이다.
- **글꼴:** 자체 적재한 명조·Pretendard를 사용했다. CDP 실제 글꼴 조회에서 문항은 `NotoSerifKR-Regular`, 번호는 `PretendardVariable-ExtraBold`, 모두 `isCustomFont: true`를 확인했다. [측정값](descriptive-paper-hifi-codex-20261020/fonts.json)
- **작업 화면:** `--learn-*` 작업실 토큰을 사용하며 종이 안에는 제품 인쇄 토큰을 별도로 적용한다. 학생 앱이나 공용 템플릿을 수정하지 않았다.

확인 증거: [일일 첫 장](descriptive-paper-hifi-codex-20261020/print-A-daily-first.png), [일일 문5·6](descriptive-paper-hifi-codex-20261020/print-A-daily-writing.png), [문7 도형](descriptive-paper-hifi-codex-20261020/print-E-diagram.png), [기출 두 단](descriptive-paper-hifi-codex-20261020/print-A-past-first.png).

### 답란 높이

Wire와 같은 **기준 수 × 기준당 줄 수 × 줄 높이**로 문항 전체의 높이를 잡는다.

- 문5·7: `3 × 2 × 8mm = 48mm`.
- 문6: 가장 긴 ⑶의 풀이를 고려해 기준당 줄 예산을 3줄로 잡아 `3 × 3 × 8mm = 72mm`.
- 문6의 총 9줄은 **⑴ 2줄·⑵ 3줄·⑶ 4줄 = 16·24·32mm**로 재배분했다. 마지막 칸을 앞 칸보다 넓게 만드는 Hi-fi 제안이며 점수 3·3·2에 비례한 배분이 아니다.

소문항 머리표는 옆에 놓고 8mm 줄 간격과 전체 칸 높이를 유지했다. 이 숫자에는 학생 손글씨 실측 근거가 없음을 화면의 「답란 높이 기준 · 손글씨 실측 전」에 명시했다. 충분한 필기 공간이나 학습 효과를 검증했다는 뜻은 아니다.

## 3. 검증 결과와 수정

원본 결과와 정확한 실행 시각은 [measurements.json](descriptive-paper-hifi-codex-20261020/measurements.json)에 있다.

| 검사                                                              | 결과                                                                                                                   |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1440·1040·768·760·390·320px × 5안 × 3지면 × 학생/교사 × 컬러/흑백 | **360조합**, 문서 가로 넘침 **0px**                                                                                    |
| 지면·필기 영역                                                    | A4 비율, 48/72mm 답란, 16·24·32mm 소문항 칸 확인. 문항·답란·채점표·채점 안내의 영역 이탈과 푸터 충돌 **0**             |
| 문항·배점·답 노출                                                 | 7문항 각 한 번, 문5~7만 서술형 답란·배점, 교사 기준 합20점. 기출 문제지 2단·답란0, 학생 DOM의 교사 모범풀이 검사 통과  |
| 실제 Chromium PDF                                                 | **60파일·130쪽**. 전 조합 예상 쪽 수 일치, A4 MediaBox 오차1pt 이내                                                    |
| PDF 텍스트                                                        | 컬러·흑백 60파일 모두 한글 「서술형」과 수치 `9,900` 추출. 화면 도구 모음은 인쇄에서 제외                              |
| PDF 실제 글자 경계                                                | 130쪽·22,654개 텍스트 경계 검사, 페이지 밖 글자0. [측정값](descriptive-paper-hifi-codex-20261020/pdf-text-bounds.json) |
| 흑백 렌더                                                         | 안별 답안지 PNG 5장의 비회색 픽셀0. [측정값](descriptive-paper-hifi-codex-20261020/grayscale.json)                     |
| 실제 글꼴                                                         | Noto Serif KR·Pretendard 자체 적재 확인                                                                                |
| 조작·D-30                                                         | Enter로 안 전환. 종이 안 버튼·입력0. 대상 TSX/CSS 어포던스 검사 통과                                                   |
| 네트워크·런타임                                                   | 시안의 API/외부 요청 시도0, 예기치 않은 브라우저 오류0. 아래의 기존 인증 로그는 별도 기록                              |
| 정적 검사                                                         | 대상 ESLint·Prettier·D-30 통과, 저장소 TypeScript `--noEmit --incremental false` 통과                                  |

PDF 12쪽을 Poppler로 PNG 렌더해 머리말·한글·그림·답란·□·합계·푸터를 확인했다. 흑백 답안지 5장은 위 비교표에서 안별로 볼 수 있다. 채점표는 [A 기본](descriptive-paper-hifi-codex-20261020/print-A-teacher.png), [C 높은 행](descriptive-paper-hifi-codex-20261020/print-C-mono-teacher.png), [E 기록·합계 면](descriptive-paper-hifi-codex-20261020/print-E-mono-teacher.png)으로 비교한다.

화면 증거: [1040px](descriptive-paper-hifi-codex-20261020/overview-1040.png), [390px](descriptive-paper-hifi-codex-20261020/overview-390.png), [320px](descriptive-paper-hifi-codex-20261020/overview-320.png).

검사 중 발견해 수정한 사항:

1. B 채점표의 □를 세로로 쌓으면 하단 안내가 푸터와 겹쳤다. 넓은 기록 칸에서 가로로 배치해 한 쪽을 유지했다.
2. 전체 지면의 CSS 회색조 필터는 PDF를 이미지로 만들어 텍스트 추출이 사라졌다. 흑백 전용 회색 잉크·면·선 토큰으로 바꿔 텍스트를 보존했다.
3. 0.6px 모눈이 화면과 달리 PDF에서 사라졌다. 제품 모눈처럼 1px로 바꾸고 실제 PDF를 다시 확인했다.
4. 반복 배경으로 그린 줄은 PDF에서 일부 눈금이 빠졌다. 줄·점선은 각 8mm 위치의 실제 CSS 경계선으로 바꿔 모든 줄을 유지했다.
5. D의 마지막 소문항에도 기준선을 두고, 별도 답안지의 배점을 번호와 붙였다.

### 환경 기록과 검증 한계

기존 3034 서버는 `AUTH_SECRET` 미설정으로 Auth.js `MissingSecret` 및 그 호출 스택을 브라우저 콘솔에 전달한다. **변경하지 않은 Wire에서도 같은 오류를 재현**했다. QA는 이 두 서명만 별도로 수집하고, Wire에서 재현되지 않거나 다른 오류가 나오면 실패하도록 했다. 따라서 전체 콘솔 오류가 0이라는 주장은 하지 않는다. 실제 횟수·원문은 측정 JSON의 `serverDiagnostics`와 `baselineDiagnostics`에 있다. 인증 환경이나 제품 인증 코드를 변경하지 않았다.

별도 답안지 PDF를 Poppler로 렌더할 때 `Bad bounding box in Type 3 glyph` 경고가 발생했으나 종료 코드는0이고, 대표 렌더의 글자·머리·구획·배점 누락은 발견하지 못했다. 실물 프린터·복사기·학생 손풀이·교사 채점 시간은 검사하지 않았다. 폰의 A4는 전체를 축소한 비교 미리보기다.

## 4. 파일·재현·보존

- [페이지](../../../../src/app/dev/descriptive-paper-hifi/page.tsx)
- [화면·지면 컴포넌트](../../../../src/app/dev/descriptive-paper-hifi/DescriptivePaperHifi.tsx)
- [Hi-fi 스타일](../../../../src/app/dev/descriptive-paper-hifi/DescriptivePaperHifi.module.css)
- [5안과 높이 규칙](../../../../src/app/dev/descriptive-paper-hifi/fixtures.ts)
- [화면·Chromium PDF 측정 스크립트](../../../../scripts/qa/measure-descriptive-paper-hifi.mjs)

```sh
DESCRIPTIVE_HIFI_URL=http://127.0.0.1:3034/dev/descriptive-paper-hifi \
  node scripts/qa/measure-descriptive-paper-hifi.mjs
```

`--quick`은 1040px의60조합만 검사하며 PDF를 새로 만들지 않는다. 전체 실행은 증거 폴더의 화면 PNG·측정 JSON과 `tmp/pdfs/descriptive-paper-hifi/`의 검증용 PDF60개를 갱신한다. 설치된 Chrome과 Poppler의 `pdftotext`를 사용한다. 예를 들어 B 흑백 답안지 한 쪽을 다시 렌더하려면:

```sh
pdftoppm -f 2 -l 2 -singlefile -scale-to 1200 -png \
  tmp/pdfs/descriptive-paper-hifi/B-past-student-mono.pdf \
  docs/planning/tracks/reports/descriptive-paper-hifi-codex-20261020/print-B-mono-answer
```

독립 소스 검토는 Orca Codex worker가 맡았고 보고서는 이 작업트리에 보존했다. 검토 worker는 완료 후 종료·해제했다. 그 작업트리에는 작성한 변경이 없지만 생성 시점의 `origin/main` 기반 커밋이 현재 로컬 `main`에 포함되지 않아, 「미병합 작업트리를 제거하지 않는다」는 규칙에 따라 보존했다. 이번 브리프는 커밋 금지이므로 main 병합이나 제품 반영은 수행하지 않았다.

페이지에는 production `notFound()` 가드를 두었다. production 빌드·배포나 제품의 서술형 답안지 구현 완료를 주장하지 않는다. 납품물은 비교 페이지와 보고서·검증 증거이며 결과는 미커밋 상태로 남긴다.


## 5. 고침 — 일반 풀이 공간까지 안별 모양 적용·픽셀 검증

2026-10-20 17:21 KST 완료. [고침 브리프](../brief-descriptive-paper-hifi-fix-codex.md)를 수행했다. 위 1~4절은 최초 구현 기록이며, 아래는 이번 수정 후 새로 실행한 결과다. 위에서 연결한 대표 PDF 렌더 12장과 화면 측정 증거는 최신 시안으로 갱신했다.

### 고친 내용과 수정 전 관찰

- 일반 객관식·단답 문1~4의 `.scratch`에서 고정 16px 모눈을 없앴다. 서술형 답란과 같은 선택안의 패턴·선 컴포넌트를 사용한다. **A 8mm 줄 / B 4mm 모눈 / C 8mm 점선 / D 빈 내부와 아래 기준선 / E 번호 구획과 8mm 줄**이 시험지 한 벌에 적용된다. 선 굵기는 기존 1px, 소문항 구획선은 기존 안별 값이다.
- 일반 풀이 공간은 기존 좌우 배치와 가변 높이를 유지한다. A4 높이까지 만든 장식선 중 공간 안쪽만 그려 8mm 간격을 유지한다. 문5·7 48mm, 문6 72mm와 ⑴⑵⑶ 16·24·32mm도 유지했다.
- `.answerSpace[data-answer-split="true"] .writingArea`의 `background` 단축 초기화를 제거했다. 하위 칸의 바탕은 `background-color`로 지정하여 패턴 속성을 초기화하지 않는다.
- E는 통답란에도 문항 번호 5·7, 일반 풀이 공간에도 1~4의 **8mm 번호 열**을 넣었다. 소문항은 기존 ⑴⑵⑶ 열을 쓰며 줄은 번호 열 오른쪽부터 그린다. A/E의 중앙 줄 간격은 같고 구획으로 구별된다.

수정 전 Chromium 캡처에서 일반 풀이 공간 A~E의 10쌍은 **모두 다른 픽셀 0개**였다. [수정 전 측정](descriptive-paper-hifi-codex-20261020/fix/before/scratch-differences.json), [기존 A 일반 풀이](descriptive-paper-hifi-codex-20261020/fix/before/A-scratch.png).

B는 관찰을 구분한다. 이 작업트리에서 캡처한 [수정 전 B 분할 칸](descriptive-paper-hifi-codex-20261020/fix/before/B-split.png)에는 이미 모눈이 보였다. 부모의 배경 초기화와 별개로 자식 `.grid .subSpace`가 모눈을 다시 그렸기 때문이다. 부모의 잘못된 초기화는 제거했지만, **과거의 모든 분할 칸 소실을 재현했다고 주장하지 않는다.** 수정 후에는 모든 지면·색 모드에서 세 칸 각각을 새 픽셀 검사로 확인했다.

### 픽셀 검사 방식

[추가한 픽셀 검사 스크립트](../../../../scripts/qa/measure-descriptive-paper-hifi-pixels.mjs)는 실제 Google Chrome(Chromium)의 1040px·DPR 1 스크린샷과, `printBackground: true`로 생성한 PDF를 **Poppler 144dpi**로 렌더한 PNG를 읽는다. CSS 계산값을 모양의 통과 근거로 쓰지 않는다. DOM 경계는 같은 문항·같은 칸의 위치를 찾는 데만 사용한다.

1. 일반 문1~4, 통답란 문5·7, 분할 ⑴⑵⑶를 각각 잘라 보존한다. 선택 전환은 실제 `aria-pressed` 반영을 확인하고, 글꼴·스크롤 후 두 번의 프레임을 기다린다.
2. 테두리·문자·번호 열을 뺀 내부에서 가로선·세로선·점의 틈과 물리 간격을 잰다. D는 내부가 비어 있고 아래 선이 있는지, E는 번호 열의 면이 있는지 별도로 검사한다. B는 수평선과 수직선이 모두 있어야 한다.
3. 각 영역의 **왼쪽 1mm·위 5mm에서 62×8mm**를 잘라 248×32px로 정규화하고 A~E의 10쌍을 비교한다. RGB 중 한 채널이라도 4 초과 차이면 다른 픽셀로 세고, 비율 **0.5% 초과**를 요구한다. 이 영역은 E 구획을 포함하되 머리·배점·안 이름은 제외한다. 내부 무늬 검사를 함께 통과해야 하므로 글자만 달라서 통과할 수 없다.
4. PDF 아래 경계는 래스터 반올림으로 선을 자르지 않도록 `ceil(height)+1px`까지 포함한다. 화면 흑백 판정은 캡처 바깥의 회청 화면 바탕이 섞일 수 있는 외곽 1px를 제외한다. PDF 흑백 판정은 **전체 쪽**의 모든 픽셀을 검사한다.
5. 최신 소스 SHA-256과 기존 전체 검사 결과의 해시가 같아야 시작하며 종료 시에도 소스가 바뀌지 않았는지 확인한다. 한 번의 비교에 서로 다른 HMR 상태를 섞지 않는다.

원본 결과: [pixels.json](descriptive-paper-hifi-codex-20261020/fix/pixels.json). 소스 해시와 실행 시각, 영역별 선 개수·간격·잉크 비율, 920쌍의 차이, PDF 글자 경계, 기존 인증 진단을 포함한다.

### 안별 실제 무늬 결과

| 안 | 검사한 영역 | 실제 픽셀 간격(화면·PDF 합산) | 추가 판정 |
| --- | ---: | --- | --- |
| A | 92 | 7.94–8.21mm | 가로 실선, 세로 모눈 없음 |
| B | 92 | 3.92–4.01mm | 수직선도 존재, 세로 간격 3.98–4.01mm; 세 분할 칸 36건 모두 통과 |
| C | 92 | 7.94–8.01mm | 가로 점·틈 존재, 실선으로 변하지 않음 |
| D | 92 | 반복선 없음 | 내부 잉크 0, 각 영역의 아래 기준선 존재 |
| E | 92 | 7.94–8.01mm | 가로줄 + 8mm 번호 열의 면·경계 존재 |

8mm/4mm는 픽셀로 반올림되므로 범위로 기록했다. 각 안 92건은 화면 46건+PDF 46건이며 컬러·흑백, 일일·확인·기출을 합한 수다. B 분할 칸 36건은 3칸×3지면×2색×2매체다.

[흑백 PDF 무늬 비교 이미지](descriptive-paper-hifi-codex-20261020/fix/mono-pdf-pattern-contact.png)는 위에서 A~E, 왼쪽부터 일반 문1·통답란 문5·분할 ⑶ 순서다. 실제 PDF 픽셀의 윗부분을 그대로 붙인 이미지이므로 D의 아래 기준선은 [D 답안지 전체](descriptive-paper-hifi-codex-20261020/print-D-mono-answer.png)에서 확인한다. B는 [세 분할 칸 전체](descriptive-paper-hifi-codex-20261020/print-B-mono-answer.png), E는 [번호 구획 전체](descriptive-paper-hifi-codex-20261020/print-E-mono-answer.png)도 확인했다.

아래 값은 각 범주에서 **가장 작은** 다른 픽셀 비율이다. 컬러·흑백 및 해당 문항·지면을 모두 포함한다. 920쌍 모두 통과했고 전체 최소는 **4.08%**다.

| 비교 쌍 | 화면 일반 풀이 | 화면 통·분할 답란 | PDF 일반 풀이 | PDF 통·분할 답란 |
| --- | ---: | ---: | ---: | ---: |
| A-B | 23.71% | 23.66% | 30.32% | 29.75% |
| A-C | 5.28% | 4.89% | 4.74% | 5.65% |
| A-D | 6.25% | 6.25% | 6.25% | 6.25% |
| A-E | 12.10% | 10.96% | 11.01% | 10.21% |
| B-C | 22.92% | 23.08% | 29.94% | 26.15% |
| B-D | 24.12% | 24.09% | 30.63% | 28.20% |
| B-E | 31.30% | 31.12% | 36.64% | 34.53% |
| C-D | 5.07% | 4.88% | 4.08% | 6.15% |
| C-E | 16.62% | 15.46% | 15.36% | 14.43% |
| D-E | 17.59% | 16.82% | 16.80% | 16.05% |

### 범위·넘침·인쇄 회귀 결과

| 검사 | 이번 수정 후 결과 |
| --- | --- |
| 화면 1440·1040·768·760·390·320px × 5안 × 3지면 × 학생/교사 × 컬러/흑백 | 360조합, 가로 넘침 0px |
| 일반 풀이 공간·라벨·번호 열의 경계 | 기존 geometry 검사에 직접 추가, 영역 이탈 0 |
| 지면·문항·답란·표·푸터 충돌 | 0, 높이 48/72mm 및 16·24·32mm 유지 |
| 실제 픽셀 무늬 | 화면 230영역 + PDF 230영역 = 460영역 통과 |
| A~E 같은 위치 비교 | 920쌍 통과, 최소 차이 4.08% |
| 학생용 | 일일 4쪽·확인 4쪽·기출 2쪽, 문1~7 각 한 번, 서술형만 배점·답란, 교사 해설 노출 0 |
| 교사용 | 30상태, 각 1쪽·기준 9개·합계 20점. 학생 답란·일반 풀이 공간 0개가 정상 |
| 기출 문제지 | 두 단 1쪽, 일반 풀이 공간·내 정답·서술형 답란 0개가 정상. 별도 답안지의 통·분할 답란에만 패턴 적용 |
| 실제 Chromium PDF | 60파일·130쪽, 전 조합 쪽 수·A4 MediaBox 일치, 화면 도구 인쇄 노출 0 |
| PDF 글자 경계 | 130쪽·22,618개 경계 검사, 페이지 밖 글자 0, 한글·수식 텍스트 추출 유지 |
| 흑백 | 화면 필기 영역 115개 내부의 비회색 픽셀 0; 흑백 PDF 30파일·65쪽 전체의 비회색 픽셀 0 |
| 런타임 | API·외부 요청 0, 예기치 않은 브라우저 오류 0. 기존 MissingSecret 진단은 Wire에서도 재확인해 별도 수집 |
| 정적 검사 | 대상 ESLint·Prettier·D-30 통과, 저장소 TypeScript `--noEmit --incremental false` 통과 |

전체 지면 회귀는 [갱신한 기존 측정 스크립트](../../../../scripts/qa/measure-descriptive-paper-hifi.mjs)와 [측정 JSON](descriptive-paper-hifi-codex-20261020/measurements.json)에 있다. geometry/PDF 실행 시각은 `2026-10-20T08:18:16.074Z`, 픽셀 검사 완료 시각은 `2026-10-20T08:21:40.546Z`다. 기존 `pdf-text-bounds.json`은 최초 검증 기록이며, 이번 글자 경계 수치는 새 `fix/pixels.json`의 `pdfBounds`가 근거다.

대표 PDF 12쪽을 다시 렌더했으며, A 일반 풀이·B 모눈과 세 분할 칸·C 점선·D 기준선·E 번호 구획·교사 채점표·합계·푸터를 직접 열어 확인했다. [렌더 목록·진단](descriptive-paper-hifi-codex-20261020/fix/representative-renders.json). 기존 Type 3 glyph 경고의 한계와 실물 프린터·복사기·손글씨 실측 미수행은 그대로다. 배경 출력을 끈 인쇄 결과까지 검증한 것은 아니다.

### 재현·보존

3034 개발 서버에서 아래 순서대로 실행한다. 첫 명령이 최신 60 PDF를 만든 뒤 두 번째 명령이 실제 픽셀을 검사한다. `--quick`만 실행한 결과나 다른 소스 해시의 PDF는 픽셀 검사의 선행 결과로 사용할 수 없다.

```sh
node scripts/qa/measure-descriptive-paper-hifi.mjs
node scripts/qa/measure-descriptive-paper-hifi-pixels.mjs
```

결과 crop·픽셀 JSON은 `docs/planning/tracks/reports/descriptive-paper-hifi-codex-20261020/fix/`, PDF는 `tmp/pdfs/descriptive-paper-hifi/`, 전체 쪽 렌더는 `tmp/pdfs/descriptive-paper-hifi-fix-render/`에 있다. 화면은 [3034 Hi-fi](http://127.0.0.1:3034/dev/descriptive-paper-hifi)에서 바로 비교할 수 있다.

[Orca Codex 독립 검토](descriptive-paper-hifi-codex-20261020/fix/independent-review.md)의 픽셀 검사·일반 공간 경계 검사 보완점을 반영했다. 이 검토 문서는 최종 QA 전의 시점 기록이며 그 안의 당시 미확인 항목은 위 새 결과로 확인했다. 검토 worker는 완료 후 종료했다. worker 작업트리는 깨끗하지만 생성 기반에 현재 로컬 main에 없는 2커밋이 있어 미병합 작업트리 삭제 금지 규칙에 따라 보존했다.

수정 범위는 Hi-fi 시안 TSX/CSS, 두 QA 스크립트, 이 보고서와 증거다. **제품 코드·Wire·DB·3034 서버 설정은 변경하지 않았고, 커밋·스테이징·푸시도 하지 않았다. `node_modules`는 기존 심볼릭 링크 그대로이며 git add하지 않았다.**

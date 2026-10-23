# 비상 개념플러스연산 라이트 초등 수학 5-1 답안 팩 검수

검수일: 2026-10-24. 팩: `visang-26711-2022-full-v1`.

출판사 공개 PDF 32쪽의 메인 북·클리닉 북 **전체 답안 주소**를 등록했다. 189개 인쇄 쪽 그룹에 주문항 주소 2,138개가 있으며, 실제 이미지와 대조한 정답 참조는 2,071개이고 세로 나눗셈표를 포함한 67개 답안은 `key: null`이다. 주소 범위는 완전하며 정답 텍스트 범위는 부분 수록이다.

| 권 | 답안에 표시된 교재 쪽 | 쪽 그룹 | 주소 | reviewed 정답 | null |
|---|---|---:|---:|---:|---:|
| 메인 북 | 8~33, 36~69, 72~79, 82~103, 106~137, 140~171 | 154 | 1,703 | 1,652 | 51 |
| 클리닉 북 | 1~5, 7~17, 19~23, 25~38 | 35 | 435 | 419 | 16 |
| 합계 | 두 권의 전체 답안 범위 | 189 | 2,138 | 2,071 | 67 |

## 서지와 출처

[비상 공식 교재 상세](https://book.visang.com/books/info/5765)에서 제목 **개념플러스연산 라이트 초등 수학 5-1 (22 개정)**, 교육과정 **2022개정**, 학습년도 **2026년 학습**, ISBN **979-11-7316-354-8**을 확인했다. 공식 쪽수는 메인 북 172쪽, 클리닉 북 40쪽, 정답 32쪽이다. 팩의 `edition`은 `2026년 학습 · 2022개정`으로 식별한다.

공개 상세에서 발행일·쇄는 확인하지 못했으므로 주장하지 않는다. [공식 자료실 목록](https://book.visang.com/search?pageRes=59)의 자료 등록 연도 2025 및 PDF 내부 제작 파일의 날짜를 판본 연도로 쓰지 않았다. 팩 식별자의 `2022`는 교육과정을 뜻한다.

보존된 카탈로그의 `resource_id: 26711`은 상품 5765와 [공식 정답 PDF](https://cdn.visang.com/book/202506/20250623163004477.pdf)를 연결한다. 같은 5-1 교재인 개념플러스**유형** 상품 5761의 기존 부분 팩과 별도 자료다.

- 원본: `/Volumes/TodayWork/commercial-workbook-sources/survey-20261024/root/samples/visang-26711.pdf`
- 원본 SHA-256: `01e9f604de6a07e806eeb1663257ff6f000fb3536a9d7d16581d7d29876c394b`
- 크기: 15,397,939 bytes, 32쪽. 원본 파일을 수정하지 않았다.
- 카탈로그: `/Volumes/TodayWork/commercial-workbook-sources/survey-20261024/root/visang-catalog.json`
- 다운로드 이력: `/Volumes/TodayWork/commercial-workbook-sources/survey-20261024/root/sample-manifest.json`
- 공식 상세 HTML: `/Volumes/TodayWork/commercial-workbook-sources/intake-20261024/visang/visang-26711/product-5765.html`

## 주소와 계수 기준

인쇄된 주문항 번호 하나를 한 행으로 셌다. 값이 여러 개여도 원문 순서로 한 `answerText` 안에 보존했다. 별도 소문항 번호가 인쇄된 답안은 없어 모든 `address.subpart`는 빈 문자열이다. 숫자 배열의 요소나 계산 예시의 중간 숫자를 각각 문항으로 세지 않았다.

각 답안 제목의 교재 쪽을 직접 읽어 주소를 정했다. 예를 들어 메인 북 26쪽은 1~7번, 27쪽은 8~21번이다. 두 번째 쪽의 번호를 1로 다시 매기거나 순번·일차를 교재 쪽으로 바꾸지 않았다. 이 PDF의 답안 쪽 제목은 모두 단일 쪽이다. 보고서의 범위 표기는 요약이며 실제 행에는 인쇄된 단일 쪽을 넣었다.

`sourcePage`는 표지를 1쪽으로 세는 PDF 파일 쪽이다. 메인 북 답은 PDF 2~27쪽, 클리닉 북 답은 PDF 28~32쪽에 있다. PDF 1쪽은 표지와 권별 시작 쪽 안내다. 공식 총 쪽수 안에 있지만 PDF 답안 제목이 없는 교재 쪽은 채워 넣지 않았다. 그 목록은 coverage의 `nonAnswerPages`에 있으며 해당 본문에 문제가 없다는 주장도 하지 않는다.

## 이미지 검수와 표기

`pdftoppm -scale-to 1700 -png`로 원본 32쪽을 렌더링하고 **모든 쪽의 보이는 제목·쪽·번호·답**을 직접 대조했다. 렌더링과 전체 추출 텍스트는 외부 intake에만 보관한다. 각 페이지 이미지의 SHA-256은 coverage의 `source.reviewedImages`에 기록했다.

- 증거 디렉터리: `/Volumes/TodayWork/commercial-workbook-sources/intake-20261024/visang/visang-26711/`
- 이미지: `page-01.png`부터 `page-32.png`까지.
- 최초 추출: `/Volumes/TodayWork/commercial-workbook-sources/intake-20261024/visang-26711-layout.txt`
- 페이지별 외부 추출: `text-01.txt`부터 `text-32.txt`까지.
- 외부 검수 목록: `visual-review-inventory.json`.
- 추가 수치 대조: `independent-numeric-check.json`, `crosscheck_numeric.py`.

클리닉 북 PDF 28~32쪽에는 보이지 않는 중복 텍스트와 구판 잔여 문자가 추출된다. 특히 PDF 32쪽 추출에는 도형 단원의 쪽 순서가 뒤섞이지만 렌더링에는 **클리닉 37쪽이 사다리꼴, 38쪽이 마름모**로 명확하다. 이 인쇄 순서로 등록하고 독립 테스트 사례로 고정했다.

분수는 `분자/분모`, 대분수는 `정수 분자/분모`로 적었다. 복수 답안 사이의 원문 슬래시는 양쪽 공백을 두어 분수와 구분한다. 분모를 약분하거나 동치 표현으로 교체하지 않았다. `예`가 있는 답은 `예:`를 보존하며 유일한 허용 답으로 취급하지 않는다. 기호의 색은 저장하지 않고 서로 다른 모양 `■ ▲ ★ ● ◆ ♥`으로 구별한다. 넓이 단위는 `cm²`, `m²`로 보존했다.

전체 이미지 검수 후 별도 PDF 위치·글꼴 기반 대조에서 PDF 2~5·13~27쪽의 수치 답안 **1,220개**가 저장할 수치 토큰과 일치했다. 이 추가 검사는 수치 다중집합 비교이며 숫자 순서나 분수의 시각적 배치를 단독으로 증명하지 않는다. 원문 이미지 검수를 대체하지 않았다.

## null 원장과 한계

다음 67개는 세로 나눗셈표와 결과가 함께 있는 복합 답안이다. 도식의 배치를 손실시키거나 최종 수치만 전체 답안으로 대신하지 않고 행 전체의 `key`를 null로 남겼다. coverage의 `nullKeyLedger`는 각 정확한 주소, PDF 출처 쪽, 검수 쪽과 사유를 모두 기록한다.

| 권 | 교재 쪽·문항 | PDF 출처 | 수 |
|---|---|---|---:|
| 메인 북 | 53쪽 9~16, 54쪽 1~8, 55쪽 9~16 | 8 | 24 |
| 메인 북 | 63쪽 9~16, 64쪽 1~8, 65쪽 9~16, 66쪽 4~6 | 10 | 27 |
| 클리닉 북 | 11쪽 1~8, 14쪽 1~8 | 29 | 16 |

문제 본문·풀이 문장·그림은 저장소에 수록하지 않았다. 짧은 정답 참조와 기호식만 교사 수동 채점을 위해 제공하며, 자동 채점·동치 답 인정·서술형 평가·성취기준 정합성이나 학습 효과를 검증했다는 의미는 아니다. 실제 본문 전체를 검토한 팩이 아니라 출판사 전체 **답안 범위**를 검토한 팩이다.

## 산출물과 검증

- `data/commercial-workbooks/visang-26711-2022-full-v1.json`: canonical metadata/provenance/exercises 형태.
- `data/commercial-workbooks/visang-26711-2022-full-v1.tsv`: UTF-8, quoted TSV. null 행의 정답·상태·출처 필드는 비우고 별도 원장에 출처를 남겼다.
- `data/commercial-workbooks/visang-26711-2022-full-v1.coverage.json`: 전체 기대 쪽 그룹, 수량, 출처·판본 증거, 이미지 해시, null 원장, 범위와 한계.
- `src/__tests__/unit/commercialWorkbookVisangOperationPack.test.ts`: 7개 focused tests.

실행: `npx vitest run src/__tests__/unit/commercialWorkbookVisangOperationPack.test.ts` — **1 file, 7 tests passed**. canonical schema, TSV 완전 왕복, 정확한 2,138개 주소 집합, 189개 그룹의 인쇄 번호 경계와 출처 매핑, 전체 null 원장, 독립적인 분수·비교 기호·예시·단위·이어지는 번호·클리닉 37/38쪽 사례를 검증했다.

해당 테스트 파일의 ESLint와 `git diff --cached --check`도 통과했다. 마지막 원본 SHA-256 재확인에서도 보존된 원본과 일치했다.

공유 contract, importer, 기존 팩, UI, registry, DB, 환경변수는 수정하지 않았다. UI 표시와 팩 등록은 조정자의 통합 범위로 남는다.

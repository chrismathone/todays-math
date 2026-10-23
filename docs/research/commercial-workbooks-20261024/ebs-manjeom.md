# EBS 만점왕 수학 5-1 (2026) 정답 팩 검토

검토일: 2026-10-24. 팩 ID: `ebs-manjeom-e5-1-2026-v1`.

지정된 **한눈에 보는 정답 전체(PDF 2~17쪽)**의 주번호 주소 818개를 등록했다. BOOK1 개념책은 458개, BOOK2 실전책은 360개다. 이미지로 대조한 짧은 정답 참조 669개와 정답 미수록 `key: null` 149개를 포함한다. 빠른 정답의 주소 누락은 0개이며, 모든 답안이 텍스트 키로 제공된다는 뜻은 아니다.

## 판본 확인

| 항목 | 확인 결과 | 공식 근거 |
| --- | --- | --- |
| 표제·판본 | 만점왕 수학 5-1 (2026) | [EBS BookStory 상품](https://book.ebs.co.kr/sub/primary/view?txbkId=TB1000013094&ebkId=EB100002640), [EBS 정답 게시물](https://primary.ebs.co.kr/book/answer/index#answer/view/115/60000465839/0/1//0) |
| 출판사·학년 | EBS, 초등 5학년 수학 1학기 | 상품 제목·과목·권장 대상 |
| 종이책 ISBN | **9788954795920** | BookStory의 종이책 영역과 책 소개 탭, [EBS 초등 교재 상세](https://primary.ebs.co.kr/book/main/view?textbookId=TB1000013094) |
| 교육과정 | 2022개정 | [공식 강좌 100007146](https://primary.ebs.co.kr/course/view?courseId=100007146)의 제목 옆 `2022개정` 배지. 같은 페이지의 교재 링크는 `TB1000013094`, 미리보기는 ISBN `9788954795920` |
| 구성 | BOOK1 개념책, BOOK2 실전책, BOOK3 풀이책 | BookStory 목차 탭. 개념책·실전책 각각 여섯 단원 |
| 게시일 | 2025-12-29 | 정답 게시물의 작성일 `25.12.29`. 판본 연도의 근거는 제목·안내문이며 게시일이 아님 |
| 발행일·쇄차 | 확인하지 못함 | 날짜·쇄차를 추가로 단정하지 않음. PDF 하단의 2025-11-17 제작 시각도 발행일로 사용하지 않음 |

같은 BookStory 화면의 **전자책 ISBN 9788954796095**와 종이책 ISBN을 구별했다. `수학 플러스`와도 다른 교재다. 공식 게시물은 `2026만점왕수학5-1(북3).pdf`를 [다운로드 ID 30000005667](https://primary.ebs.co.kr/board/common/download?division=&id=30000005667)로 연결한다. 제공된 원본의 SHA-256은 `5488c312b7212b3431010c1af7e83c262b9e983b66852b40ee356599d8dc5c11`, 6,076,876바이트, 80쪽이며 원본은 변경하지 않았다.

## 주소 범위와 세는 방법

한 행은 **인쇄된 주번호 하나**다. `01`~`20`의 선행 0을 보존하고, 소문항 `⑴`~`⑷`, 방법 표지, 예시 표지, 배열 순서와 대안은 같은 행의 `answerText`에 보존했다. `address.subpart`는 모두 빈 문자열이다. 전체 818개는 소문항 수가 아니라 주번호 수다.

`address.volume`은 `BOOK1 개념책` / `BOOK2 실전책`, `section`은 인쇄된 단원 번호·이름이다. `page`에는 정답 머리글에 실제로 인쇄된 교재 쪽 또는 범위를 사용했다. `10~11`, `20~23`, `6~8` 등 범위를 개별 쪽으로 추정해 분해하지 않았고, 답안의 순번에서 본책 쪽수를 추론하지 않았다. 78개 페이지 그룹의 번호 목록과 개수는 coverage 파일에 모두 들어 있다.

| 단원 | BOOK1 주소 / 키 / null | BOOK2 주소 / 키 / null |
| --- | ---: | ---: |
| 1. 자연수의 혼합 계산 | 62 / 54 / 8 | 60 / 45 / 15 |
| 2. 약수와 배수 | 63 / 60 / 3 | 60 / 46 / 14 |
| 3. 대응 관계 | 66 / 56 / 10 | 60 / 43 / 17 |
| 4. 약분과 통분 | 63 / 55 / 8 | 60 / 40 / 20 |
| 5. 분수의 덧셈과 뺄셈 | 74 / 65 / 9 | 60 / 46 / 14 |
| 6. 다각형의 둘레와 넓이 | 130 / 114 / 16 | 60 / 45 / 15 |
| 합계 | **458 / 404 / 54** | **360 / 265 / 95** |

BOOK1의 정답 그룹은 교재 9~147쪽, BOOK2는 5~63쪽에 걸쳐 있다. 그 사이의 개념 설명·핵심 정리 등 빠른 정답에 없는 본책 활동까지 조사한 것은 아니다. PDF 1쪽은 표지, 18~80쪽은 상세 풀이로 이번 주소 범위 밖이다. 18쪽 이미지를 별도로 확인해 빠른 정답의 종료와 상세 풀이의 시작을 검증했다.

`key.sourcePage`는 **1부터 세는 PDF 파일 쪽**이다. 네 그룹이 PDF 다음 쪽으로 이어지며 행별로 출처를 분리했다.

| BOOK1 교재 그룹 | PDF 앞쪽 | PDF 이어지는 쪽 |
| --- | --- | --- |
| 18~19 | 2쪽, 01~09 | 3쪽, 10~11 |
| 54~55 | 4쪽, 01~03 | 5쪽, 04~11 |
| 102~103 | 8쪽, 01~06 | 9쪽, 07~11 |
| 118~119 | 9쪽, 01~06 | 10쪽, 07~11 |

## 정답 검토와 미수록 기준

Poppler `pdftoppm -scale-to 2200 -png`로 PDF 2~17쪽 전체를 렌더링하고, 페이지 머리글·주번호·소문항·정답을 이미지로 읽어 옮겼다. 레이아웃 추출 텍스트는 보조 확인에만 사용했다. 특히 분수·대분수·기호·면적 단위는 추출 결과만 믿지 않았다. 모든 non-null 키는 이 이미지 대조가 끝난 `reviewed`이며 정확한 `sourcePage`를 가진다.

| null 사유 | 개수 | 처리 |
| --- | ---: | --- |
| `diagram` | 30 | 도형, 색칠, 그리기, 계산 순서 연결선 등을 복제하거나 숫자만 남기지 않음 |
| `solution-reference` | 106 | `풀이 참조` 뒤 최종 수치가 있어도 전체 주번호를 null로 보존 |
| `explanation-required` | 9 | 설명 문장을 복제하지 않고, 선택한 이름이나 식만으로 대체하지 않음 |
| `worked-calculation` | 4 | 두 방법 또는 변환 경로 전체를 작성하는 답안을 최종 값으로 대체하지 않음 |
| 합계 | **149** | 각각 정확한 주소·출처 쪽·사유·설명이 `nullKeyLedger`에 존재 |

예를 들어 BOOK2 6~8쪽 03번은 `19명`이 함께 인쇄되어 있어도 풀이 참조가 있으므로 null이다. BOOK1 69쪽 01·02번과 BOOK2 39~41쪽 01·02번은 도형·수직선을 요구하므로 함께 인쇄된 분수만 넣지 않았다. 반면 원문이 이미 텍스트로 적은 `⑴−㉠` 연결 답이나 `3/5에 색칠` 같은 선택 지시는 그 짧은 텍스트를 유지했다.

분수는 `a/b`, 대분수는 `a b/c`, 복합 분자는 `(a×b)/(c×d)`, 넓이는 `cm²`·`m²`·`km²`로 표시했다. 원문의 배열 구분 `/`는 양옆 공백으로 분수와 구별한다. `2/6`을 `1/3`으로 약분하거나 대안의 순서를 바꾸지 않았다. 5단원 원문은 기약분수·대분수로 바꾸지 않은 결과도 인정한다고 안내한다(PDF 7·16쪽). 이 자료는 인쇄된 대표 답안이며 자동 동치 판정 규칙이 아니다.

## 산출물과 검증

- `data/commercial-workbooks/ebs-manjeom-e5-1-2026-v1.json`: canonical metadata/provenance/exercises 형태.
- `data/commercial-workbooks/ebs-manjeom-e5-1-2026-v1.tsv`: UTF-8, canonical `parseWorkbookImport` 결과가 JSON exercises와 완전히 같음.
- `data/commercial-workbooks/ebs-manjeom-e5-1-2026-v1.coverage.json`: 출처·판본 증거, 이미지 해시, 전체 그룹·번호·개수, 행별 null 사유, 실제 포함 범위와 제한.
- `src/__tests__/unit/commercialWorkbookEbsManjeomPack.test.ts`: 7개 검증. 독립된 인쇄 머리글/주번호 목록으로 818개 정확 주소와 78개 그룹을 확인하며, 네 이어지는 그룹·행별 출처·149개 null 전부·분수/대분수/문자/단위 fixture를 검증.

실행: `./node_modules/.bin/vitest run src/__tests__/unit/commercialWorkbookEbsManjeomPack.test.ts` — **1개 파일, 7개 테스트 통과**. 설치된 Next.js의 `dist/docs/01-app/02-guides/testing/vitest.md`와 PDF skill을 읽고 수행했다. 공유 contract·import·registry·UI·DB·환경 변수·기존 starter pack은 수정하지 않았다. 배포·push·외부 메시지 발송은 하지 않았으며, 등록과 통합은 coordinator 작업이다.

원본·추출 텍스트·렌더·공식 HTML·작업용 스크립트는 저장소 밖에 유지했다.

- 원본: `/Volumes/TodayWork/commercial-workbook-sources/survey-20261024/root/samples/ebs-primary-60000465839.pdf`
- 보조 추출: `/Volumes/TodayWork/commercial-workbook-sources/intake-20261024/ebs-primary-60000465839-layout.txt`
- 검토 증거: `/Volumes/TodayWork/commercial-workbook-sources/intake-20261024/ebs/`
- 이미지: `page-02.png`~`page-18.png`; 공식 자료: `official-answer-detail.html`, `official-bookstory-product.html`, `official-bookstory-info.html`, `official-bookstory-toc.html`, `official-course.html`. 각 이미지와 주요 공식 자료의 SHA-256은 coverage 파일에 기록했다.

교사 수동 채점용 짧은 정답 참조만 제공한다. 문제, 도형, 풀이 문장, 채점 기준, 원본 PDF와 전체 추출 텍스트는 저장소에 포함하지 않았다. 고정한 PDF의 답안을 검토한 결과이며 최신 정오표 반영이나 원문 오류 교정을 주장하지 않는다. 공개 접근 사실을 별도 재배포 라이선스의 확인으로 해석하지 않는다.

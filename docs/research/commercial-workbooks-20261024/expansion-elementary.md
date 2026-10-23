# 2026-10-24 elementary 담당 상업 교재 확장 검수 결과

배정된 공식 답지 PDF **12개 모두 조사·검수했고 12개 참고 팩을 생성**했다. 수록 주소 **8,276개**, 원문 이미지와 대조한 짧은 정답 **7,690개**, 주소를 보존하고 정답을 `null`로 둔 항목 **586개**다. `ready`는 아래에 명시한 수록 범위가 검증되었다는 뜻이며 교재 전체 정답이 문자화되었다는 뜻이 아니다. 자료 전체가 막힌 `blocked` 소스는 없고, 주소 미확정·번호 없는 활동은 별도 제외 원장에 남겼다.

학생 기록·DB·UI·레지스트리·공유 의존성을 변경하지 않았다. 기존 팩도 변경하지 않았으며, 이번에 새로 만든 따풀 3개 팩의 링크만 후속 커밋에서 안정적인 공식 게시판 URL로 고쳤다. 원문 PDF·텍스트·이미지·OCR·검수 스크립트는 저장소 외부에만 있다.

## 12개 소스별 결과

모두 `ready`. 각 ID는 불변 `v1`이며 같은 basename의 `.json`, `.tsv`, `.coverage.json`이 `data/commercial-workbooks/`에 있다. 주소 수와 검수 키 수를 따로 표시한다.

| 팩 / 공식 교재 | 주소 | 검수 키 | null | 커밋 |
|---|---:|---:|---:|---|
| [chun-ddapul-3-1-upper-v1](../../../data/commercial-workbooks/chun-ddapul-3-1-upper-v1.json) · 따풀 3-1 상 | 558 | 502 | 56 | `60d9b3fd5` |
| [chun-ddapul-6-2-upper-v1](../../../data/commercial-workbooks/chun-ddapul-6-2-upper-v1.json) · 따풀 6-2 상 | 481 | 460 | 21 | `e742fead2` |
| [chun-ddapul-5-1-upper-v1](../../../data/commercial-workbooks/chun-ddapul-5-1-upper-v1.json) · 따풀 5-1 상 | 502 | 472 | 30 | `5c8924dc2` |
| [gilbut-calculation-7-2026-v1](../../../data/commercial-workbooks/gilbut-calculation-7-2026-v1.json) · 기적의계산법(2026개정)7권 | 1,060 | 1,060 | 0 | `d11ac035e` |
| [gilbut-calculation-11-2026-v1](../../../data/commercial-workbooks/gilbut-calculation-11-2026-v1.json) · 기적의계산법(2026개정)11권 | 973 | 973 | 0 | `73bc4e648` |
| [gilbut-calculation-1-2026-v1](../../../data/commercial-workbooks/gilbut-calculation-1-2026-v1.json) · 기적의계산법(2026개정)1권 | 1,844 | 1,760 | 84 | `526d4c2c5` |
| [mathtian-facto-gifted-e5-6-v1](../../../data/commercial-workbooks/mathtian-facto-gifted-e5-6-v1.json) · 팩토 영재성 검사 & 창의적 문제해결력 초등5~6학년 | 131 | 47 | 84 | `dad9733c5` |
| [mathtian-facto-operation-c05-v1](../../../data/commercial-workbooks/mathtian-facto-operation-c05-v1.json) · 사고력을 키우는 팩토 연산 C05 | 49 | 49 | 0 | `d07ebc626` |
| [mathtian-steps-6-2-v1](../../../data/commercial-workbooks/mathtian-steps-6-2-v1.json) · 단원별 계산력 수학 단계수 6-2 | 462 | 394 | 68 | `c99f414cf` |
| [ne-middle1-kwon-evaluation-2022-v1](../../../data/commercial-workbooks/ne-middle1-kwon-evaluation-2022-v1.json) · 중학교 수학 1 자습서&평가문제집_권오남 저 (2022 개정) | 296 | 294 | 2 | `925176ffc` |
| [ne-gak-common-math1-2023-v1](../../../data/commercial-workbooks/ne-gak-common-math1-2023-v1.json) · 고등 각_공통수학1 | 945 | 763 | 182 | `a29ac14e7` |
| [ne-dalgom-calculation-4-2-v1](../../../data/commercial-workbooks/ne-dalgom-calculation-4-2-v1.json) · 달곰한 계산력 4-2 | 975 | 916 | 59 | `96beeba21` |

## 수록 범위와 남은 항목

- **따풀 3-1 상 / 5-1 상 / 6-2 상:** 유형 01A~20B의 인쇄된 본문 쪽, 연습 번호, 예제 소문항을 모두 수록했다. 그림·표 답은 각각 56/30/21개 `null`이다. 각 권 PART 01·02 연습 문제 12개씩(권당 24개, 3권 합계 72개)은 본문 쪽을 표시하지 않아 수록하지 않았다. Quiz Quiz는 본문 쪽·문항 번호가 없어 제외했다. PDF 페이지를 본문 쪽으로 바꾸거나 빈 위치에 번호를 붙이지 않았다.

- **기적의계산법 7권·11권:** 각 100개 인쇄 쪽 그룹의 모든 문항을 수록하고 각각 1,060/973개 키를 검수했다. 분수·대분수·소수·계산 연쇄를 원문 순서대로 보존했다.

- **기적의계산법 1권:** 인쇄 번호가 있는 1,844주소를 모두 수록했다. 점 그림 60개, 연결 그림 4개, 저울 그림 20개가 `null`이다. 번호 없는 연산표 8개(220칸)는 독립 문항 번호를 만들지 않고 별도 기록했다.

- **NE 중1 권오남 평가문제집:** 인쇄 2~49쪽 평가의 296주소. 18~19쪽 04번 그래프와 44~45쪽 02번 표를 제외한 294키 검수. 인쇄된 페이지 범위는 그대로 유지하며 개별 문항의 쪽을 추정하지 않는다. 같은 제목의 자습서 답지는 별권이며 이번 PDF 범위가 아니다.

- **NE 달곰한 계산력 4-2:** Day 01~48의 번호 있는 975주소, 그림 답 59개 `null`. 연산 실력 점검하기 3개 세트의 52+56+51=159문항은 번호는 있지만 정확한 본문 쪽이 없다. 번호 없는 연산 놀이터 11쪽과 네모네모 로직도 제외했다.

- **NE 고등 각 공통수학1:** 0001~0945 전체 번호를 모두 수록했다. 선택 원문 472개와 짧은 정수 답 291개, 총 763키를 전수 시각 대조했다. 182주소의 분수·수식·복합 소문항·증명 등은 보수적으로 `null`이다. 중복 0445 표시도 별도 검토 후 보류했다. 인쇄된 쪽 범위·열거를 보존하며 개별 문항 쪽 미확정을 명시한다. 전체 해설 문장이 검수되었다고 주장하지 않는다.

- **팩토 연산 C05:** 27쪽 전체를 확인했다. 인쇄 문항 번호가 있는 본문 38~41쪽 실력 체크 1~40, 본문 63쪽 십자말 가로 ①~⑤·세로 ㉠~㉣를 모두 수록하여 49주소/49키다. 나머지 주차·일차 활동에는 독립 문항 번호가 없어 위치 번호를 만들지 않았다. 적은 주소 수는 샘플 추출 결과가 아니라 전체 PDF의 인쇄 주소 한계다.

- **단계수 6-2:** 48쪽 전체, 6개 단원과 184개 본문 쪽 그룹의 462주소. 각 단원마다 본문 쪽이 다시 시작하므로 단원 section으로 구분했다. 큰 번호 안의 번호 없는 계산은 한 답의 세미콜론 목록으로 묶었고, 실력 평가 안의 인쇄 소문항은 보존했다. 회색 보기·이미 채워진 항목은 정답으로 오인하지 않았다. 68개 그림·표·서술 키가 `null`이다.

- **팩토 영재성검사·창의적 문제해결력 초5~6:** 64쪽 전체와 58개 section 참조를 확인했다. 인쇄된 번호 전부 131주소, 짧은 답 47개, 그림·장문·개방형 답 84개 `null`. **단원 시작 쪽 참조 · 개별 문항 쪽 미확인**: `address.page`는 인쇄된 P.055 등의 시작 참조이며 다음 인쇄 header 전까지만 유지한다. coordinator의 명시적 허용에 따라 `individualTextbookPageResolved:false`, `sectionReferencePageOnly:true`를 저장하고 provenance·coverage·외부 등록 scopeNote에 표시했다. 번호 없는 대표 유형 6개는 제외했고, PDF 50~58의 단일 창의 과제는 인쇄된 제목 앞 1~5 번호를 사용했다. 두 검사에 모두 인쇄된 “2단계”를 임의로 고치지 않았다.

`nullKeyLedger`는 모든 수록 주소의 null을 정확히 한 번씩 기록한다. 수록하지 못한 번호/표/활동은 `outOfScope` 또는 해당 coverage의 전용 원장에 따로 남으므로 586개 null과 섞어 세지 않는다. 기존 계약의 최대 5,000주소를 넘는 팩은 없고, 가장 큰 팩은 1,844주소다.

## 공식 메타데이터와 출처

확인일은 2026-10-24다. 원본 manifest의 공식 상품/자료실 및 다운로드 기록을 사용하고 PDF SHA-256을 최종 다시 계산해 12개 모두 일치함을 확인했다. 미확인 ISBN·발행일·쇄·교육과정은 추정하지 않았다. 길벗의 “2026개정”은 상품 판명이며 교육과정 명칭으로 바꾸지 않는다.

| 공식 제목 | 확인된 판/발행일 | ISBN | 교육과정 | 공식 출처 |
|---|---|---|---|---|
| 따풀 3-1 상 | 발행연도·쇄 미확인 | 미확인 | 미확인 | [출판사](https://www.1000math.com/archive/?bmode=view&idx=155855986) |
| 따풀 6-2 상 | 발행연도·쇄 미확인 | 미확인 | 미확인 | [출판사](https://www.1000math.com/archive/?bmode=view&idx=155855986) |
| 따풀 5-1 상 | 발행연도·쇄 미확인 | 미확인 | 미확인 | [출판사](https://www.1000math.com/archive/?bmode=view&idx=155855986) |
| 기적의계산법(2026개정)7권 | 2026-11-02 | 9791174672681 | 미확인 | [출판사](https://school.gilbut.co.kr/book/view?bookcode=BN004959) |
| 기적의계산법(2026개정)11권 | 2026-11-02 | 9791174672728 | 미확인 | [출판사](https://school.gilbut.co.kr/book/view?bookcode=BN004963) |
| 기적의계산법(2026개정)1권 | 2026-11-02 | 9791174672629 | 미확인 | [출판사](https://school.gilbut.co.kr/book/view?bookcode=BN004953) |
| 팩토 영재성 검사 & 창의적 문제해결력 초등5~6학년 | 발행연도·쇄 미확인 | 미확인 | 미확인 | [출판사](https://www.mathtian.com/qna/qna_errata_answer.aspx?page=3&srh_code1=&srh_code2=&srh_code3=) |
| 사고력을 키우는 팩토 연산 C05 | 발행연도·쇄 미확인 | 미확인 | 미확인 | [출판사](https://www.mathtian.com/qna/qna_errata_answer.aspx?page=3&srh_code1=&srh_code2=&srh_code3=) |
| 단원별 계산력 수학 단계수 6-2 | 발행연도·쇄 미확인 | 미확인 | 미확인 | [출판사](https://www.mathtian.com/qna/qna_errata_answer.aspx) |
| 중학교 수학 1 자습서&평가문제집_권오남 저 (2022 개정) | 2025.02 | 979-11-253-4972-3 | 2022 개정 교육과정 | [출판사](https://www.nebooks.co.kr/pages/book/view.asp?c=BE05020001) |
| 고등 각_공통수학1 | 2023.11 | 979-11-253-4326-4 | 미확인 | [출판사](https://www.nebooks.co.kr/pages/book/view.asp?c=BH04090001) |
| 달곰한 계산력 4-2 | 2023.11 | 9791125343110 | 미확인 | [출판사](https://www.nebooks.co.kr/pages/book/view.asp?c=BH02050008) |

길벗 3권의 공식 표시 발행일 **2026-11-02는 확인일보다 미래**다. 자료가 이미 공개되어 있다는 사실과 실제 발행 완료 여부는 구분한다. 매스티안 자료실 게시일 2016-06-30(영재성), 2022-05-02(단계수)은 발행일로 사용하지 않았다. NE 자료실의 수학교재 출간 종료 공지는 기존 공개 자료 출처 확인과 구분한다. 따풀의 과거 만료형 서명 다운로드 URL은 역사적 coverage 증거에만 보존했고, canonical provenance 및 등록 링크에는 안정적인 공식 페이지를 사용한다(수정 커밋 `d9c3cc19e`).

## 원본별 SHA-256

소스 경로 기준은 `/Volumes/TodayWork/commercial-workbook-sources/survey-20261024/`다. 원문 파일은 이 저장소에 포함하지 않는다.

| sourceRelativePath | SHA-256 |
|---|---|
| `elementary/pdfs/chun_ddapul_0.pdf` | `ba4f685bb4246d096b1f89d6db6fc3903366a4978f2eac063658c7bd56d61023` |
| `elementary/pdfs/chun_ddapul_14.pdf` | `23bff37009fa0b6dbe61388ad6d7f44e292a5508b07aa250799f31059dadbd19` |
| `elementary/pdfs/chun_ddapul_8.pdf` | `043d90b25a61c8a27794d6469407fa23d0281b7c4e3b6c270194ec2d58c07eac` |
| `elementary/pdfs/gilbut_BN004959.pdf` | `24620bffde9ffdc47e6c185c251e254448752306001984fd089a14299b5227f3` |
| `elementary/pdfs/gilbut_BN004963.pdf` | `672d5674db5cf694da6fbe033ad4c21dd2dceb72581b646aefd8add8f0eaf237` |
| `elementary/pdfs/gilbut_calculation_2026_1.pdf` | `35c88d12164b3ad047df7256b1ee470f6bc72e54bf0ca73de02a32d1ca6ca7f8` |
| `elementary/pdfs/mathtian_facto_gifted_e5-6.pdf` | `bc2711daa0fd2ad7717e79120b5b80ea53f187b7bd07963329efdc405179ccc9` |
| `elementary/pdfs/mathtian_facto_operation_c05.pdf` | `3450da5fb9ff2ece7ab324d2527993ad03697e0b50df8108b02b7918bc6928b8` |
| `elementary/pdfs/mathtian_steps_6-2.pdf` | `c6859cf17eca5fa4187f4063cbe4aadfca6f6727bcd4d8557532d8add6fc556f` |
| `elementary/pdfs/ne_BE05020001.pdf` | `9e1137d301d24bb488443a9b8fdb509f5af56a16622231caff8bba6156469f4f` |
| `elementary/pdfs/ne_BH04090001.pdf` | `b219d92470219eb6d206aaf83353f026e35ed125569ab9df1dd4a76cc398b1b2` |
| `elementary/pdfs/ne_dalgom_4-2.pdf` | `bcb165c907d9586d9168465b7c96c4662c79b676c8328c2fe114f5c25e3122c4` |

## 검증과 외부 증거

`npx vitest run src/__tests__/unit/commercialWorkbookExpansion*Pack.test.ts` — **12개 파일, 48개 테스트 통과**(2026-10-24 03:06:59 KST). 각 팩은 `workbookCreateEditionSchema` strict 입력을 통과하고, TSV를 실제 `parseWorkbookImport`로 다시 읽었을 때 JSON exercise 배열과 완전히 같다. 독립적인 인쇄 번호/쪽 기대 집합, 중복 주소, 누락 키 원장, 출처 SHA·메타데이터를 검사한다. 권별 계산 재검산, 분수 동치, 단위와 선택 원문 검사를 포함했다. 마지막 팩에서는 포포즈 10식·복면산 5식·100 만들기 8식과 길이/무게 26개 대응을 전부 재검산했다. `git diff --check`도 통과했다.

모든 `reviewed` 키는 렌더한 실제 답안 영역을 시각 대조했다. 텍스트가 있는 PDF는 글자/단어 좌표를 이용했고, 이미지 PDF 3개는 27/48/64쪽 전체를 보고 수동 전사했다. OCR은 위치·누락 확인 보조 자료이며 검수 텍스트로 그대로 채택하지 않았다. 긴 정답·다이어그램의 보류는 정확성 경계를 남기기 위한 것이며 검수 완료 키로 세지 않는다.

외부 증거 루트: `/Volumes/TodayWork/commercial-workbook-sources/expansion-20261024/elementary/`.

- `registration.json`: coordinator가 레지스트리에 넣을 12개 항목(id, label, links, scopeNote, filename, sourceRelativePath, counts).
- `status.json`: 배정된 12개 sourceRelativePath의 ready 결과와 수록/검수/제외 수.
- `final-audit.json`: 원본 SHA 재계산 12/12, 안정적인 canonical 링크, 최종 합계.
- 각 native 소스 ID 폴더: manifest-record, native-coordinates, 렌더 이미지·SHA 목록, 답안 대응/주소 증거.
- `mathtian/<source-id>/`: 모든 스캔 페이지 렌더·OCR 좌표·검수 대응. 영재성 자료는 `printed-section-references.json`에 58개 header와 연속 번호 대응을 보존한다.
- 루트 `build_*.py`, `extract_*.py`, `steps_data.py`, `gifted_data.py`: 전사·변환·좌표/기계 검사 스크립트.

이 작업의 남은 단계는 coordinator의 커밋 통합과 레지스트리 등록이다. 원본 번호 없는 활동, 본문 쪽 미기재 항목, 그림·장문 답의 추가 지원은 별도 범위이며 이번 결과를 완전 자동 채점키로 사용하지 않는다. 모든 팩의 grading 용도는 `manual-reference-only`다.

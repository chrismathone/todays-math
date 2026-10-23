# RPM Pro 공통수학 1 전체 자료 확장 — 2026-10-24

팩 `imath-rpm-pro-common-math1-2022-v1`은 공식 해설 PDF 208쪽의 인쇄 번호 **0001–1066** 전부와 단원별 **셀프 CHECK 문자 문항 66개**를 포함한다. 총 **1,132주소**, 시각 대조 검수한 짧은 정답 **1,131개**, `key:null` **1개**다. 12개 단원을 모두 처리했으며 임의 장·쪽 절단이나 빈 팩은 없다. 정답은 교사의 **수동 채점 참고용**이다.

## 출처와 확인된 판 정보

- 출판사: 개념원리.
- [공식 공개 게시물](https://www.imath.kr/app/board/detail/keys?boardKey=c2a9f7e7-7a8d-4116-a275-6368eaefe990&itemKey=c13f738a-c0fd-4fd1-bd32-4a219fa266d0)의 제목: `22개정 RPM Pro 공통수학1 정답 및 풀이`.
- 표지: `AI 튜터와 함께 푸는 RPM Pro 공통수학 1 정답 및 풀이`.
- 2022 개정은 공식 자료 제목에서 확인했다. **발행연도·발행일·쇄·ISBN은 미확인**이며 저장 metadata에서 ISBN을 생략하고 coverage에 unknown을 명시했다. 게시일 `2026-09-17`을 발행일로 사용하지 않는다.
- 원본: `root/samples/imath-rpm-pro-common1.pdf`, 208쪽, 89,366,184바이트.
- SHA-256: `b570069029339bd5767e266c718baaa6f1bba6fa46c1f3448613930ad70dbfeb`.
- 다운로드 URL·공식 페이지 보관본·응답 영수증·원본 경로는 외부 `source-provenance.json`, `official.html`, `official-receipt.json`에 보존했다. 이전 major 감사 자료는 수정하지 않았다.

## 주소와 제외 기준

주소의 volume은 `공통수학 1`이다. section은 인쇄된 단원 번호·제목, 단계, 유형 번호를 보존한다. 셀프 CHECK는 단원별 문자 A–I의 실제 인쇄 범위만 포함한다. 188개 유형, 24개 도전/시험 단계, 12개 셀프 CHECK로 **224개 주소 그룹**이다.

유형 머리말에 인쇄된 본책 쪽은 유형의 시작을 가리키므로 주소 page를 **`유형 시작 N`**으로 표기했다. 예를 들어 유형 001의 0001–0004는 모두 `유형 시작 10`이다. 이는 각 문항이 본책 10쪽에 있다는 뜻이 아니다. **개별 문항 쪽 미확인**이며 쪽 위치를 추정·증분하지 않았다. 도전/시험/셀프 CHECK의 본책 쪽 범위는 인쇄된 `20~21` 등의 문자열 그대로 보존한다. `key.sourcePage`는 실제 정답이 있는 **PDF의 1부터 시작하는 쪽 번호**다. 예를 들어 0062는 번호가 PDF 10쪽에서 시작하고 정답은 PDF 11쪽에 있어 sourcePage=11이다.

주번호 또는 셀프 CHECK 문자 하나를 한 행으로 저장한다. `(1)`, `(2)`, `(가)` 등 소문항 표시는 합친 answerText에 보존하고 address.subpart는 빈 문자열로 둔다. 분수는 `/`, 제곱은 유니코드 위첨자, 근호는 `√`, 행렬은 행 순서의 중첩 대괄호로 표기했다. 선분 표시는 `\overline{QC}`로 보존했다. 선택 원문자·음수·복소수·단위·부등호를 누락하지 않았다.

유일한 null은 **06 이차방정식과 이차함수 / 1등급 유형 도전하기 / 98~99 / 0484**, PDF 86쪽이다. 인쇄 정답의 (1)은 `풀이 참조`이며 그래프가 포함되고, (2)는 `2`다. 결합한 주번호 문항의 일부만 검수 정답으로 내보내지 않기 위해 전체 key를 null로 유지했다. coverage.nullKeyLedger에 정확한 주소·이유·근거 이미지 해시를 기록했다.

번호가 없는 **논리 Check 10개**는 주소를 만들어 넣지 않았다. 인쇄 위치는 각각 0062, 0144, 0217, 0304, 0399, 0485, 0586, 0786, 0880, 1038 다음이며, PDF 쪽·영역·사유는 coverage.unnumberedExclusions에 있다. 표지 PDF 1쪽과 메모 PDF 208쪽도 문항 범위에서 제외한다. 따라서 ‘전체 인쇄 번호·문자 주소 포함’과 ‘모든 무번호 보충 문제 포함’은 구별된다.

| 단원 | 주소 | 검수 정답 | null |
|---|---:|---:|---:|
| 01 다항식의 연산 | 99 | 99 | 0 |
| 02 항등식과 나머지정리 | 86 | 86 | 0 |
| 03 인수분해 | 76 | 76 | 0 |
| 04 복소수 | 92 | 92 | 0 |
| 05 이차방정식 | 102 | 102 | 0 |
| 06 이차방정식과 이차함수 | 89 | 88 | 1 |
| 07 여러 가지 방정식 | 112 | 112 | 0 |
| 08 연립일차부등식 | 87 | 87 | 0 |
| 09 이차부등식과 연립이차부등식 | 126 | 126 | 0 |
| 10 경우의 수와 순열 | 96 | 96 | 0 |
| 11 조합 | 80 | 80 | 0 |
| 12 행렬 | 87 | 87 | 0 |
| 합계 | **1,132** | **1,131** | **1** |

## 검수 및 재현 근거

외부 근거 루트는 `/Volumes/TodayWork/commercial-workbook-sources/expansion-20261024/rpm/`이다. 원본 PDF·이미지·문제/풀이 본문·OCR·스크립트는 저장소에 추가하지 않았다.

1. 텍스트층이 없는 PDF 전체 208쪽을 2배 크기로 렌더링하고 SHA를 기록했다. Apple Vision OCR은 위치·번호 후보를 찾는 보조 수단으로만 사용했다.
2. 양쪽 열의 청색 번호/정답/제목 영역 **2,832개 전부**를 40개 시트로 만들고 모두 시각 확인했다. 단원 시작 셀프 CHECK 12개는 전체 높이로 따로 확인했고, 분할·작은 기호 등은 상세 영역 8개로 재확인했다. 전체 208쪽을 담은 레이아웃 시트 9개로 부록·추가 번호 범위도 확인했다.
3. `reviewed-answers.txt`와 `self-answers.tsv`에 짧은 답을 직접 전사했다. `answer-overrides.json`은 0303의 잘린 복합 답을 전체 높이 이미지로 보정한 기록이다. `address-overrides.json`은 OCR의 번호·쪽·유형 오독을 원본과 대조해 고친 기록이다. 0328은 OCR의 `13`을 채택하지 않고 인쇄된 `3`을 유지했다.
4. `independent_census.py`의 별도 리터럴 표에 12단원 문자 범위, 188유형 시작 번호·쪽, 24단계 번호 경계를 다시 적고 추출 후보와 전부 비교했다. 이는 같은 작업자의 두 번째 시각 주소 감사이며, 별도 독립 검수자가 있었다는 주장은 하지 않는다.
5. `review-manifest.json`과 coverage에는 **277개 이미지**(208 원본 렌더 + 40 영역 시트 + 20 상세 이미지 + 9 레이아웃)의 해시, 전사·override·스크립트 입력 해시가 고정돼 있다. coverage.answerReferences는 1,132행 모두에 주소, PDF 정답 쪽, 렌더 좌표, 검수 이미지와 해시를 연결한다. 좌표는 2배 렌더 이미지의 좌상단 기준 픽셀이다.

`prepare.py → run_ocr.py → regions.py → candidates.py → sheets.py`는 후보 증거를 만든다. 시각 전사와 override를 만든 뒤 `census.py → finalize_evidence.py → independent_census.py → build_pack.py → verify_evidence.py`로 주소·정답 연결과 팩을 검증한다. 생성 스크립트가 정답을 계산하거나 OCR 결과를 자동으로 reviewed로 올리지는 않는다. 전체 해설의 수학적 증명을 새로 검증했다는 주장도 하지 않는다.

## 검증 및 인계

전용 테스트 `src/__tests__/unit/commercialWorkbookExpansionRpmPack.test.ts`는 엄격한 `workbookCreateEditionSchema`, 5,000행 제한, 주소 유일성, TSV 전체 roundtrip, 독립 기대 주소 1,132개, 224그룹, null ledger 일치, 해시 연결, sourcePage 이동, 특수 기호·복합 답·단위·행렬 fixture를 검사한다. 순수 선택 정답 454개(①65·②91·③104·④111·⑤83), 순수 정수 정답 482개(합 50,534, 최소 −85, 최대 7,200)의 무결성과 PDF에 인쇄된 피연산자를 사용한 세 가지 산술 검사를 포함한다.

실행 명령:

```sh
npx vitest run src/__tests__/unit/commercialWorkbookExpansionRpmPack.test.ts src/__tests__/unit/commercialWorkbooks.test.ts
```

결과: **2파일, 14테스트 통과**. 외부 `test-results.txt`에 최종 실행 결과, `evidence-validation.txt`에 원본·이미지·입력 파일 해시 및 주소/정답 연결 검증 결과를 보존한다. 외부 `registration.json`은 ready 등록 항목 배열이며 `status.json`은 이번 한 소스의 ready 상태·실제 개수·제약을 기록한다.

완료 산출물은 신규 JSON·TSV·coverage, 전용 테스트, 이 문서 5개다. 기존 12-source elementary 팩과 집계 manifest는 수정하지 않았다. registry·UI·생산 반영·push는 coordinator 소유이며 이 작업에서는 수행하지 않는다.

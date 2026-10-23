# 상용 교재 확대 — major 배정 11개 PDF

2026-10-24. 작업 기준은 당시 `origin/main`과 같았던 `ee1133510`이다. 신규 **7개 팩, 인쇄 주소 3,749개, 시각 대조한 짧은 정답 3,720개, `key:null` 29개**를 제공한다. 배정된 나머지 4개 PDF도 조사했으나 완전 주소 대응과 정답 전수 검수가 끝나지 않아 **등록 보류**했다. 보류 자료는 빈 팩이나 검수 완료 도서 수에 포함하지 않는다.

`ready`는 아래에 명시한 **정답표 범위**의 주소 및 등록 키를 확인했다는 뜻이다. 본문 문제책의 모든 예제·탐구 활동까지 독립 조사했다는 뜻은 아니다. 모든 팩은 교사 수동 채점용 짧은 참조이며 자동 채점 규칙이 아니다. 원본에 실린 답과의 대응을 검수했으며, 출판사 원본 자체의 수학적 무오류나 최신 정오표 반영을 보증하지 않는다.

## 배정 전량 결과

모든 상대 경로의 기준은 `survey-20261024/`이다. 팩 파일은 `data/commercial-workbooks/<id>.json`, 같은 이름의 `.tsv`와 `.coverage.json`이다.

| 원본 상대 경로 | 공식 교재/자료명 | 팩 ID 또는 결과 | 주소 | reviewed | null |
|---|---|---|---:|---:|---:|
| `root/samples/ebsi-11253.pdf` | EBS 2027학년도 수능특강 수학영역 수학Ⅰ | `ebs-suneung-2027-math1-v1` | 181 | 181 | 0 |
| `root/samples/ebsi-11254.pdf` | EBS 2027학년도 수능특강 수학영역 수학Ⅱ | `ebs-suneung-2027-math2-v1` | 171 | 171 | 0 |
| `root/samples/ebsi-10908.pdf` | EBS 올림포스 공통수학1(2022 개정) | `ebs-olympus-common1-2022-v1` | 281 | 280 | 1 |
| `root/samples/visang-27061.pdf` | 개념루트 공통수학 1 (22개정) | 등록 보류 — 해설 속 주소·수식 대응 미완료 | 미확정 | 등록 없음 | 미확정 |
| `root/samples/visang-26737.pdf` | 유형만렙 중학 수학 2-1 (22개정) | 등록 보류 — 유형/기출 BOOK 주소 대응 미완료 | 미확정 | 등록 없음 | 미확정 |
| `root/samples/mega-126353.pdf` | 메가스터디 N제 수학영역 확률과 통계 4점 공략 165제 | `mega-n-probability-165-2022-v1` | 165 | 165 | 0 |
| `root/samples/mega-1400.pdf` | 1일 10분 초등 메가 계산력 12권 | `mega-calculation-volume12-1400-v1` | 1,321 | 1,321 | 0 |
| `root/samples/mega-1493.pdf` | 메가스터디 문제 기본서 CPR 중학수학 2-1 | 등록 보류 — 이미지 해설의 전체 주소·정답 검수 미완료 | 미확정 | 등록 없음 | 미확정 |
| `root/samples/mothertong-9353.pdf` | 중학수학 쏠트 1-1 정답표 | `mothertong-solt-m1-1-9353-v1` | 1,068 | 1,041 | 27 |
| `root/samples/jinhak-478.pdf` | [22개정] 블랙라벨 공통수학1 | `jinhak-blacklabel-common1-firstprint-2022-v1` | 562 | 561 | 1 |
| `root/samples/imath-rpm-pro-common1.pdf` | 22개정 RPM Pro 공통수학1 정답 및 풀이 | 등록 보류 — 문자/유형/문제 주소 및 이미지 수식 검수 미완료 | 미확정 | 등록 없음 | 미확정 |

보류는 이번 결과가 등록 기준을 충족하지 못했다는 뜻이며 **영구 복구 불가나 판독 불가 판정이 아니다**. 미확정 주소·정답 수를 0으로 바꾸거나 마지막 문제번호를 전체 개수로 사용하지 않았다.

## 판본·교육과정·ISBN 및 공식 출처

| 자료 | 확인한 정보 | 확인하지 못했거나 적용하지 않은 정보 |
|---|---|---|
| 수능특강 수학Ⅰ | [EBS 정답 자료 LB00000005912](https://www.ebsi.co.kr/ebs/pot/potg/detailBkAnsInfo.ebs?bookId=LB00000005912), 2027학년도·2026년 자료, [종이책 ISBN 9788954798204](https://book.ebs.co.kr/sub/high/view?prodClsCd=24&txbkId=LB00000005912) | 쇄차, 교육과정 개정 연도 |
| 수능특강 수학Ⅱ | [EBS 정답 자료 LB00000005913](https://www.ebsi.co.kr/ebs/pot/potg/detailBkAnsInfo.ebs?bookId=LB00000005913), 2027학년도·2026년 자료, [종이책 ISBN 9788954798211](https://book.ebs.co.kr/sub/high/view?prodClsCd=24&txbkId=LB00000005913) | 쇄차, 교육과정 개정 연도 |
| 올림포스 공통수학1 | [EBS 정답 자료 LB00000005515](https://www.ebsi.co.kr/ebs/pot/potg/detailBkAnsInfo.ebs?bookId=LB00000005515), 제목의 2022 개정, [종이책 ISBN 9788954786928](https://book.ebs.co.kr/sub/high/view?prodClsCd=24&txbkId=LB00000005515), 자료 연도 2025 | 쇄차 |
| 개념루트 공통수학1 | [비상 공식 상세 5396](https://book.visang.com/books/info/5396)의 22개정 및 ISBN 979-11-6940-929-2 | 쇄차. 기존 manifest의 자료 연도 2024를 PDF의 쇄차로 해석하지 않음 |
| 유형만렙 중학2-1 | [비상 공식 상세 5738](https://book.visang.com/books/info/5738)의 22개정 및 ISBN 979-11-7316-400-2 | 쇄차. 기존 manifest의 자료 연도 2025를 PDF의 쇄차로 해석하지 않음 |
| N제 확률과 통계 165제 | [공식 다운로드 126353](https://www.megastudybooks.com/download/126353), PDF 표지의 2022 개정 | 발행 연도·판·쇄·ISBN |
| 초등 메가 계산력 12권 | [공식 다운로드 1400](https://www.megastudybooks.com/download/1400), 표지의 12권·초등 6학년 | 발행 연도·판·쇄·교육과정·ISBN. PDF 작업 시각 2021-07-14를 발행 연도로 쓰지 않음 |
| CPR 중학2-1 | [공식 자료 목록](https://www.megastudybooks.com/book/file/explanation?page=31), 다운로드 1493, PDF 표지의 교재명·2-1 | 발행 연도·판·쇄·교육과정·ISBN |
| 쏠트 중학1-1 | [마더텅 게시물 9353](https://www.toptutor.co.kr/pds/view.jsp?id=9353&type=01), 정답표 제목 | 판·쇄·교육과정·ISBN. 게시일 2026-07-10을 교재 판본으로 쓰지 않음 |
| 블랙라벨 공통수학1 | [진학사 공식 상세 478](https://www.jinhak.com/jh/black-label/478)의 22개정·2024 발행 정보, 별도로 공개 검색된 공식 CDN 파일명의 **1쇄** | ISBN, 현재 로그인 첨부와의 동일성, 최신 정오표 반영. 로그인이나 접근 제한을 우회하지 않음 |
| RPM Pro 공통수학1 | [개념원리 공식 자료 게시물](https://www.imath.kr/app/board/detail/keys?boardKey=c2a9f7e7-7a8d-4116-a275-6368eaefe990&itemKey=c13f738a-c0fd-4fd1-bd32-4a219fa266d0)의 제공된 자료 제목 22개정, PDF 표지의 RPM Pro 공통수학1 | 판·쇄·ISBN. 이번 HTML 응답은 앱 껍데기이므로 새로운 판본 사실을 추출했다고 주장하지 않음 |

블랙라벨은 **공개 1쇄 원본**이라고 팩 ID·라벨·설명에 명시했다. 현재 배포본으로 조용히 치환할 수 없다. 각 팩의 provenance와 coverage는 원본 URL, 다운로드 URL, SHA-256, 답안 이미지 해시, 확인한 판본 사실과 한계를 담는다. 공식 HTML과 응답 해시도 외부에 보관했다.

## 주소와 검수 범위

- 수능특강 수학Ⅰ/Ⅱ: 첫 빠른 정답표의 24/28개 인쇄 블록 전부. 예제·유제와 LEVEL 1/2/3을 구분하고 본문 쪽 범위를 보존했다. 글꼴·좌표 기반으로 답과 번호를 묶고 52개 영역의 렌더 접촉 시트 전부를 시각 대조했다. 독립 테스트에는 모든 주소와 모든 짧은 답안 값이 있다.
- 올림포스: PDF 2~3쪽 빠른 정답 전체 36개 블록. 본문 쪽 표제는 상세 해설의 36개 표제 영역에서도 대조했다. `55~57쪽 / 06 여러 가지 방정식과 부등식 / 기본 유형 익히기 [유제] / 3`은 여러 식으로 된 답의 안전한 표현을 확정하지 않아 null이다.
- N제: PDF 2쪽 빠른 정답의 001~165 전부. 해설의 9개 단원 표제에서 본문 쪽을 확인했다. 뒤의 번호만 보고 페이지를 배분하지 않았다.
- 블랙라벨: PDF 2~4쪽 빠른 정답의 9개 단원 × 3 STEP, 562개 번호 전부. 27개 좌표 영역을 단원별 9개 큰 렌더로 대조했다. 분수·근호·알파/베타·복수 답을 별도로 보정했다. `08 순열과 조합 / STEP 2 / 087~097쪽 / 16`은 원문이 풀이 참조여서 null이다.
- 쏠트: 6쪽 전체의 9개 단원 × STEP A/B/C, 27개 표제. 인쇄된 **STEP 시작 쪽수만** 기록했다. 이어지는 PDF 쪽의 답도 각각의 `sourcePage`를 보존했다. 그래프의 인쇄 라벨 `015-017`은 하나의 범위 주소이므로 연속 번호 개수 1,070과 등록 주소 1,068을 구분한다. 두 열을 각각 확대하여 총 12개 이미지의 답안 전부를 수기 대조했다. 27개 도형·그래프·불명확한 표현은 개별 주소가 있는 null 장부에 남겼다. 보조 OCR의 기계적 비교는 수기 검토를 대신하지 않았다.
- 계산력: PDF 4~23쪽의 **10주 × 5일**, 번호가 있는 본문 100쪽의 1,321개 문항 전부. 각 문항은 실제 인쇄 본문 쪽에 연결했다. 전체 20개 정답 페이지를 추출 결과와 행별 대조했다. 수직 분수의 분자/분모/정수 부분은 좌표로 분리하고, 줄바꿈 답안·비·나머지·복수 칸 답은 렌더에서 보정했다. `위에서부터`, 쉼표, 단계 구분 `/`, 나머지 `…`를 보존한다. **번호 없는 생각 수학 20쪽**은 도해 활동이므로 임의 번호를 만들지 않고 범위 밖으로 명시했다.

모든 팩에서 `sourcePage`는 1부터 세는 PDF 파일 쪽이다. 본문 쪽 범위가 인쇄되어 있으면 그 범위를 그대로 쓰며 문항별 쪽을 추측하지 않는다. 소문항을 함께 표시하는 짧은 답은 한 주번호에 결합했다. 29개 null은 모두 저장된 주소와 제외 사유를 가지며, 주소 목록에서 빠지지 않는다. `wholeBookAddressAudit`는 전부 false다.

## 보류 4권의 실제 증거와 남은 작업

4개 PDF의 **576쪽 전부**를 작은 레이아웃 시트로 확인하여 일괄 정답표 존재를 조사했고, 주요 주소 경계는 별도의 큰 렌더에서 읽었다. 이 조사는 답안 전체의 시각 검수가 아니다.

| 자료 | 확인한 장애 | 외부 증거 및 다음 작업 |
|---|---|---|
| 개념루트 | PDF 2~153에 답과 풀이가 분산되어 있다. 첫 쪽부터 개념 확인 9쪽 → 유제 11쪽 → 개념 확인 15쪽 → 유제 17~27쪽으로 바뀐다. 수식 글리프와 분수·첨자의 텍스트 선형화가 불안정하며 완전한 섹션/쪽 계승 지도가 없다. | `visang-27061/blocked.json`, `address-extraction-audit.json`, `audit-p002.png`, `audit-p153.png`, `layout-01.jpg`~`07`. 열별 표제·정답 시작 좌표를 전수 연결하고 각 짧은 답 영역을 검수해야 한다. 마지막 839를 검증된 주소 개수로 쓰지 않았다. |
| 유형만렙 | PDF 2~92의 4자리 번호와 PDF 93부터 기출 BOOK의 다시 시작하는 번호가 공존한다. 순환마디 점과 그래프가 텍스트에서 손실될 수 있다. | `visang-26737/blocked.json`, `address-extraction-audit.json`, `audit-p002.png`, `audit-p100.png`, `audit-p114.png`, `layout-01.jpg`~`05`. 유형 BOOK/기출 BOOK을 분리해 각 단원·본문 쪽을 전수 확정하고 순환마디/그림 예외를 검수해야 한다. |
| CPR | 96쪽 모두 텍스트가 없는 이미지 PDF다. 전체 배치에서 별도 일괄 정답표를 찾지 못했다. 개념 체크/문제/실력 체크의 표제가 흩어지고 중간 해설 쪽은 앞의 본문 쪽 표제를 계승한다. | `mega-1493/blocked.json`, `page-index.json`, `audit-p002.png.ocr.json`, `audit-p048.png`, `layout-01.jpg`~`04`. 전체 내용 쪽의 OCR 영역 분할과 독립 주소 목록 및 수식 검수가 필요하다. 마지막 1245를 완전 주소 개수로 주장하지 않는다. |
| RPM Pro | 208쪽 모두 이미지 PDF다. 첫 내용 쪽에 셀프 CHECK A~H, 유형001/002, 문제0001~0006이 동시에 있으므로 숫자 문제만 수집하면 주소가 누락된다. | `imath-rpm-pro-common1/blocked.json`, `page-index.json`, `audit-p002.png.ocr.json`, `audit-p207.png`, `layout-01.jpg`~`09`. 문자/유형/문제 주소 도메인을 분리하고 전체 206개 내용 쪽의 표제·답을 검수해야 한다. 마지막 1066을 전체 개수로 쓰지 않는다. |

공식 사이트에서 필요한 로그인이나 접근 제한을 우회하지 않았다. 이 보류를 해소하는 데 새 자료가 반드시 필요한 것으로 결론 내리지 않았으며, 현재 원본을 대상으로 추가 전사·검수할 수 있다.

## 외부 증거와 재현

외부 루트: `/Volumes/TodayWork/commercial-workbook-sources/expansion-20261024/major/`

- `registration.json`: 준비된 7개 팩의 `id`, `label`, `links`, `scopeNote`, `filename`, `sourceRelativePath`, `counts`. **레지스트리 변경은 coordinator 소유**이며 이 작업은 실제 레지스트리를 수정하지 않았다.
- `status.json`: 배정된 11개 원본 각각의 ready/blocked, 팩 ID, 이유, 개수, 증거 경로. 보류 자료의 총 주소·누락 개수는 null(미확정)이다.
- `source-integrity.json`: 11개 원본의 SHA-256을 제공된 manifest와 재대조한 결과. 각 하위 폴더의 `source.pdf`는 동일 바이트의 외부 보관 사본이다.
- 각 하위 폴더: `provenance.json`, `layout.txt`, `page-index.json`, 공식 HTML/응답 기록, 추출 좌표, 실제 검토 렌더. 재현 스크립트도 외부에만 있다.
- 전사/추출: `extract_ebs.py`, `extract_mega_n.py`, `extract_olympus_headers.py`, `transcribe_olympus.py`, `extract_jinhak.py`, `review_jinhak.py`, `transcribe_solt.py`, `extract_calculation.py`, `review_calculation.py`, `build_packs.py`.
- 보류 조사: `audit_remaining.py`, `ocr.swift`, `finish_evidence.py`. OCR 원문은 검수 결과가 아니며 외부에만 보관했다.

저장소에는 짧은 정답·주소·출처·커버리지·테스트·이 보고서만 추가했다. 문제/풀이 본문, PDF 및 PDF 이미지는 저장소에 넣지 않았다. 기존 팩·UI·DB·공유 의존성·학생 기록을 변경하지 않았고 원격 push나 운영 쓰기를 하지 않았다.

## 검증과 커밋

신규 테스트 4개 파일은 총 28개 테스트를 포함한다. 인쇄 범위에서 독립 작성한 전체 주소 기대값, 주번호 연속성, 중복, PDF 쪽 전환, 정답/선택지 개수, 분수·근호·부호·단위·여러 답, 정확한 null 장부를 확인한다. 계산력은 모든 나머지 참조와 70개의 기약 자연수 비도 확인한다.

```text
./node_modules/.bin/vitest run src/__tests__/unit/commercialWorkbook*.test.ts
12 files passed, 81 tests passed (2026-10-24)
```

`workbookCreateEditionSchema` strict parsing 및 `parseWorkbookImport`의 JSON/TSV 완전 일치가 7개 팩 모두 통과했다. 모든 신규 팩은 5,000개 제한 이하다. 신규 테스트 4개에 대한 ESLint도 통과했다. 학생/교사 화면 및 서비스 로직 변경이 없으므로 브라우저/운영 DB 검증은 수행하지 않았다.

커밋:

- `0e58c8733`: 수능특강 수학Ⅰ·Ⅱ 2개 팩 및 전체 답안/주소 테스트.
- `a8a76f5c5`: 올림포스·N제·공개 1쇄 블랙라벨 3개 팩 및 범위/수식 테스트.
- 후속 커밋: 쏠트·계산력 2개 팩, 각각의 전체 범위 테스트, 이 전량 결과 보고서. 최종 커밋 해시는 coordinator 완료 메시지에 전달한다.

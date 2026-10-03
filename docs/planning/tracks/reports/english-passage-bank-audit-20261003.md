# 영어 지문은행 코드 조사 — 2026-10-03

기준: `1a9c72462`. AGENTS.md·CLAUDE.md 지침 확인 후 아래 코드 10개만 조사했다.
운영 DB·API 호출·제품/UI 변경·추가 에이전트 없이 정적 추적했다. 듣기 및 메뉴 배치는 범위 밖이며 메뉴는 리드 확인 중이다.
근거 약어는 아래 파일을 뜻하며, 본문의 `약어:줄번호`는 해당 파일의 실제 줄이다.

| 약어 | 조사 파일 |
| --- | --- |
| S | `src/components/english/EnglishStudio.tsx` |
| M | `src/components/english/EnglishMakerView.tsx` |
| L | `src/components/english/EnglishLibraryView.tsx` |
| C | `src/contracts/english.contract.ts` |
| V | `src/contracts/englishV2.contract.ts` |
| P | `prisma/schema.prisma` |
| ML | `src/app/api/english/exams/[id]/materials/route.ts` |
| MI | `src/app/api/english/materials/[id]/route.ts` |
| SL | `src/app/api/english/exams/[id]/sets/route.ts` |
| SI | `src/app/api/english/sets/[id]/route.ts` |

## 1. 기존 저장 지문을 가져오는 길

- 현재 시험 선택 → Studio가 `GET /api/english/exams/{id}/materials`를 읽어 시험 ID별로 보관 → Maker에 전달한다(S:167-235, 543-552).
- Maker의 `저장한 자료 불러오기`는 `content`가 있는 자료만 표시한다(M:305, 635-655).
- 원문 유지·변형의 원문 칸으로 복사하거나 원문 복원의 입력 칸으로 복사한다(M:676-703, 947-951; 모드 계약 C:214, 310-314).
- 자료 저장은 시험별 POST의 JSON `{name, content}` 또는 파일 업로드다. TXT만 텍스트를 추출하며 PDF/DOCX/이미지는 이 경로에서 `content=null`이므로 Maker 선택 대상이 아니다(ML:102-124, 134-175).
- 자료 단건 GET은 JSON 지문 조회가 아니라 원본 파일/텍스트 다운로드다(MI:24-58). 현재 Maker는 목록 응답의 `content`를 쓴다.
- Maker는 지문·문항·meta를 시험별 sets POST로 저장한다. 원자료 FK는 없고, 그대로 쓴 자료명만 기록하며 변형 전 원문은 선택적 `meta.sourcePassage`에 담는 계약이다(M:271-279, 384-396; C:223-248; P:1542-1564).
- Library는 선택 시험의 세트를 제목·상태로 검색하고 기존 세트 편집을 연다. 이 화면에는 세트 원문을 Maker로 보내는 연결이 없다(L:23-60, 123-129; S:288-294, 409-417, 524-558).
- 세트 목록 계약에는 지문이 없고 상세 GET에는 `passage`·`meta`가 있다. 따라서 세트 지문 재사용 후보는 상세 읽기 후 명시적 선택·복사다(C:256-276; SL:95-115; SI:37-54).
- 소유권: 자료/세트 목록·생성은 URL의 시험, 단건 읽기·수정·삭제는 저장 행의 `examId`로 `requireOwnedEnglishExam`을 통과한다(ML:51-65, 158-167; MI:32-35, 69-77; SL:95-127; SI:45-48, 65-71, 131-139).
- 스키마 주석의 범위는 `EnglishExam.userId`·`ownedRowsWhere` 기반 지점 관리자=지점 전체, 강사=자기 자료다(P:1491-1501). 도우미 내부 구현은 10파일 범위 밖이므로 권한 안전성을 전수 검증한 것은 아니다.

## 2. 시험 독립 원문은행 필요 여부

- **여러 시험에 걸쳐 원문을 보관·찾고 다시 쓰려면 필요하다.** 현 자료·세트의 `examId`는 필수이며 부모 시험 삭제가 둘 모두에 Cascade된다(P:1523-1538, 1542-1564).
- 현 `EnglishMaterial.content`는 시험 첨부 텍스트, `EnglishQuestionSet.passage`는 제작된 세트 지문이다. 둘을 통합 조회하는 것만으로 원문의 독립 수명·개정·출처가 생기지는 않는다(P:1522-1561; C:223-248).
- 기존 시험 안의 텍스트 재사용만 요구한다면 이미 있는 Maker 경로로 가능하다. 지문은행은 시험 없이 등록·조회되고, 문제 생성/저장 시에만 대상 시험을 선택하는 구조가 적합하다(S:167-235; M:384-396).
- V2에는 `passageId/sourceRevision/text`와 자료 출처 계약이 있지만 독립 은행 영속 모델은 위 Prisma 모델에 없다. V2 문서 계약을 현재 V1 저장 API에 그대로 넣을 수 없다(V:217-246, 313-324; SL:129-134; SI:73-79).

## 3. 최소 구현 계약·파일 후보 — 제안, 이번 변경 아님

- 기존 Next.js/TypeScript·Zod·Prisma/PostgreSQL 유지. 수학 `Problem`이나 `WorkspaceDocument/Asset`로 합치지 않는다(P:1491-1495; CLAUDE.md:43-48).
- `prisma/schema.prisma`: 시험 FK가 없는 `EnglishPassage` 후보. `id/userId/title/text/sourceRevision/createdAt/updatedAt` 및 선택적 출처 기록을 두고 기존 시험 자료·세트의 수명은 유지한다.
- 신규 `src/contracts/englishPassage.contract.ts`: 등록 `{title,text,origin?}`, 목록 검색·페이지 계약, 상세 응답, 개정값을 받는 수정 계약. 소유자는 세션에서 결정한다. 기존 자료/세트에서 가져올 때도 원본 접근권을 검사한다.
- 신규 `src/app/api/english/passages/route.ts`, `passages/[id]/route.ts`: 시험 없는 등록·검색·상세·개정 저장. 기존 소유 범위를 은행 행에도 적용하고, 시험 접근권을 곧 은행 전체 접근권으로 확대하지 않는다.
- `EnglishStudio.tsx`·`EnglishMakerView.tsx`: 은행에서 선택한 텍스트를 기존 원문/복원 입력으로 전달한다. `EnglishLibraryView.tsx`의 현재 세트 편집 흐름을 보존하고 메뉴 배치는 리드 결정 뒤 연결한다(S:524-558; M:692-695, 948-951).
- `english.contract.ts`의 세트 meta에 은행 참조를 추가한다면 `passageId/sourceRevision` 계약·저장을 함께 정한다. 세트에는 사용한 텍스트 스냅샷을 유지하여 은행 수정이 기출 세트를 바꾸지 않게 한다(C:228-248, 280-296; SL:161-172).
- V2의 ID·개정 개념은 정렬하되 문서 저장 전환은 별도 작업이다. 원자료 은행 등록은 교사가 원문을 확인한 뒤 수행하며 기존 변형 세트의 `passage`를 자동으로 원문으로 승격하지 않는다(C:223-232; V:217-246).

## 4. 회귀 위험과 의미 있는 검증

- 권한 확장: 향후 DB 대역으로 강사 본인/타 강사/타 지점/지점 관리자 쌍을 만들어 목록·상세·복사·수정 각각의 허용/차단을 확인한다. 부모 시험 검사 제거 후 무범위 조회가 되는 회귀를 잡는다(위 1절 소유권 근거).
- 수명·개정: 격리된 로컬 DB에서 시험 삭제 후 은행 생존, 은행 수정 후 기존 세트 스냅샷 불변, 오래된 개정 수정 충돌을 확인한다(P:1535, 1561; SI:93-117).
- 원문 혼동: `meta` 없는 옛 세트, 변형 원문이 있는 세트, 동일 제목의 다른 자료로 가져오기를 검증한다. 자료명만으로 원본을 동일시하지 않는다(C:223-248, 271-276; M:276-279).
- 글자 수: 자료 30,000자·세트 24,000자·생성 입력 18,000자 상한이 다르다. 경계와 초과 입력에서 명시적 거절/선택을 검증하고 조용한 잘림을 피한다(C:103-104, 253, 314; ML:104-113).
- 저장 회귀: V1 정상 저장·V2 손실 저장 차단, 같은 `clientKey` 재시도/다른 본문 충돌, 시험 전환 중 저장 대상 고정을 DB·네트워크 대역으로 검증한다(SL:129-179; SI:73-101; M:367-395, 413-415).
- UI 연결은 자료 선택→원문/복원 입력→새 초안 저장→세트 재열기를 대역으로 확인한다. 계약 모양만 확인하는 시험이나 실제 AI 호출은 이 변경의 검증 근거가 아니다.
- 이번 검증은 위 10파일의 호출·계약·관계 정적 대조와 보고서 근거 줄/70줄 상한/문서 단독 diff 검사다. 앱 실행·DB/네트워크 테스트는 수행하지 않았다.

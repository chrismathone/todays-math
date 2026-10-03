# 영어 자료은행 · 문항 그림 — Grok 독립 검토

2026-10-03. 읽기 전용 검토다. 제품 코드·DB·배포·유료 API는 바꾸지 않았다.

기준 문서는 main 작업공간의 `C:\Creative\testautocreator\docs\planning\english-resource-bank-plan-20261003.md`다. 이 워크트리 사본은 그 파일보다 이전이다. 사용자 승인(목록+상세 A안, 기존 웹앱 재사용)과 «문항에 맞는 그림 보기» 절이 워크트리 사본에 없다. 구현은 main 문서를 따른다. 코드 근거는 이 워크트리와 main의 같은 줄이 일치하는 범위만 인용한다. 조사 보조 문서는 `docs/planning/tracks/reports/english-passage-bank-audit-20261003.md`다.

조정자가 전달한 원본은 EBSi 2026학년도 2회 고1 듣기 문제지다. 로컬에서 1쪽 PDF를 읽었다. 주소는 `https://wdown.ebsi.co.kr/engexam/2026/2026_eng_02_go1/2026_eng_02_go1_question_ZS1MSRWS.pdf`. 저작권 표시는 12개 시·도교육청과 한국교육과정평가원이다. 그림 픽셀과 음원은 가져오지 않았다.

## 결론

은행의 첫 구현은 시험과 분리된 지문 원문, 기존 자료의 명시적 가져오기, 자체 듣기 검색, 공식 링크 참조까지다. 그림은 그 구현에 포함하지 않는다. 현재 계약은 그림을 받지 못한다. `listeningChoiceSchema`와 학생 보기는 `{ id, text }`뿐이고(`src/contracts/englishListening.contract.ts` 27행, `src/contracts/englishListeningStudent.contract.ts` 6–11행), 문항에도 공통 그림 칸이 없다. 스키마를 느슨하게 읽어서 그림을 지원한다고 보면 안 된다.

그림 구조는 보기 그림 하나로 줄이면 안 된다. 같은 문제지에 세 갈래가 같이 있다.

- 1번은 보기마다 그림이다. «대화를 듣고, 남자가 구입할 강아지 옷을 고르시오.» 아래에 같은 크기의 비트맵 다섯 장이 가로로 있다. 선택 번호 말고 보기 글은 없다.
- 10번은 표다. «다음 표를 보면서 대화를 듣고, 남자가 구매할 텐트를 고르시오.» 열은 Model, Capacity, Material, Price다. 비트맵이 아니다.
- 15번은 문항 공통 그림 하나다. «다음 그림의 상황에 가장 적절한 대화를 고르시오.» 큰 그림 한 장이고, ①–⑤는 인쇄된 대사가 없다. 보기는 소리로 제시된다.

3번(시각 글자)과 7번(금액 글자)은 지금 텍스트 보기로 된다. 시각·금액이 모두 도식이어야 하는 것은 아니다.

권하는 출고 경계는 둘이다.

1. 지금 구현할 것. 지문은행, 자체 듣기 검색, 공식 페이지 참조, 그리고 교사 초안에만 넣는 그림 표본. 표본은 사람이 올린 소수다. 이미지 모델을 돌리는 대량 작업은 합의 전이므로 하지 않는다.
2. 그림이 있는 세트의 발행·배정·학생 응답은, 아래 전달·투영·검수 조건이 한 변경에 같이 들어가기 전에는 거절한다. 초안 저장만 먼저 열면, 발행 검사가 없는 동안 그림 세트가 학생에게 나간다.

## 합의에 올릴 결정

- 지문 표는 시험 자식이 아니다. 소프트 삭제와 불변 개정, 세트에는 사본과 `passageRef`만 남긴다.
- 목록은 본문 전체를 보내지 않는다. 검색은 서버에서 소유 범위를 먼저 건다. 상세에서만 글을 읽는다.
- 30,000자까지 보관한다. 수동 세트 진입은 24,000자, 생성 진입은 18,000자다. 18,000자로 수동 제작까지 막지는 않는다. 어느 상한도 자동으로 자르지 않는다.
- 가져오기는 은행 메뉴와 원본 자료 경로 권한을 둘 다 본다. 역할은 교사가 고르고, 변형 지문을 원문으로 올리지 않는다.
- 듣기 `GET /sets` 배열은 유지하고 검색만 페이지로 추가한다. EBS는 목록 페이지만 연다.
- 그림은 보기 삽화, 문항 공통 자극, 표·시계·지도 도식의 세 갈래다. 학생 발행은 투영·인증·검수 무효가 같이 들어가기 전이다.
- 자작 시범 `docs/listening-samples/visuals/school-places-v1.png`는 샘플 01의 2번(음악 선생님의 위치)에 대한 교사 검토용 한 장이다. 학생 화면·발행본이 아니고, 보기 자산 다섯 개로 등록된 것도 아니다. 정답 인덱스와 생성 프롬프트가 같은 JSON에 있으므로 그 파일을 학생 응답으로 쓰면 안 된다.

Codex 검토(`english-bank-codex-review-20261003.md`)와 독립적으로 같은 결론인 부분은 독립 지문 루트, 기존 `/sets` 응답 유지, EBS 재호스팅 금지, `{id,text}` 한계, 그림 발행을 통로가 닫히기 전에 열지 않는 것이다. 글자 상한은 위 세 칸으로 가른다. Codex가 제작 진입 전체를 18,000자로 막는 안과는 다르다.

## 반드시 막을 결함

취향과 섞지 않는다. 아래는 첫 구현의 실패 조건이다.

1. 기존 `EnglishMaterial`·`EnglishQuestionSet`을 시험 없이 조회하는 것만으로 은행을 만들지 않는다. 둘 다 `examId`가 필수이고 시험 삭제가 연쇄 삭제다(`prisma/schema.prisma` 1523–1564행). 듣기 세트만 이미 독립 루트다(`EnglishListeningSet`, 1583–1596행, `examId`는 문서 안 선택값).
2. 2판 문서를 1판 세트 API에 넣지 않는다. `schemaVersion: 2`는 400이다. 2판 전용 칸은 `passageId`, `sourceRevision`, `passages`, `items`를 포함한다(`src/contracts/englishV2.contract.ts` 332–349행). 은행 참조는 1판 `meta`의 작은 선택 칸으로만 더한다.
3. 본문을 조용히 자르지 않는다. 상한은 자료 30,000자, 세트 지문 24,000자, 생성 입력과 `meta.sourcePassage` 18,000자다(`src/contracts/english.contract.ts` 103–104, 232, 314행). 2판 지문 글도 24,000자다(`englishV2.contract.ts` 221행). TXT 업로드는 이미 `clampUtf16`로 30,000자에서 자르고 원본 바이트는 남긴다(`src/app/api/english/exams/[id]/materials/route.ts` 104–113행). 은행 가져오기는 이 함수를 쓰면 안 된다. 디코드 길이가 `content`보다 길면 행을 만들지 않고 두 길이를 돌려준다.
4. `meta.sourcePassage`가 없는 옛 세트와, 세트 `passage`가 원문과 다른 변형 세트를 원문으로 자동 분류하지 않는다. 교사가 `original` 또는 `produced`를 고른 요청만 가져온다.
5. 은행 이름이 교사 전체 공유가 되면 안 된다. 목록·상세·수정·삭제·가져오기·파일이 같은 소유 범위를 본다. 다른 소유자의 같은 본문은 존재 자체를 409나 중복 목록으로 알리면 안 된다. 해시는 전역 유니크로 걸지 않는다.
6. 공식 회차를 `teacher_authored` 듣기 세트로 저장하지 않는다. 출처 종류는 지금 그 리터럴뿐이다(`englishListening.contract.ts` 78–83행). 카탈로그 192회는 `reuseStatus: permission-required`, `hosted: false`다(`docs/listening-samples/ebs-catalog-20261003.json` 19–28행). 음원·문제지·정답·대본·ZIP 주소를 API로 풀어 주지 않는다. 우리 서버가 받아 스트리밍하거나 생성 입력으로 넣지 않는다.
7. 듣기 검수·발행을 우회하지 않는다. 발행은 권리 확인과 묶음별 content·audio·alignment 도장이 현재 개정·내용 해시와 같을 때만 통과한다(`src/lib/english/listening/publication.ts` 48–79행). 묶음 수정은 도장을 비운다(`src/lib/english/listening/runtime/sets.ts` 141–157행).
8. 학생 응답에 교사 문서를 펼쳐 넣지 않는다. 투영은 잠긴 문항에서 설명·근거·대본을 빼지만, 보기 `text`는 잠금 중에도 항상 보낸다(`src/lib/english/listening/projection.ts` 35–55행). 15번처럼 보기가 소리인 문항의 대사를 이 `text`에 넣으면 듣기 전에 답이 보인다.
9. 그림 바이트를 같은 자산 ID로 갈아끼우지 않는다. 내용 해시는 문항 객체를 포함하므로(`publication.ts` 34–45행) ID와 해시가 문서에 박혀 있어야 교체가 검수를 무효로 만든다. 바이트만 바꾸면 도장이 산다.
10. 알 수 없는 영어 API는 거절된다(`src/lib/accountRouteAccess.ts` 67, 165–166행). 새 경로를 `englishRouteAllowed`에 적기 전에 교사 계정은 열리지 않는다. 지점 관리자는 97행에서 메뉴 검사를 건너뛰므로, 메뉴 통과만으로 소유 범위가 열렸다고 보면 안 된다.
11. 옛 허용값 `english`를 은행 메뉴까지 펼치지 않는다. 지금 펼침은 학교·만들기·보관함뿐이고 듣기는 빠진다(`src/__tests__/unit/englishMenu.test.ts` 16–20, 51–54행). 영어 전체 차단은 듣기를 같이 끈다(`accountAccess.contract.ts` 70–82행). 은행 메뉴를 이 차단에 넣지 않으면 영어를 끈 계정에 은행이 남는다.
12. 듣기 시범 권한으로 지문은행을 열거나, 지문은행 권한으로 듣기 시범을 열지 않는다. 시범은 최고관리자와 `ENGLISH_LISTENING_TEACHER_IDS`다(`src/lib/listeningPilot.ts` 9–31행).

취향이라 첫 구현을 막지 않는 것: 즐겨찾기, 폴더, 일괄 구성, 태그 추천, CEFR, 자동 난이도, Kokoro 자동 제작, 그림 대량 생성, 화풍 자동 판정. 화풍이 같은지는 사람 검수다. 자동 점수로 검수 완료를 찍지 않는다.

## 첫 구현 — 저장

새 표는 영어 도메인 안에만 둔다. 수학 `Problem`과 `WorkspaceDocument`/`Asset`에 넣지 않는다.

`EnglishPassage`는 듣기 세트의 복제 SQL이 아니라 `userId`와 `User` 관계를 둔다. 그러면 범위가 `ownedRowsWhere`·`withinOwnerScope` 한 곳이다(`src/lib/ownerScope.ts` 77–84, 100–111행). 듣기 목록이 소유 조건을 다시 적은 것(`sets.ts` 65행)을 지문에는 따라 하지 않는다.

| 표                       | 칸                                                                                                                                                                        | 삭제                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `EnglishPassage`         | `id`, `userId`, `rowRevision`, `textRevision`, `title`, `grade`, `text`, `duplicateKey`, `origin` jsonb, `rights` jsonb, `rightsReview` jsonb nullable, `deletedAt`, 시각 | 시험 FK 없음. 물리 삭제 없음                                                   |
| `EnglishPassageRevision` | `(passageId, textRevision)`, 그 개정의 글, `exactHash`                                                                                                                    | 통로는 제한. 과거 시험지가 참조한다                                            |
| `EnglishPassageUse`      | `passageId`, `textRevision`, `snapshotHash`, `setId`                                                                                                                      | 세트 삭제 때 사용 행만 삭제. 지문 삭제는 사용 행이 있어도 본문을 지우지 않는다 |

`origin`은 판별 합집합이다. `{ kind: "typed" }`, `{ kind: "material", examId, materialId }`, `{ kind: "set", examId, setId, role }`. `examId`에 외래 키를 걸지 않는다. 시험을 지워도 지문 행은 남고, 화면은 원래 시험이 없다고 말한다. 지문을 소프트 삭제해도 세트의 `passage` 사본과 사용 행은 남는다. 소프트 삭제된 지문은 목록·만들기·생성에서 빠진다.

`rights`는 있는 `englishV2RightsSchema`를 재사용한다. 생성 시 서버가 `unknown`으로 둔다. 클라이언트가 보낸 `approved`를 곧바로 배포 허락으로 믿지 않는다. 용도는 `store_original`, `teacher_review`, `generation_input`, `search_index`, `external_model`, `distribution`으로 이미 갈라져 있다(`englishV2.contract.ts` 77–85행). 은행에서 DeepSeek으로 넘기는 동작만 `external_model`과 권리 확인 도장을 요구한다. 지금 시험 화면의 생성 API 전체를 이 변경에서 새로 막지는 않는다. 확인 없는 자료를 무료 공개라는 이유로 `distribution`에 넣지 않는다.

본문 상한은 30,000자다. 세트·생성 상한을 이 변경에서 올리지 않는다. 지문 개정은 글이 바뀔 때만 `textRevision`이 증가하고, 제목·학년·출처만 바꿔도 CAS용 `rowRevision`은 증가한다. 세트는 만들 때의 `textRevision`과 사본을 보관한다. 이후 지문을 고쳐도 세트 행은 바뀌지 않는다.

`duplicateKey`는 NFC, 앞뒤 공백 제거, 연속 공백을 한 칸으로 줄인 뒤 SHA-256이다. 저장 글은 이 정규화 전의 글이다. 인덱스는 `(userId, duplicateKey)`이고 유니크가 아니다. 같은 소유자에게만 중복 후보를 알려 주고, 자동 병합하지 않는다.

세트 연결은 `englishSetMetaSchema`에 선택 칸 하나만 더한다.

```ts
passageRef: z.strictObject({
  passageId: z.uuid(),
  textRevision: z.number().int().min(1),
  snapshotHash: z.string().regex(/^[a-f0-9]{64}$/),
}).optional();
```

1판 PUT은 `meta`를 쓰지 않으므로 기존 수정이 이 칸을 지우지 않는다(`src/app/api/english/sets/[id]/route.ts` 84–102행). 은행 글을 `meta.sourcePassage`에 복사하지 않는다. 그 칸은 18,000자라 긴 원문이 잘리거나 거절된다. 변형 세트의 지문 사본은 지금처럼 `passage` 칸이다.

듣기 그림 표본을 초안에 남기려면 아래 «그림»의 자산 표만 같이 만든다. 발행 스냅샷에는 그림 문항을 넣지 않는다.

## 첫 구현 — API

소유자는 세션이다. 요청 본문의 `userId`·`ownerId`는 받지 않는다. 응답 봉투는 기존 `dataResponseSchema`를 따른다. 목록을 배열에서 `{ items, nextCursor }`로 바꾸지 않는다. `GET /api/english/listening/sets`는 지금도 배열이고 최대 200건이다(`sets.ts` 65행, `src/lib/english/listening/runtime/http.ts` 102–112행).

지문.

- `POST /api/english/passages` — `{ title, grade, text, origin? }`. 글은 1–30,000자. 넘치면 400. 자름 없음. 201에 행과, 내 자료 안의 중복 후보 `{ id, title }[]`. 권리는 서버가 `unknown`.
- `GET /api/english/passages?q&grade&cursor&limit` — `limit` 기본 50, 최대 100. 응답은 제목·학년·출처 표시·단어 수·개정·갱신 시각·짧은 미리보기만. 본문 전체와 파일 바이트는 상세 GET에서만. 정렬이 같으면 `id`로 순서를 고정한다. 소프트 삭제 제외. `nextCursor`는 잘린 경우에만.
- `GET /api/english/passages/:id` — 본문, 개정, 권리, 이 지문으로 만든 세트 요약. 범위 밖은 404.
- `PATCH /api/english/passages/:id` — `{ expectedRevision, title?, grade?, text?, origin? }`. 불일치 409 `REVISION_MISMATCH`. 글이 바뀌면 개정 행을 추가한다.
- `DELETE /api/english/passages/:id` — `deletedAt`만 기록. 세트와 개정 행은 유지.
- `POST /api/english/passages/import` — 아래 가져오기.
- `POST /api/english/passages/:id/prepare` — `{ destination: "set" | "generate", examId }`. 대상 시험은 `requireOwnedEnglishExam`. 소프트 삭제면 404. `set`인데 글이 24,000자를 넘으면 409 `PASSAGE_TOO_LONG_FOR_SET`. `generate`인데 18,000자를 넘거나 권리에 `external_model`이 없거나 권리 도장이 없으면 409 `PASSAGE_NOT_GENERATABLE`. 성공은 자를 글을 돌려주지 않고, 클라이언트가 이어서 쓸 개정 번호와 해시만 돌려준다. 본문 사본은 세트 POST가 저장한다.

가져오기 본문.

```ts
{
  source: { kind: "material" | "set_passage" | "set_source_passage", id: uuid },
  role: "original" | "produced",
  importKey: uuid
}
```

`role`의 기본값은 없다. 호출자는 `english-bank`와, 그 자료·세트를 읽는 기존 메뉴가 둘 다 있어야 한다. 행 소유만으로 메뉴를 건너뛰지 않는다. `(userId, importKey)` 유니크다. 같은 키·같은 출처 해시면 기존 행을 200으로 돌려준다. 같은 키·다른 해시면 409. 출처 행은 수정·삭제하지 않는다. 멱등 키는 소유자·출처 종류·출처 ID·본문 종류·내용 해시다. 자료에 `content`가 없으면 422 `NO_TEXT`다. PDF·DOCX를 OCR 완료로 표시하지 않는다. TXT는 바이트를 다시 디코드해 `content`와 길이를 비교하고, 이미 잘렸으면 409 `MATERIAL_TEXT_TRUNCATED`와 두 길이다. `set_source_passage`는 `meta.sourcePassage`가 있을 때만 된다. 없으면 422 `SOURCE_PASSAGE_ABSENT`이고 `passage`로 대체하지 않는다. `role: "original"`은 `set_passage`에 쓰지 못한다. 변형 지문을 원문 칸에 넣지 않기 위해서다.

세트 저장은 기존 `POST /api/english/exams/:examId/sets`다. `passageRef`는 `englishMetaFromConditions`가 만들지 않는다. 그 함수는 변형 모드에만 `sourcePassage`를 넣는다(`src/lib/english/meta.ts` 50–51행). 서버가 준비 단계에서 확인한 참조를 세트 생성 트랜잭션에 사용 행과 함께 기록한다. 사본 해시가 그 `textRevision`과 같을 때만 201이다. 교사가 저장 전에 글을 고치면 참조는 «원문 그대로»가 아니라 수정된 사본으로 남는다. 이후 은행 글을 세트에 다시 쓰지 않는다.

`sameStoredBody`는 제목·출처·지문·문항만 비교하고 `meta`는 보지 않는다(`sets/route.ts` 65–91행). 같은 `clientKey`로 참조만 다른 재시도가 오면 첫 행을 돌려주고 참조가 빠진다. 은행 저장의 재시도 비교에는 `passageRef`를 넣는다. 만들기 화면은 실패한 저장의 시험 ID를 묶음에 고정한다(`EnglishMakerView.tsx` 111–114, 367–378행). 은행에서 넘긴 지문이 그 묶음을 조용히 바꾸거나, 다른 시험의 «다시 저장»으로 들어가면 안 된다. `clientKey`의 시험 전체 스캔(146–169행)을 은행 멱등에 베끼지 않는다.

듣기 검색.

- `GET /api/english/listening/sets/search?q&level&cursor&limit` — 새 경로. 페이지 객체. 소유 조건은 기존 목록과 같다. 항목은 지금 요약에 검수 요약만 더한다. `publicationCount`와 묶음 도장이 비었는지. 문서를 이 목록에 싣지 않는다. 열기·검수·발행은 기존 단건·`review`·`publish`다.
- `GET /api/english/listening/references?grade&year&round&q&cursor` — 저장소 카탈로그의 읽기 전용 조회. 항목은 `id`, `grade`, `year`, `round`, `provider`, `sourceUrl`(공식 목록 페이지), `reuseStatus`, `hosted: false`, 자산 종류 이름만. `audio`·`questions`·`answers`·`transcript`·`bundle`의 파일 주소는 응답에 없다. 재생 가능 표시를 하지 않는다. 카탈로그 주석이 파일 접근 검수 완료가 아니라고 적고 있다.

메뉴는 `english-bank`, 화면 이름 «자료은행»이다. 제품은 `english`다. `WORKSPACE_MENUS`와 `workspaceMenuSchema`를 같이 고친다. 옛 `english` 펼침에는 넣지 않고, `workspaceMenusFromDisabled`의 영어 전체 차단에는 듣기를 넣는 자리와 같이 넣는다. 지문 탭은 이 메뉴다. 듣기 탭은 `canUseListeningTeacher`가 참일 때만 그린다(`src/lib/english/listening/access.ts` 16–31행). 시범이 아니면 탭을 숨기고 API도 거절한다. 문제 세트는 기존 보관함에 둔다. 승인된 A안과 듣기 작업대 A·B·H1은 다시 묻지 않는다.

`accountRouteAllowed`에 더할 교사 경로만 적는다.

- 지문 읽기: `english-bank`
- 지문 쓰기·가져오기·prepare: `english-bank`
- 듣기 검색·공식 참조 읽기: `english-listening`이면서 시범 통과
- 그림 표본 업로드: `english-listening`이면서 시범 통과. 학생 경로에는 없다

## 그림 — 계약은 지금 고정하고, 발행은 나중

초안 스키마는 `schemaVersion` 1을 유지한다. 판을 2로 올리면 기존 문서가 `z.literal(1)`에서 거절된다. 새 칸은 선택이다. 없는 옛 문서는 그대로 파싱된다.

문항 쪽에 공통 자극을 둔다. 묶음에 두면 같은 음원의 다른 문항이 그림을 나눠 갖는다.

```ts
listeningStimulusSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("illustration"),
    assetId: z.uuid(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    alt: z.string().trim().min(1).max(200),
  }),
  z.strictObject({
    kind: z.literal("diagram"),
    diagram: listeningDiagramSchema,
  }),
]);
```

보기는 지금 `{ id, text }`에 선택 칸만 더한다.

```ts
visual: z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("illustration"), assetId, sha256, alt }),
  z.strictObject({
    kind: z.literal("diagram"),
    diagram: listeningDiagramSchema,
  }),
  z.strictObject({
    kind: z.literal("tableRow"),
    rowId: z.string().min(1).max(40),
  }),
]).optional();
spokenText: z.string().trim().min(1).max(2000).optional();
```

`text`는 잠금 중에도 보이는 표시(① 같은 짧은 글)만 담는다. `spokenText`는 15번의 대사다. 학생 잠금 투영에 넣지 않고, 풀이 공개 뒤에만 설명한다. 설명·근거·생성 프롬프트·교사 메모와 같다.

도식은 닫힌 합집합이다. `table`(열 8·행 8 이하, 칸은 짧은 글), `clock`(시 1–12, 분 0–59), `map`(고정 라벨의 노드·간선), `price`, `quantity`. 클라이언트가 보낸 SVG·HTML·이미지 주소를 도식으로 저장하지 않는다. 10번은 `stimulus.kind = "diagram"`, `diagram.kind = "table"`이고 보기는 `tableRow`다. 표 전체를 보기 그림 다섯 장으로 나누지 않는다. 1번은 자극 없음, 보기 다섯이 `illustration`. 15번은 자극 `illustration` 하나, 보기 `visual` 없음, `spokenText`만 교사 쪽에 있다.

한 문항의 보기 그림은 모두 같은 `kind`다. 글 보기와 그림 보기를 한 문항에 섞으면 거절한다. 삽화 보기는 같은 `styleId`만 한 문항에 모은다. 공통 자극은 보기와 화풍이 달라도 된다. 15번 그림은 1번 보기 칸보다 크다. 정답 보기만 테두리·채도·글자를 다르게 하는 값은 계약에 없다. 그림 안 정답 문구도 없다.

자산 표 `EnglishVisualAsset`는 재사용 소재다. `assetId`, `ownerId`, `branchId`, `sha256`, `width`, `height`, `byteLength`, `mime`(png 또는 webp), `styleId`, `rights`, `provenance`. 출처는 `teacher_authored` 또는 `generated_unreviewed`만. EBS 값은 없다. 바이트 수정 API는 없다. 교체는 새 `assetId`이고, 문항이 그 ID와 해시를 가리키면 기존 `updateSet`이 도장을 비운다. 같은 소유자 안에서만 해시로 재사용 후보를 보인다. 문항이 가리키는 묶음은 문서의 `choices`와 `stimulus`다. 소재 행을 고쳐 이미 발행된 다른 문항의 바이트가 바뀌는 경로는 없다.

학생에게 나가는 그림은 듣기 음원과 같이 불투명한 자산 ID다. 저장 경로를 주지 않는다(`englishListeningStudent.contract.ts` 27행 주석과 같은 규칙). 잠금 중 허용 목록은 자극의 그림·대체 설명, 보기 그림·대체 설명, 도식 값, 항상 보이는 `text`다. 잠금 중 금지 목록은 `spokenText`, `answerChoiceId`, `explanation`, 근거, 생성 프롬프트, 교사 메모, 출처 원문, 자산의 `provenance`다. 대체 설명은 잠금 중에 읽히므로 정답 설명과 같을 수 없고, «정답»을 담을 수 없다. 도식의 대체 설명은 명세에서 코드가 만든다.

발행은 그림·도식·`spokenText`가 하나라도 있으면 403 `VISUAL_NOT_PUBLISHABLE`이다. 이 거절이 표본 저장과 같은 변경에 있어야 한다. 나중 발행 허용 조건은 한 세트다. 학생 투영이 위 허용 목록만 파싱할 것, 배정 대상·취소가 아닌 학생만 자산을 받을 것, 발행 시 저장 해시와 문서 해시가 같을 것, 사람 `visual` 검수 도장이 내용 해시·자산 해시와 같을 것, 도장 없는 AI 결과를 검수 완료로 저장하지 않을 것. 하나라도 빠지면 발행은 계속 거절한다.

같은 음원·대본의 공개 단위는 유지한다. 그림만 문항 단위로 먼저 공개하는 모드는 만들지 않는다. 다른 문항의 답을 보여주는 그림은 다른 묶음, 즉 다른 음원 단위로 나눈다.

EBS 문제지의 그림 일곱 개(1번 다섯, 15번 하나, 바닥의 작은 표시 하나)는 표본 자산이 아니다. 재호스팅 허용이 확인되기 전에는 카탈로그 링크도 파일 주소가 아니라 목록 페이지만 연다.

자작 시범은 main의 `docs/listening-samples/visuals/`에 있다. `school-places-v1.png`는 다섯 장소를 한 장에 그린 연락용 그림이고, README가 이를 보기 파일 다섯 개로 세지 말라고 적는다. 런타임에 쓰려면 교사 검수 뒤에 패널마다 불변 자산으로 나누고, 각 자산의 대체 설명은 그 장소만 말한다. `school-places-v1.json`의 `answerIndex`, `evidenceTurnIndices`, `generationPrompt`는 교사 기록이다. 자산 표와 학생 응답에 복사하지 않는다. 도서관 패널의 선이 더 촘촘하다는 기록은 사람 검수 항목으로 남기고, 자동 통과로 바꾸지 않는다.

## 수용 테스트

기존 영어·듣기 테스트를 대역으로 유지한다. 실모델 호출과 운영 DB는 쓰지 않는다. 메뉴 계정은 `isAdmin: false`로 둔다. 관리자 우회는 별도 케이스다.

지문 수명.

- 시험 삭제 뒤 지문·개정 행이 남고, 그 시험의 자료·세트는 지금처럼 지워진다.
- 지문 소프트 삭제 뒤 세트 `passage`와 `passageRef`는 그대로다. 목록과 prepare는 그 지문을 주지 않는다.
- 옛 `expectedRevision` PATCH는 409이고 글은 한 글자도 바뀌지 않는다.
- 제목만 바꾸면 `rowRevision`만 증가한다. 글을 바꾸면 `textRevision` 행이 추가되고, 이미 만든 세트의 사본 해시는 이전 값이다.

권한.

- 강사 본인, 다른 강사, 다른 지점, 지점 관리자, 최고관리자에 대해 목록·상세·PATCH·가져오기·prepare가 각각 허용 또는 404다.
- 다른 강사의 동일 본문을 가져와 저장해도 응답에 그 강사의 ID가 없다.
- 메뉴가 없는 교사의 `POST /api/english/passages`는 거절된다. 영어 전체 차단 계정의 은행 메뉴는 수학 메뉴 목록에 없다.
- 듣기 시범이 아닌 교사는 지문 은행이 되어도 듣기 검색·공식 참조·그림 업로드가 거절된다. 시범만 있고 `english-bank`가 없는 계정은 지문 API가 거절된다.

가져오기와 길이.

- 30,000자 직접 입력은 201, 30,001자는 400, 저장된 글 길이는 원문과 같다.
- 24,001자 prepare `set`과 18,001자 prepare `generate`는 409이고 세트 행이 생기지 않는다.
- 잘린 TXT(바이트 디코드가 `content`보다 김)는 409 `MATERIAL_TEXT_TRUNCATED`다.
- `content`가 null인 PDF는 422 `NO_TEXT`다.
- `sourcePassage`가 없는 세트를 `set_source_passage`로 가져오면 422다. `set_passage`에 `role: "original"`을 주면 422다.
- 같은 `importKey` 재실행은 행이 하나다. 다른 본문에 같은 키는 409다.
- 목록 JSON에 30,000자 본문이 없고, 상세 GET에만 있다.
- 같은 `clientKey`로 `passageRef`만 다른 재시도는 첫 행을 성공으로 위장하지 않는다. 은행에서 연 만들기가 다른 시험의 실패 묶음을 그대로 저장하지 않는다.
- 2판 본문을 세트 POST에 실으면 기존처럼 400이고 은행 행도 생기지 않는다.

듣기 목록.

- 쿼리 없는 `GET /api/english/listening/sets`는 배열이고 200건 상한이 유지된다.
- 검색은 201건째를 `nextCursor`로만 준다. 다른 지점 행은 글 검색에도 없다.
- 공식 참조 응답 JSON에 `mp3`, `pdf`, `zip` 주소가 없다. 카탈로그를 듣기 세트 POST로 넣으면 거절된다.

그림 표본과 발행 봉인.

- 1번 꼴(보기 삽화 다섯, 같은 `styleId`)과 15번 꼴(자극 한 장, `spokenText` 다섯)과 10번 꼴(표 도식, `tableRow`) 초안이 저장되고 다시 읽힌다.
- 보기 종류를 섞거나, 한 문항의 `styleId`가 다르거나, SVG 문자열이 도식으로 들어오면 400이다.
- 그 초안의 발행은 403 `VISUAL_NOT_PUBLISHABLE`이고 배정 행이 없다.
- 학생 보기 파싱 결과에 `spokenText`, 설명, 자산 경로, 생성 프롬프트가 없다. 텍스트만 있는 기존 발행본의 학생 보기는 지금 스키마 그대로다.
- 자산 바이트를 같은 ID로 바꾸는 API는 없다. 새 자산으로 바꾼 초안은 검수 도장이 비어 있다.
- 학생 세션의 그림 자산 GET은 배정 대상이 아니면 404다. 표본 단계에서는 교사 경로만 200이다.

회귀.

- 1판 세트 생성·수정 CAS·`clientKey` 재시도, 듣기 텍스트 문항의 검수·발행, 영어 울타리 수입 검사가 초록이다.
- `englishMenu`의 «옛 허용은 듣기·은행을 펼치지 않는다»와 «옛 `english` 차단은 은행을 끈다»가 고정된다.

## 후속

그림 발행 허용은 위 조건이 코드와 테스트로 닫힌 뒤다. 그 전에 이미지 생성 배치, EBS 파일 미러, 학생 그림 URL, 공개 은행은 하지 않는다. 운영 행을 은행으로 옮기는 작업도 이번 범위가 아니다. 계획서가 운영 전수 추출은 하지 않았다고 적혀 있다. 마이그레이션 적용 전에 영향 행 수와 되돌리기를 따로 본다.

이 검토는 정적 대조와 문제지 1쪽의 텍스트·이미지 좌표 확인이다. 앱을 켜거나 DB를 조회하지 않았다.

## 합의 재검토 — 동의

`english-bank-consensus-20261003.md`의 구현 계약 1–10에 동의한다. 남은 차단 항목은 없다. 이번 출고는 은행 전체이고, 그림 학생 지원은 아니다.

길이도 코드와 같다. 원문 복원 화면은 `ENGLISH_PASSAGE_MAX`(24,000자)에서 멈추고(`EnglishMakerView.tsx` 521–525행), 외부 생성 입력과 `meta.sourcePassage`는 18,000자다. 은행 보관 30,000자는 그 두 상한을 올리지 않는다. 초과는 자르지 않고 차이만 안내한다. Codex의 «18,000자 초과면 제작 진입 전체 차단»은 따르지 않는다.

그림은 이번 은행에 필드를 넣지 않는다. 1차 검토의 선택 칸(`stimulus`, `visual`, `spokenText`), `EnglishVisualAsset`, 발행 거절 코드, «그림 표본과 발행 봉인» 테스트는 이번 출고에서 뺀다. `{id,text}`를 유지하고, 반쪽 필드를 초안에만 넣지 않는다. `school-places-v1`는 교사 검토 파일로만 둔다. 학생 발행·화면·개별 보기 자산 등록은 미지원이다. 보기 삽화·공통 자극·도식을 나누는 계약은 저장·전달·투영·검수·발행·화면·인쇄를 한 변경으로 할 다음 작업이다.

입력문을 고치면 은행 참조를 지우고 사유를 보인다. 1차 검토에서 «수정된 사본에도 참조를 남긴다»고 한 문장은 철회한다. 다른 `passageRef`를 같은 `clientKey`에 끼우면 409다. 사용 행은 연결 당시의 원문·출처 사본과 개정·해시를 보관하고, 세트를 지워도 그 사본의 개정 행은 남는다. 사용 연결만 지운다.

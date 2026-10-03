/**
 * 교재 서버 코드의 변이 하네스 — 범위 · CAS · 자격 · 검수 · 발행 검증의 가드를 **한 줄씩** 빼고 시험이 빨개지는지 본다.
 *
 *   npx tsx scripts/qa/textbook-server-mutations.ts            # 전부
 *   npx tsx scripts/qa/textbook-server-mutations.ts 공유 배정   # 이름에 그 글이 든 것만
 *
 * 소스 파일을 **제자리에서** 고쳤다가 되돌린다. 그래서:
 *   · 시작할 때 대상 파일에 커밋 안 된 변경이 있으면 멈춘다(되돌릴 기준이 없다)
 *   · 변이마다 원문을 메모리에 들고 `finally` 에서 되쓴다. 끝난 뒤 `git diff --quiet` 로 원복을 대조한다
 *   · 변이는 «줄 번호 + 그 줄에 있어야 하는 글»로 건다 — 줄이 밀렸으면 걸지 않고 «잘못 걸림»으로 센다
 *     (죽은 줄에 건 변이가 «안 물었다»로 읽히지 않게)
 * DB 에 닿지 않는다 — 시험은 PGlite(메모리 Postgres)에서 돈다.
 * 🔴 도는 동안 대상 파일을 손으로 고치지 않는다. 중간에 죽였으면 `git checkout -- src/lib/textbook` 으로 되돌린다.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

interface Mutation {
  name: string;
  file: string;
  /** 그 글이 있는 줄(1부터). 0 이면 파일 전체에서 한 번만 나와야 한다 */
  line: number;
  find: string;
  replace: string;
  tests: string[];
}

const LIB = "src/lib/textbook";
const DRAFT = "src/__tests__/lib/textbookDraft.test.ts";
const CAPTURE = "src/__tests__/lib/textbookCapture.test.ts";
const PUBLISH = "src/__tests__/lib/textbookPublish.test.ts";
const FLOWS = "src/__tests__/lib/textbookTeacherFlows.test.ts";
const FROZEN = "src/__tests__/lib/textbookFrozenSources.test.ts";
const ARTIFACTS = "src/__tests__/lib/textbookPublishArtifacts.test.ts";
const ROUTES = "src/__tests__/api/textbookRoutes.test.ts";
const REGISTER = "src/__tests__/lib/textbookRegisterAndRefs.test.ts";
const VALIDATOR = "src/__tests__/lib/textbookRealValidator.test.ts";

const MUTATIONS: Mutation[] = [
  // ── 범위 (access.ts)
  {
    name: "공유: 초안도 동료가 읽는다",
    file: `${LIB}/access.ts`,
    line: 0,
    find: `if (row.status !== "published") return null;`,
    replace: ``,
    tests: [DRAFT],
  },
  {
    name: "공유: 다른 지점도 읽는다",
    file: `${LIB}/access.ts`,
    line: 0,
    find: `actor.branchId !== row.sharedBranchId`,
    replace: `false`,
    tests: [DRAFT],
  },
  {
    name: "공유: 주인이 떠나도 · 정지돼도 읽는다",
    file: `${LIB}/access.ts`,
    line: 0,
    find: `if (!row.ownerActive || row.ownerBranchId !== row.sharedBranchId) return null;`,
    replace: ``,
    tests: [DRAFT],
  },
  {
    name: "판본: 주인이 아니어도 쓴다",
    file: `${LIB}/access.ts`,
    line: 0,
    find: `if (!row || row.ownerId !== actor.id) throw notFound("판본");`,
    replace: `if (!row) throw notFound("판본");`,
    tests: [DRAFT, CAPTURE, PUBLISH],
  },
  {
    name: "판본: 발행본도 고친다(앱 쪽 검사)",
    file: `${LIB}/access.ts`,
    line: 0,
    find: `if (row.status !== "draft") throw notDraft();`,
    replace: ``,
    tests: [DRAFT],
  },
  {
    name: "책: 주인이 아니어도 고친다",
    file: `${LIB}/access.ts`,
    line: 0,
    find: `if (!row || row.ownerId !== actor.id) throw notFound("교재");`,
    replace: `if (!row) throw notFound("교재");`,
    tests: [DRAFT],
  },
  // ── 책 (books.ts)
  {
    name: "목록: 남의 초안이 있다고 알린다",
    file: `${LIB}/server/books.ts`,
    line: 0,
    find: `draftEditionId: isOwner ? row.draftEditionId : null,`,
    replace: `draftEditionId: row.draftEditionId,`,
    tests: [DRAFT],
  },
  {
    name: "공유: 남의 지점에도 켠다",
    file: `${LIB}/server/books.ts`,
    line: 0,
    find: `if (!actor.branchId || target !== actor.branchId)`,
    replace: `if (false)`,
    tests: [DRAFT],
  },
  // ── 멱등 (requests.ts)
  {
    name: "멱등: 본문이 달라도 같은 요청으로 본다",
    file: `${LIB}/server/requests.ts`,
    line: 0,
    find: `existing.bodyHash !== key.bodyHash`,
    replace: `false`,
    tests: [DRAFT],
  },
  // ── 구획 (sections.ts)
  {
    name: "구획: 낡은 revision 으로 덮어쓴다",
    file: `${LIB}/server/sections.ts`,
    line: 385,
    find: `if (current.revision !== input.expectedRevision)`,
    replace: `if (false)`,
    tests: [DRAFT],
  },
  {
    name: "구획: 낡은 revision 으로 지운다",
    file: `${LIB}/server/sections.ts`,
    line: 475,
    find: `if (current.revision !== input.expectedRevision)`,
    replace: `if (false)`,
    tests: [DRAFT],
  },
  {
    name: "구획: 다른 구획의 배치를 끌어온다",
    file: `${LIB}/server/sections.ts`,
    line: 0,
    find: `else if (item.sectionId !== null && item.sectionId !== sectionId)`,
    replace: `else if (false)`,
    tests: [DRAFT],
  },
  {
    name: "구획: 남의 자산을 쓴다",
    file: `${LIB}/server/sections.ts`,
    line: 0,
    find: `WHERE "user_id" = $1::uuid AND "id" IN (SELECT value FROM jsonb_array_elements_text($2::jsonb))\``,
    replace: `WHERE $1::uuid IS NOT NULL AND "id" IN (SELECT value FROM jsonb_array_elements_text($2::jsonb))\``,
    tests: [DRAFT],
  },
  // ── 담기 (items.ts · snapshotFromProblem.ts)
  {
    name: "담기: 남의 시험지를 읽는다",
    file: `${LIB}/server/items.ts`,
    line: 0,
    find: `if (!test || test.userId !== actor.id) throw notFound("시험지");`,
    replace: `if (!test) throw notFound("시험지");`,
    tests: [CAPTURE],
  },
  {
    name: "담기: 출제 자격을 안 묻는다",
    file: `${LIB}/server/items.ts`,
    line: 374,
    find: `const ineligible = problemIneligibleReason(row);`,
    replace: `const ineligible = null as string | null;`,
    tests: [CAPTURE],
  },
  {
    name: "담기: 낡은 집계 revision 으로 담는다",
    file: `${LIB}/server/items.ts`,
    line: 443,
    find: `if (access.revision !== input.expectedRevision)`,
    replace: `if (false)`,
    tests: [CAPTURE],
  },
  {
    name: "배치: 낡은 집계 revision 으로 고친다",
    file: `${LIB}/server/items.ts`,
    line: 595,
    find: `if (access.revision !== input.expectedRevision)`,
    replace: `if (false)`,
    tests: [CAPTURE],
  },
  {
    name: "다시 캡처: 자격을 안 묻는다",
    file: `${LIB}/server/items.ts`,
    line: 693,
    find: `const ineligible = problemIneligibleReason(row);`,
    replace: `const ineligible = null as string | null;`,
    tests: [CAPTURE],
  },
  {
    name: "확정본: 스크립트가 든 SVG 도 담는다",
    file: `${LIB}/snapshotFromProblem.ts`,
    line: 0,
    find: `if (unsafe) return { reason: \`그림(SVG)을 담을 수 없습니다 — \${unsafe}\` };`,
    replace: ``,
    tests: [CAPTURE],
  },
  {
    name: "확정본: 어긋난 보기 짝을 그대로 쓴다",
    file: `${LIB}/snapshotFromProblem.ts`,
    line: 0,
    find: `choiceIndex: choiceKnown ? row.choiceFigureIndex[index]! : null,`,
    replace: `choiceIndex: row.choiceFigureIndex[index] ?? null,`,
    tests: [CAPTURE],
  },
  // ── 발행 (publish/*)
  {
    name: "발행: 개발 주소(vercel.app)로도 발행한다",
    file: `${LIB}/publish/rendererAdapter.ts`,
    line: 0,
    find: `/\\.vercel\\.app$/.test(url.hostname)`,
    replace: `false`,
    tests: [PUBLISH],
  },
  {
    name: "예약: 낡은 집계 revision 으로 예약한다",
    file: `${LIB}/publish/reserve.ts`,
    line: 0,
    find: `if (access.revision !== input.expectedRevision)`,
    replace: `if (false)`,
    tests: [PUBLISH],
  },
  {
    name: "걸음: 판본이 바뀌어도 계속 조판한다",
    file: `${LIB}/publish/step.ts`,
    line: 0,
    find: `if (access.status !== "draft" || access.revision !== request.baseRevision) {`,
    replace: `if (access.status !== "draft") {`,
    tests: [PUBLISH],
  },
  {
    name: "걸음: 임대가 살아 있어도 또 잡는다",
    file: `${LIB}/publish/step.ts`,
    line: 0,
    find: `OR ("state" = 'running' AND "lease_until" < (now() AT TIME ZONE 'UTC')))\`,`,
    replace: `OR ("state" = 'running'))\`,`,
    tests: [PUBLISH, FROZEN],
  },
  {
    name: "확정: 낡은 revision 으로 발행한다",
    file: `${LIB}/publish/finalize.ts`,
    line: 0,
    find: `if (edition.revision !== locked.baseRevision)`,
    replace: `if (false)`,
    tests: [PUBLISH],
  },
  {
    name: "확정: 다르게 읽힌 QR 도 통과시킨다",
    file: `${LIB}/publish/finalize.ts`,
    line: 0,
    find: `else if (checks[0]!.url !== url || checks[0]!.decodedUrl !== url)`,
    replace: `else if (false)`,
    tests: [PUBLISH],
  },
  {
    name: "확정: 쪽 계획에 빠진 문항을 통과시킨다",
    file: `${LIB}/publish/finalize.ts`,
    line: 74,
    find: `if (count !== 1)`,
    replace: `if (false)`,
    tests: [PUBLISH],
  },
  // ── 학생 QR (studentAccess.ts)
  {
    name: "학생: 회수 · 만료된 배정으로도 연다",
    file: `${LIB}/studentAccess.ts`,
    line: 0,
    find: `assignment.open &&`,
    replace: ``,
    tests: [FLOWS],
  },
  {
    name: "학생: 예약만 된 QR 도 연다",
    file: `${LIB}/studentAccess.ts`,
    line: 0,
    find: `if (!qr || !student || qr.state !== "active")`,
    replace: `if (!qr || !student)`,
    tests: [FLOWS],
  },
  {
    name: "학생: 범위 밖의 구획도 연다",
    file: `${LIB}/studentAccess.ts`,
    line: 0,
    find: `assignment.scopeIds.includes(target.sectionId)`,
    replace: `true`,
    tests: [FLOWS],
  },
  {
    name: "학생: 주인이 지점을 떠나도 연다",
    file: `${LIB}/studentAccess.ts`,
    line: 0,
    find: `qr.ownerBranchId === qr.sharedBranchId &&`,
    replace: ``,
    tests: [FLOWS],
  },
  {
    name: "학생: 종료 · 중지된 QR 도 연다",
    file: `${LIB}/studentAccess.ts`,
    line: 0,
    find: `if (qr.editionStatus !== "published" || qr.suspended || !qr.ownerActive)`,
    replace: `if (!qr.ownerActive)`,
    tests: [FLOWS],
  },
  // ── 영상 (videos.ts)
  {
    name: "영상: 검수 대기를 안 거쳐도 게시한다(앱 쪽)",
    file: `${LIB}/server/videos.ts`,
    line: 0,
    find: `if (current.status !== "review")`,
    replace: `if (false)`,
    tests: [FLOWS],
  },
  {
    name: "영상: 다른 해시로 검수해도 게시한다(앱 쪽)",
    file: `${LIB}/server/videos.ts`,
    line: 208,
    find: `if (input.expectedContentHash !== contentHash) throw stale();`,
    replace: ``,
    tests: [FLOWS],
  },
  // ── 배정 (assignments.ts)
  {
    name: "배정: 남의 반에 건다",
    file: `${LIB}/server/assignments.ts`,
    line: 0,
    find: `if (!owned || owned.ownerId !== actor.id)`,
    replace: `if (!owned)`,
    tests: [FLOWS],
  },
  {
    name: "배정: 다른 판본의 구획 · 배치를 범위로 받는다",
    file: `${LIB}/server/assignments.ts`,
    line: 0,
    find: `if (found !== scopeIds.length)`,
    replace: `if (false)`,
    tests: [FLOWS],
  },
  // ── 재출제 (reissue.ts)
  {
    name: "재출제: 남의 반에 만든다",
    file: `${LIB}/server/reissue.ts`,
    line: 0,
    find: `if (!owned || owned.ownerId !== actor.id) throw notFound("반");`,
    replace: `if (!owned) throw notFound("반");`,
    tests: [FLOWS],
  },
  {
    name: "재출제: 같은 문항 둘을 받는다",
    file: `${LIB}/server/reissue.ts`,
    line: 0,
    find: `if (seenProblems.has(item.problemId)) {`,
    replace: `if (false) {`,
    tests: [FLOWS],
  },
  {
    name: "재출제: 초안의 문항으로 만든다",
    file: `${LIB}/server/reissue.ts`,
    line: 0,
    find: `if (access.status !== "published")`,
    replace: `if (false)`,
    tests: [FLOWS],
  },
  // ── 가져오기 (imports.ts)
  {
    name: "가져오기: 내용이 달라도 연결로 받는다",
    file: `${LIB}/server/imports.ts`,
    line: 0,
    find: `recaptured.snapshot.contentHash === contentHash(payload)`,
    replace: `true`,
    tests: [FLOWS],
  },
  {
    name: "가져오기: 남의 확인을 그대로 받는다",
    file: `${LIB}/server/imports.ts`,
    line: 0,
    find: `const conceptRows = concepts.map(demoteReviews).map((concept) => ({`,
    replace: `const conceptRows = concepts.map((concept) => ({`,
    tests: [FLOWS],
  },
  {
    name: "가져오기: 해시가 다른 파일을 받는다",
    file: `${LIB}/server/imports.ts`,
    line: 0,
    find: `if (upload.sha256 !== input.expectedSha256)`,
    replace: `if (false)`,
    tests: [FLOWS],
  },
  // ── 바이트 · 내보내기 · 활동
  {
    name: "자산: 판본을 못 읽는 사람도 읽는다",
    file: `${LIB}/server/bytes.ts`,
    line: 32,
    find: `await requireReadableEdition(sql, actor, editionId);`,
    replace: ``,
    tests: [FLOWS],
  },
  {
    name: "산출물: 판본을 못 읽는 사람도 읽는다",
    file: `${LIB}/server/bytes.ts`,
    line: 52,
    find: `await requireReadableEdition(sql, actor, editionId);`,
    replace: ``,
    tests: [FLOWS],
  },
  {
    name: "올리기: 남의 올리기를 쓴다",
    file: `${LIB}/server/blobs.ts`,
    line: 0,
    find: `FROM "textbook_upload" WHERE "id" = $1::uuid AND "user_id" = $2::uuid\`,`,
    replace: `FROM "textbook_upload" WHERE "id" = $1::uuid AND $2::uuid IS NOT NULL\`,`,
    tests: [FLOWS],
  },
  {
    name: "올리기: 크기가 달라도 끝맺는다",
    file: `${LIB}/server/blobs.ts`,
    line: 0,
    find: `check?.total !== input.byteLength ||`,
    replace: ``,
    tests: [FLOWS],
  },
  {
    name: "내보내기: manifest 가 달라도 낸다",
    file: `${LIB}/server/exportEdition.ts`,
    line: 0,
    find: `manifestHash(exchange) !== access.manifestHash`,
    replace: `false`,
    tests: [FLOWS],
  },
  // ── 확정본이 이미 있는 출처 (items.ts · itemLink.ts)
  {
    name: "담기: 확정본이 달린 시험지 문항도 은행에서 다시 읽는다",
    file: `${LIB}/server/items.ts`,
    line: 0,
    find: `if (frozenSnapshotId) {`,
    replace: `if (false) {`,
    tests: [FROZEN],
  },
  {
    name: "담기: 남의 확정본을 복제하지 않는다",
    file: `${LIB}/server/items.ts`,
    line: 0,
    find: `frozen.filter((source) => source.userId !== actor.id),`,
    replace: `[],`,
    tests: [FROZEN],
  },
  {
    name: "연결: 내용이 달라도 잇는다",
    file: `${LIB}/server/itemLink.ts`,
    line: 0,
    find: `if (captured.snapshot.contentHash !== before.contentHash)`,
    replace: `if (false)`,
    tests: [FROZEN],
  },
  {
    name: "연결: 자격 없는 은행 문항과 잇는다",
    file: `${LIB}/server/itemLink.ts`,
    line: 0,
    find: `if (ineligible) throw conflict(ineligible);`,
    replace: ``,
    tests: [FROZEN],
  },
  {
    name: "연결: 낡은 집계 revision 으로 잇는다",
    file: `${LIB}/server/itemLink.ts`,
    line: 0,
    find: `if (access.revision !== input.expectedRevision)`,
    replace: `if (false)`,
    tests: [FROZEN],
  },
  {
    name: "연결: 남의 판본의 배치를 잇는다",
    file: `${LIB}/server/itemLink.ts`,
    line: 0,
    find: `await requireOwnedEdition(db, actor, editionId);`,
    replace: ``,
    tests: [FROZEN],
  },
  // ── 산출물 · 조판 계획 (step.ts · finalize.ts · reserve.ts)
  {
    name: "걸음: 해설판이 학생용의 쪽 자리를 안 받는다",
    file: `${LIB}/publish/step.ts`,
    line: 0,
    find: `...(twin ? { studentCarry: twin.result?.carry } : {}),`,
    replace: ``,
    tests: [ARTIFACTS],
  },
  {
    name: "확정: 펼침면에서 다시 읽은 QR 을 안 본다",
    file: `${LIB}/publish/finalize.ts`,
    line: 0,
    find: `? qrReadbackIssues(spread.result?.qrChecks ?? [], reserved)`,
    replace: `? []`,
    tests: [ARTIFACTS],
  },
  {
    name: "확정: 해설판에서 다시 읽은 QR 을 안 본다",
    file: `${LIB}/publish/finalize.ts`,
    line: 0,
    find: `merged("answers").result?.qrChecks ?? []`,
    replace: `[]`,
    tests: [ARTIFACTS],
  },
  {
    name: "예약: 구획이 빠진 조판 계획을 받는다",
    file: `${LIB}/publish/reserve.ts`,
    line: 0,
    find: `flat.length !== orderedIds.length ||`,
    replace: ``,
    tests: [ARTIFACTS],
  },
  {
    name: "예약: 차례가 어긋난 조판 계획을 받는다",
    file: `${LIB}/publish/reserve.ts`,
    line: 0,
    find: `flat.some((index, at) => index !== at)`,
    replace: `false`,
    tests: [ARTIFACTS],
  },
  // ── 백지 소단원 조회 (conceptRows.ts)
  {
    name: "조회: 비슷한 소단원도 맞춘다",
    file: `${LIB}/server/conceptRows.ts`,
    line: 0,
    find: `AND EXISTS (SELECT 1 FROM jsonb_array_elements(c."blank_items") b WHERE b ->> 'blankSectionKey' = $2::text)`,
    replace: `AND EXISTS (SELECT 1 FROM jsonb_array_elements(c."blank_items") b WHERE split_part(b ->> 'blankSectionKey', '::', 2) = split_part($2::text, '::', 2))`,
    tests: [ROUTES],
  },
  // ── 판본 읽기의 SQL 꼴 (access.ts `readableEditionSql`) — 조회 · 활동 증거가 같이 쓴다
  {
    name: "읽기 SQL: 동료의 초안도 읽힌다",
    file: `${LIB}/access.ts`,
    line: 0,
    find: `    e."status" = 'published'`,
    replace: `    TRUE`,
    tests: [ROUTES, REGISTER],
  },
  {
    name: "읽기 SQL: 주인이 지점을 떠나도 읽힌다",
    file: `${LIB}/access.ts`,
    line: 0,
    find: `AND t."shared_branch_id" = o."branch_id"`,
    replace: ``,
    tests: [ROUTES, REGISTER],
  },
  {
    name: "읽기 SQL: 다른 지점도 읽힌다",
    file: `${LIB}/access.ts`,
    line: 0,
    find: `AND t."shared_branch_id" = \${branch}::uuid`,
    replace: ``,
    tests: [REGISTER],
  },
  {
    name: "증거: 읽을 수 없는 책의 이름을 낸다",
    file: `${LIB}/server/conceptRows.ts`,
    line: 0,
    find: `return row?.canOpen`,
    replace: `return row`,
    tests: [REGISTER],
  },
  // ── 새 문항으로 등록 (itemRegister.ts)
  {
    name: "등록: 승인된 문항으로 만든다",
    file: `${LIB}/server/itemRegister.ts`,
    line: 0,
    find: `$10::"problem_pool", 'pending', `,
    replace: `$10::"problem_pool", 'approved', `,
    tests: [REGISTER],
  },
  {
    name: "등록: 등록하면서 연결한다",
    file: `${LIB}/server/itemRegister.ts`,
    line: 0,
    find: `UPDATE "textbook_item" SET "link_candidates" = $3::jsonb,`,
    replace: `UPDATE "textbook_item" SET "link_status" = 'linked', "link_candidates" = $3::jsonb,`,
    tests: [REGISTER],
  },
  {
    name: "등록: 그림이 있어도 등록한다",
    file: `${LIB}/server/itemRegister.ts`,
    line: 0,
    find: `if (source.figureCount > 0)`,
    replace: `if (false)`,
    tests: [REGISTER],
  },
  {
    name: "등록: 같은 배치를 또 등록한다",
    file: `${LIB}/server/itemRegister.ts`,
    line: 0,
    find: `if (waiting.length)`,
    replace: `if (false)`,
    tests: [REGISTER],
  },
  {
    name: "등록: 이미 연결된 배치도 등록한다",
    file: `${LIB}/server/itemRegister.ts`,
    line: 0,
    find: `if (source.linkStatus === "linked")`,
    replace: `if (false)`,
    tests: [REGISTER],
  },
  {
    name: "등록: 낡은 집계 revision 으로 등록한다",
    file: `${LIB}/server/itemRegister.ts`,
    line: 0,
    find: `if (access.revision !== input.expectedRevision)`,
    replace: `if (false)`,
    tests: [REGISTER],
  },
  // ── 목차의 개념 강의 참조 (lectureRefs.ts · editions.ts · preflight.ts · imports.ts)
  {
    name: "강의 참조: 게시 안 된 강의도 받는다",
    file: `${LIB}/server/lectureRefs.ts`,
    line: 0,
    find: `: lecture.status !== "published"`,
    replace: `: false`,
    tests: [REGISTER],
  },
  {
    name: "강의 참조: 판본에 없는 개념도 받는다",
    file: `${LIB}/server/lectureRefs.ts`,
    line: 0,
    find: `: conceptUnit === undefined`,
    replace: `: false`,
    tests: [REGISTER],
  },
  {
    name: "강의 참조: 다른 단원의 강의도 받는다",
    file: `${LIB}/server/lectureRefs.ts`,
    line: 0,
    find: `: conceptUnit !== null && conceptUnit !== lecture.unitId`,
    replace: `: false`,
    tests: [REGISTER],
  },
  {
    name: "강의 목록: 초안 · 내린 강의도 낸다",
    file: `${LIB}/server/lectureRefs.ts`,
    line: 0,
    find: `WHERE "unit_id" = $1::uuid AND "status" = 'published'`,
    replace: `WHERE "unit_id" = $1::uuid`,
    tests: [REGISTER],
  },
  {
    name: "목차 저장: 새 강의 참조를 확인하지 않는다",
    file: `${LIB}/server/editions.ts`,
    line: 0,
    find: `if (fault) throw invalid(`,
    replace: `if (false) throw invalid(`,
    tests: [REGISTER],
  },
  {
    name: "사전 검사: 강의 참조를 안 본다",
    file: `${LIB}/publish/preflight.ts`,
    line: 0,
    find: `    lectureRefsOf(exchange.units),`,
    replace: `    [],`,
    tests: [REGISTER],
  },
  {
    name: "가져오기: 성립하지 않는 강의 참조도 가져온다",
    file: `${LIB}/server/imports.ts`,
    line: 0,
    find: `!droppedRefs.has(`,
    replace: `!new Set<string>().has(`,
    tests: [REGISTER],
  },
  // ── 실제 검증기와 맞물리는 자리 (exchange.ts · items.ts · deps.server.ts · snapshotFromProblem.ts)
  {
    name: "교환 형식: 차례를 구획 안의 값으로 낸다",
    file: `${LIB}/server/exchange.ts`,
    line: 0,
    find: `orderIndex: position,`,
    replace: `orderIndex: row.orderIndex,`,
    tests: [VALIDATOR],
  },
  {
    name: "배치 응답: 차례를 구획 안의 값으로 낸다",
    file: `${LIB}/server/items.ts`,
    line: 0,
    find: `o."globalIndex" AS "orderIndex", i."order_index" AS "sectionOrder",`,
    replace: `i."order_index" AS "orderIndex", i."order_index" AS "sectionOrder",`,
    tests: [VALIDATOR],
  },
  {
    name: "사전 검사: 초안 기준으로 본다",
    file: `${LIB}/publish/deps.server.ts`,
    line: 0,
    find: `mode: "publish",`,
    replace: `mode: "draft",`,
    tests: [VALIDATOR],
  },
  {
    name: "확정본: 인라인 SVG 를 짝 모르는 그림으로 적는다",
    file: `${LIB}/snapshotFromProblem.ts`,
    line: 0,
    find: `choiceIndex: 0,`,
    replace: `choiceIndex: null,`,
    tests: [VALIDATOR, CAPTURE],
  },
  {
    name: "걸음: 조판기가 남긴 원고의 사유를 버린다",
    file: `${LIB}/publish/step.ts`,
    line: 0,
    find: `if (!Array.isArray(raw)) return [];`,
    replace: `return [];`,
    tests: [ARTIFACTS],
  },
  {
    name: "활동: 남의 학생을 읽고 쓴다",
    file: `${LIB}/server/conceptRows.ts`,
    line: 0,
    find: `if (!row || row.ownerId !== actor.id) throw notFound("학생");`,
    replace: `if (!row) throw notFound("학생");`,
    tests: [FLOWS],
  },
];

function runTests(tests: string[]): { failed: number; passed: number } {
  const result = spawnSync(
    process.execPath,
    ["node_modules/vitest/vitest.mjs", "run", ...tests],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  const output = `${result.stdout}\n${result.stderr}`;
  const line = output.match(/Tests\s+(?:(\d+) failed \| )?(\d+) passed/);
  // 묶음째 죽었으면(문법 오류 등) 시험이 문 것이 아니다 — 통과 0 · 실패 0 으로 돌려 «잘못 걸림»이 되게 한다
  if (/Failed Suites/.test(output) && !line) return { failed: 0, passed: 0 };
  return {
    failed: line?.[1] ? Number(line[1]) : 0,
    passed: line?.[2] ? Number(line[2]) : 0,
  };
}

/** 줄끝을 건드리지 않고 한 곳만 바꾼다. 못 걸면 null */
function mutate(source: string, mutation: Mutation): string | null {
  if (mutation.line === 0) {
    if (source.split(mutation.find).length - 1 !== 1) return null;
    return source.replace(mutation.find, () => mutation.replace);
  }
  const lines = source.split("\n");
  const index = mutation.line - 1;
  if (!lines[index]?.includes(mutation.find)) return null;
  lines[index] = lines[index].replace(mutation.find, () => mutation.replace);
  return lines.join("\n");
}

const DRY = process.argv.includes("--dry");
const filters = process.argv.slice(2).filter((arg) => arg !== "--dry");
if (DRY) {
  // 시험을 돌리지 않고 «걸 자리가 있는가»만 본다
  const missing = MUTATIONS.filter(
    (m) => mutate(readFileSync(m.file, "utf8"), m) === null,
  );
  for (const m of missing)
    console.log(`  ?  ${m.name} — ${m.file}:${m.line || "한 번"}`);
  console.log(`변이 ${MUTATIONS.length}개 · 걸 자리 없음 ${missing.length}`);
  process.exit(missing.length ? 1 : 0);
}
const chosen = filters.length
  ? MUTATIONS.filter((m) => filters.some((f) => m.name.includes(f)))
  : MUTATIONS;
const files = [...new Set(chosen.map((m) => m.file))];

const dirty = execFileSync("git", ["status", "--porcelain", "--", ...files], {
  encoding: "utf8",
}).trim();
if (dirty) {
  console.error(
    `커밋 안 된 변경이 있는 파일에는 변이를 걸지 않는다:\n${dirty}`,
  );
  process.exit(1);
}

const control = runTests([
  DRAFT,
  CAPTURE,
  PUBLISH,
  FLOWS,
  FROZEN,
  ARTIFACTS,
  ROUTES,
  REGISTER,
  VALIDATOR,
]);
console.log(
  `대조군(변이 없음): ${control.passed} 통과 · ${control.failed} 실패`,
);
if (control.failed !== 0 || control.passed === 0) {
  console.error("대조군이 초록이 아니다 — 변이를 재기 전에 시험부터 고친다.");
  process.exit(1);
}

const survived: string[] = [];
const broken: string[] = [];
for (const mutation of chosen) {
  const original = readFileSync(mutation.file, "utf8");
  const mutated = mutate(original, mutation);
  if (mutated === null) {
    broken.push(mutation.name);
    console.log(`  ?  ${mutation.name} — 걸 자리를 못 찾았다(줄이 밀렸다)`);
    continue;
  }
  try {
    writeFileSync(mutation.file, mutated);
    const result = runTests(mutation.tests);
    if (result.failed + result.passed === 0) {
      broken.push(mutation.name);
      console.log(`  ?  ${mutation.name} — 시험이 한 줄도 안 돌았다`);
    } else if (result.failed === 0) {
      survived.push(mutation.name);
      console.log(`  ✗  ${mutation.name} — 안 물었다 (${result.passed} 통과)`);
    } else {
      console.log(`  ✓  ${mutation.name} — 물었다 (${result.failed} 실패)`);
    }
  } finally {
    writeFileSync(mutation.file, original);
  }
}

const restored =
  spawnSync("git", ["diff", "--quiet", "--", ...files]).status === 0;
console.log(
  `\n변이 ${chosen.length}개 · 물었다 ${chosen.length - survived.length - broken.length} · 안 물었다 ${survived.length} · 잘못 걸림 ${broken.length} · 원복 ${restored ? "확인" : "🔴 실패 — git checkout 으로 되돌릴 것"}`,
);
if (survived.length || broken.length || !restored) process.exit(1);

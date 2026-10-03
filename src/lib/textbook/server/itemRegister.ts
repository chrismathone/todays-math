/**
 * 새 문항으로 등록 — 은행과 연결되지 않은 배치(가져온 원고의 문항)를 **문제은행의 검수 대기 문항**으로 올린다.
 *
 * 기존 손등록(`POST /api/problems`)과 같은 줄을 만든다: 주인은 등록한 사람, 출처는 자작, **검수 상태는 대기**.
 * 🔴 여기서는 연결하지 않고 승인하지 않는다. 검수 전의 문항은 출제 자격이 없어 «연결됨»이 될 수 없다.
 *    배치는 등록 전의 연결 상태 그대로 남고, 방금 만든 문항이 **연결 후보**로 붙는다 — 검수를 통과한 뒤
 *    연결(`linkItem`)이 그 은행 문항을 다시 캡처해 내용 해시가 같을 때만 잇는다(검수에서 고쳐졌으면 잇지 않는다).
 * 🔴 은행 문항의 내용은 배치의 확정본에서 **글자 그대로** 온다(본문 · 정답 · 해설 · 문제 형식 · 인라인 SVG). 형식을 추측해 채우지 않는다.
 * 🔴 **만든 은행 문항을 그 자리에서 다시 캡처해 내용 해시가 배치의 확정본과 같은지 본다.** 다르면 등록하지 않는다(통째로 되돌린다) —
 *    «나중에 같은 내용이면 이어진다»를 바라는 것이 아니라 지금 확인한다. 다르게 캡처되는 문항을 은행에 남기면
 *    검수를 통과해도 영영 이어지지 않는 문항이 쌓인다.
 * 🔴 그림 — 은행에는 **그림 파일을 화면에서 올리는 길이 없다**(스캔 그림은 배포 파일 · 공유 저장소의 명부에 적힌 파일이다.
 *    기존 손등록에도 그림 칸이 없다). 그래서:
 *      · 그림이 **인라인 SVG 하나**뿐이면 그 바이트(UTF-8)를 은행의 `figure_svg` 에 그대로 적는다 — 바이트 손실이 없다
 *      · 스캔 그림(파일)이 있으면 등록하지 않고 사유를 낸다. 그림을 떼고 등록하면 «그림 없이 나가는 문항»이 은행에 생긴다
 * 단원 · 난이도 · 유형은 요청이 정한다(가져온 확정본의 단원은 다른 계정 · 다른 시점의 값일 수 있다).
 */
import { randomUUID } from "node:crypto";

import type { TextbookItem } from "@/contracts/textbookExchange.contract";
import type { TextbookLinkCandidate } from "@/contracts/textbookServer.contract";
import { DEFAULT_PROBLEM_POOL } from "@/lib/problemPool";

import { type TextbookActor, requireOwnedDraft } from "../access";
import { captureProblemSnapshot } from "../snapshotFromProblem";
import { aggregateRevision } from "./editions";
import {
  TextbookError,
  conflict,
  invalid,
  notFound,
  revisionMismatch,
} from "./errors";
import { loadProblemRows, placedItems } from "./items";
import { type RequestKey, runOnce } from "./requests";
import { type TextbookDb, type TextbookSql, SQL_NOW, uuidList } from "./sql";

/** 은행의 본문 · 정답 · 해설 상한(손등록 계약과 같다) */
const BANK_TEXT_MAX = 10_000;
const CANDIDATE_MAX = 50;
/** 인라인 SVG 의 상한 — 은행의 칸은 글자다. 그림 한 장이 이보다 크면 인라인으로 적을 것이 아니다 */
const INLINE_SVG_MAX_BYTES = 512 * 1024;

export interface RegisterItemInput {
  expectedRevision: number;
  unitId: string;
  difficulty: string;
  problemType: string;
}

export interface RegisterItemResult {
  item: TextbookItem;
  problem: { problemId: string; problemCode: string; reviewStatus: "pending" };
  linkCandidates: TextbookLinkCandidate[];
  aggregateRevision: number;
}

interface ItemSource {
  snapshotId: string;
  linkStatus: TextbookItem["linkStatus"];
  linkCandidates: TextbookLinkCandidate[];
  contentHash: string;
  content: string;
  answer: string;
  solution: string | null;
  questionType: string | null;
  figureAssetIds: string[];
  inlineSvgAssetId: string | null;
}

const unprocessable = (message: string) =>
  new TextbookError(422, "VALIDATION_ERROR", message);

/**
 * 확정본의 그림이 인라인 SVG 하나뿐이면 그 글자를 낸다. 그림이 없으면 null.
 * 스캔 그림이 섞여 있거나 인라인 SVG 가 아니면 던진다 — 은행에 놓을 자리가 없다.
 * 바이트는 **이 판본의 자산 색인을 지나** 읽는다(해시를 안다고 읽히지 않는다).
 */
async function inlineSvgOf(
  tx: TextbookSql,
  editionId: string,
  source: ItemSource,
): Promise<string | null> {
  if (source.figureAssetIds.length === 0) return null;
  if (
    source.figureAssetIds.length !== 1 ||
    source.inlineSvgAssetId === null ||
    source.figureAssetIds[0] !== source.inlineSvgAssetId
  )
    throw unprocessable(
      "스캔 그림이 있는 문항은 여기서 등록하지 않습니다. 은행의 그림 파일은 화면에서 올릴 수 없습니다.",
    );
  const [asset] = await tx.query<{ mimeType: string; bytes: Uint8Array }>(
    `SELECT a."mime_type" AS "mimeType", b."bytes"
       FROM "textbook_edition_asset" ea
       JOIN "textbook_asset" a ON a."user_id" = ea."user_id" AND a."id" = ea."asset_id"
       JOIN "textbook_blob" b ON b."sha256" = ea."asset_id"
      WHERE ea."edition_id" = $1::uuid AND ea."asset_id" = $2::text`,
    [editionId, source.inlineSvgAssetId],
  );
  if (
    !asset ||
    asset.mimeType !== "image/svg+xml" ||
    asset.bytes.byteLength > INLINE_SVG_MAX_BYTES
  )
    throw unprocessable("이 문항의 그림을 은행에 그대로 적을 수 없습니다.");
  try {
    // 글자로 못 읽는 바이트면 그대로 적은 것이 아니다 — 대체 글자로 바꿔 적지 않는다
    return new TextDecoder("utf-8", { fatal: true }).decode(asset.bytes);
  } catch {
    throw unprocessable("이 문항의 그림을 은행에 그대로 적을 수 없습니다.");
  }
}

export async function registerItemProblem(
  db: TextbookDb,
  actor: TextbookActor,
  editionId: string,
  itemId: string,
  key: RequestKey,
  input: RegisterItemInput,
): Promise<RegisterItemResult & { replayed: boolean }> {
  return db.transaction(async (tx) => {
    const { result, replayed } = await runOnce<RegisterItemResult>(
      tx,
      key,
      async () => {
        const access = await requireOwnedDraft(tx, actor, editionId);
        if (access.revision !== input.expectedRevision)
          throw revisionMismatch("판본", access.revision);
        const [source] = await tx.query<ItemSource>(
          `SELECT s."id" AS "snapshotId", i."link_status" AS "linkStatus", i."link_candidates" AS "linkCandidates",
                  s."content_hash" AS "contentHash",
                  s."payload" ->> 'content' AS "content", s."payload" ->> 'answer' AS "answer",
                  s."payload" ->> 'solution' AS "solution", s."payload" ->> 'questionType' AS "questionType",
                  COALESCE((SELECT jsonb_agg(f ->> 'assetId') FROM jsonb_array_elements(s."payload" -> 'figures') f),
                           '[]'::jsonb) AS "figureAssetIds",
                  s."raw_source" ->> 'figureSvgAssetId' AS "inlineSvgAssetId"
             FROM "textbook_item" i JOIN "textbook_problem_snapshot" s ON s."id" = i."snapshot_id"
            WHERE i."id" = $1::uuid AND i."edition_id" = $2::uuid AND i."section_id" IS NOT NULL`,
          [itemId, editionId],
        );
        if (!source) throw notFound("배치");
        if (source.linkStatus === "linked")
          throw conflict("이미 은행 문항과 연결된 문항입니다.");
        const figureSvg = await inlineSvgOf(tx, editionId, source);
        if (
          !source.content ||
          !source.answer ||
          [source.content, source.answer, source.solution ?? ""].some(
            (text) => text.length > BANK_TEXT_MAX,
          )
        )
          throw unprocessable(
            "본문 · 정답이 비었거나 은행에 등록할 수 있는 길이를 넘습니다.",
          );
        if (source.questionType !== null && source.questionType.length > 10)
          throw unprocessable("문제 형식 값을 은행에 그대로 적을 수 없습니다.");
        if (source.linkCandidates.length >= CANDIDATE_MAX)
          throw conflict("연결 후보가 너무 많습니다.");
        // 같은 배치를 두 번 등록하지 않는다 — 내가 올려 검수를 기다리는 후보가 이미 있으면 그것을 쓴다
        if (source.linkCandidates.length) {
          const waiting = await tx.query<{ id: string }>(
            `SELECT "id" FROM "problem"
              WHERE "id" IN ${uuidList("$1")} AND "user_id" = $2::uuid AND "review_status" = 'pending'`,
            [
              JSON.stringify(
                source.linkCandidates.map((candidate) => candidate.problemId),
              ),
              actor.id,
            ],
          );
          if (waiting.length)
            throw conflict("이미 등록해 검수를 기다리는 문항이 있습니다.");
        }
        const [unit] = await tx.query<{ id: string }>(
          `SELECT "id" FROM "unit" WHERE "id" = $1::uuid`,
          [input.unitId],
        );
        if (!unit) throw invalid("없는 단원입니다.");

        const problemId = randomUUID();
        // 문항 코드는 DB 트리거가 붙인다. 검수 상태는 **늘 대기**다 — 요청이 정하지 못한다
        const [created] = await tx.query<{ problemCode: string }>(
          `INSERT INTO "problem" ("id", "user_id", "unit_id", "source", "difficulty", "problem_type", "question_type",
                                  "content", "answer", "solution", "figure_svg", "pool", "review_status", "updated_at")
           VALUES ($1::uuid, $2::uuid, $3::uuid, 'manual', $4::"difficulty", $5::text, $6::text, $7::text, $8::text, $9::text,
                   $10::text, $11::"problem_pool", 'pending', ${SQL_NOW})
           RETURNING "problem_code" AS "problemCode"`,
          [
            problemId,
            actor.id,
            input.unitId,
            input.difficulty,
            input.problemType,
            source.questionType,
            source.content,
            source.answer,
            source.solution,
            figureSvg,
            DEFAULT_PROBLEM_POOL,
          ],
        );

        // 방금 만든 은행 문항을 다시 캡처한다 — 내용 해시가 배치의 확정본과 같아야 뒤에 이어질 수 있다.
        // 다르면 던진다(트랜잭션이 은행의 줄까지 되돌린다). 그림 파일이 없는 문항이라 그림을 읽을 일이 없다
        const row = (await loadProblemRows(tx, [problemId])).get(problemId);
        const recaptured = row
          ? await captureProblemSnapshot(row, async () => null)
          : null;
        if (
          !recaptured?.ok ||
          recaptured.snapshot.contentHash !== source.contentHash
        )
          throw unprocessable(
            "은행에 그대로 옮길 수 없는 문항입니다. 다시 캡처한 내용이 이 문항과 달라 등록하지 않았습니다.",
          );

        const candidate: TextbookLinkCandidate = {
          system: "todays-math",
          problemId,
          problemCode: created!.problemCode,
        };
        const linkCandidates = [...source.linkCandidates, candidate];
        // 연결 상태는 건드리지 않는다 — 후보만 더한다
        await tx.execute(
          `UPDATE "textbook_item" SET "link_candidates" = $3::jsonb, "revision" = "revision" + 1, "updated_at" = ${SQL_NOW}
            WHERE "id" = $1::uuid AND "edition_id" = $2::uuid`,
          [itemId, editionId, JSON.stringify(linkCandidates)],
        );
        const [item] = await placedItems(tx, editionId, [itemId]);
        return {
          item: item!,
          problem: {
            problemId,
            problemCode: candidate.problemCode,
            reviewStatus: "pending",
          },
          linkCandidates,
          aggregateRevision: await aggregateRevision(tx, editionId),
        };
      },
    );
    return { ...result, replayed };
  });
}

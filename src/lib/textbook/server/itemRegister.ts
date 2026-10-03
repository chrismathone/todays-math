/**
 * 새 문항으로 등록 — 은행과 연결되지 않은 배치(가져온 원고의 문항)를 **문제은행의 검수 대기 문항**으로 올린다.
 *
 * 기존 손등록(`POST /api/problems`)과 같은 줄을 만든다: 주인은 등록한 사람, 출처는 자작, **검수 상태는 대기**.
 * 🔴 여기서는 연결하지 않고 승인하지 않는다. 검수 전의 문항은 출제 자격이 없어 «연결됨»이 될 수 없다.
 *    배치는 등록 전의 연결 상태 그대로 남고, 방금 만든 문항이 **연결 후보**로 붙는다 — 검수를 통과한 뒤
 *    연결(`linkItem`)이 그 은행 문항을 다시 캡처해 내용 해시가 같을 때만 잇는다(검수에서 고쳐졌으면 잇지 않는다).
 * 🔴 은행 문항의 내용은 배치의 확정본에서 **글자 그대로** 온다(본문 · 정답 · 해설 · 문제 형식). 형식을 추측해 채우지 않는다 —
 *    추측한 값이 들어가면 다시 캡처한 해시가 달라져 영영 연결되지 않는다.
 * 🔴 그림이 있는 문항은 등록하지 않는다. 은행의 그림은 파일 경로 칸이고 여기서는 파일을 놓을 수 없다 —
 *    그림을 떼고 등록하면 «그림 없이 나가는 문항»이 은행에 생긴다. 사유를 내고 멈춘다.
 * 단원 · 난이도 · 유형은 요청이 정한다(가져온 확정본의 단원은 다른 계정 · 다른 시점의 값일 수 있다).
 */
import { randomUUID } from "node:crypto";

import type { TextbookItem } from "@/contracts/textbookExchange.contract";
import type { TextbookLinkCandidate } from "@/contracts/textbookServer.contract";
import { DEFAULT_PROBLEM_POOL } from "@/lib/problemPool";

import { type TextbookActor, requireOwnedDraft } from "../access";
import { aggregateRevision } from "./editions";
import {
  TextbookError,
  conflict,
  invalid,
  notFound,
  revisionMismatch,
} from "./errors";
import { placedItems } from "./items";
import { type RequestKey, runOnce } from "./requests";
import { type TextbookDb, SQL_NOW, uuidList } from "./sql";

/** 은행의 본문 · 정답 · 해설 상한(손등록 계약과 같다) */
const BANK_TEXT_MAX = 10_000;
const CANDIDATE_MAX = 50;

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
  linkStatus: TextbookItem["linkStatus"];
  linkCandidates: TextbookLinkCandidate[];
  content: string;
  answer: string;
  solution: string | null;
  questionType: string | null;
  figureCount: number;
}

const unprocessable = (message: string) =>
  new TextbookError(422, "VALIDATION_ERROR", message);

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
          `SELECT i."link_status" AS "linkStatus", i."link_candidates" AS "linkCandidates",
                  s."payload" ->> 'content' AS "content", s."payload" ->> 'answer' AS "answer",
                  s."payload" ->> 'solution' AS "solution", s."payload" ->> 'questionType' AS "questionType",
                  jsonb_array_length(s."payload" -> 'figures') AS "figureCount"
             FROM "textbook_item" i JOIN "textbook_problem_snapshot" s ON s."id" = i."snapshot_id"
            WHERE i."id" = $1::uuid AND i."edition_id" = $2::uuid AND i."section_id" IS NOT NULL`,
          [itemId, editionId],
        );
        if (!source) throw notFound("배치");
        if (source.linkStatus === "linked")
          throw conflict("이미 은행 문항과 연결된 문항입니다.");
        if (source.figureCount > 0)
          throw unprocessable(
            "그림이 있는 문항은 여기서 등록하지 않습니다. 문제은행의 등록 화면에서 그림과 함께 등록해 주세요.",
          );
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
                                  "content", "answer", "solution", "pool", "review_status", "updated_at")
           VALUES ($1::uuid, $2::uuid, $3::uuid, 'manual', $4::"difficulty", $5::text, $6::text, $7::text, $8::text, $9::text,
                   $10::"problem_pool", 'pending', ${SQL_NOW})
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
            DEFAULT_PROBLEM_POOL,
          ],
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

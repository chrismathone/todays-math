/**
 * 오늘의 영어 2판 — 시험용 표본 (자료 개선 M0, docs/planning/english-material-upgrade-20261002.md §B).
 *
 * 🔴 **우리가 지은 글이다.** 수집 자료(교재 · 문제집 · 분석지)의 지문이나 문항을 옮기지 않았다 — 구조만 본떴다:
 * 지문 하나에 «두 표현 가운데 고르기» 표적이 둘 있고, 정답은 표적마다 하나다.
 * 자리는 손으로 적은 숫자다(`indexOf` 로 지으면 틀린 자리도 스스로 맞아 버린다) — 시험이 `slice` 로 다시 잰다.
 */
import type { EnglishSet } from "@/contracts/english.contract";
import type { EnglishV2Document } from "@/contracts/englishV2.contract";

import { USER_TEACHER_ID } from "./data";

export const V2_DOCUMENT_ID = "20000000-0000-4000-8000-0000000000d1";
export const V2_PASSAGE_ID = "20000000-0000-4000-8000-0000000000a1";
export const V2_ITEM_ID = "20000000-0000-4000-8000-0000000000b1";
export const V2_TARGET_TENSE_ID = "20000000-0000-4000-8000-0000000000c1";
export const V2_TARGET_AGREEMENT_ID = "20000000-0000-4000-8000-0000000000c2";

/** 211자 — 문장 셋 */
export const V2_PASSAGE_TEXT =
  "Our school garden began as a small experiment. Three students planted beans behind the gym, and by June the vines had climbed higher than the fence. The project taught them that patience matters more than speed.";

/** 지문 하나 · 표적 둘(`inline_alternatives`) — 해설과 정답 확인의 상태가 표적마다 다르다 */
export function englishV2TwoTargetDocument(): EnglishV2Document {
  return {
    schemaVersion: 2,
    documentId: V2_DOCUMENT_ID,
    title: "학교 텃밭 — 표현 고르기",
    provenance: {
      kind: "user_supplied",
      declaredBy: USER_TEACHER_ID,
      declaredAt: "2026-10-02T09:00:00.000Z",
      basis: "시험용으로 직접 지은 지문",
    },
    rights: { rightsStatus: "unknown", allowedUses: [] },
    passages: [
      {
        passageId: V2_PASSAGE_ID,
        sourceRevision: 1,
        text: V2_PASSAGE_TEXT,
      },
    ],
    items: [
      {
        itemId: V2_ITEM_ID,
        passageId: V2_PASSAGE_ID,
        sourceRevision: 1,
        interactionType: "inline_alternatives",
        prompt: "글의 흐름에 맞게 각 자리에서 알맞은 표현을 고르시오.",
        targets: [
          {
            targetId: V2_TARGET_TENSE_ID,
            span: { start: 114, end: 125, quote: "had climbed" },
            alternatives: [
              { alternativeId: "a", text: "had climbed" },
              { alternativeId: "b", text: "has climbed" },
            ],
            answer: { alternativeId: "a" },
            answerVerification: { verified: false },
            evidence: [
              {
                start: 47,
                end: 148,
                quote:
                  "Three students planted beans behind the gym, and by June the vines had climbed higher than the fence.",
              },
            ],
            explanation: { status: "none" },
            skillTag: "어법",
          },
          {
            targetId: V2_TARGET_AGREEMENT_ID,
            span: { start: 187, end: 194, quote: "matters" },
            alternatives: [
              { alternativeId: "a", text: "matter" },
              { alternativeId: "b", text: "matters" },
            ],
            answer: { alternativeId: "b" },
            answerVerification: {
              verified: true,
              verifiedBy: {
                actorId: USER_TEACHER_ID,
                at: "2026-10-02T09:30:00.000Z",
              },
            },
            evidence: [],
            explanation: {
              status: "teacher_confirmed",
              text: "주어 patience 가 단수이므로 matters 가 맞다.",
              confirmedBy: {
                actorId: USER_TEACHER_ID,
                at: "2026-10-02T09:31:00.000Z",
              },
            },
            skillTag: null,
          },
        ],
      },
    ],
  };
}

export const V1_SET_ID = "21000000-0000-4000-8000-000000000001";
export const V1_EXAM_ID = "21000000-0000-4000-8000-0000000000e1";

/**
 * 1판 세트 — 옛 세트의 꼴 그대로: `meta` 는 null(만든 조건 없음 · 출처 미상), 상태는 «검토 완료»,
 * 서술형 해설에는 옛 프롬프트가 시킨 부분점수 문장이 남아 있다(고치지도 다시 분류하지도 않는다).
 */
export function englishV1LegacySet(): EnglishSet {
  return {
    id: V1_SET_ID,
    examId: V1_EXAM_ID,
    title: "학교 텃밭 세트",
    status: "검토 완료",
    source: "chatgpt",
    questionCount: 2,
    types: ["주제", "서술형"],
    revision: 3,
    createdAt: "2026-09-30T01:00:00.000Z",
    updatedAt: "2026-10-01T02:00:00.000Z",
    passage: V2_PASSAGE_TEXT,
    questions: [
      {
        type: "주제",
        prompt: "윗글의 주제로 가장 적절한 것은?",
        options: [
          "what a school garden taught three students",
          "how to choose seeds for a garden",
          "why fences are needed around a gym",
          "the history of school experiments",
          "the fastest way to grow beans",
        ],
        answer: "1",
        explanation:
          "정답은 ①. 텃밭 일이 가르쳐 준 것을 말하는 글이다. ②는 씨앗 고르기로 범위가 좁다.",
        evidence:
          "The project taught them that patience matters more than speed.",
      },
      {
        type: "서술형",
        prompt: "학생들이 텃밭에서 배운 점을 우리말 한 문장으로 쓰시오.",
        options: [],
        answer: "속도보다 인내가 더 중요하다.",
        explanation:
          "핵심어 사용 2점 · 조건 충족 2점 · 어법 오류 하나당 1점 감점",
        evidence:
          "The project taught them that patience matters more than speed.",
      },
    ],
    meta: null,
  };
}

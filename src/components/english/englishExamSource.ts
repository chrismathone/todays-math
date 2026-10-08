import type {
  ExamBuilderSource,
  ExamScope,
} from "@/components/exam-builder/types";
import {
  englishExamCandidatesResponseSchema,
  englishExamScopeResponseSchema,
} from "@/contracts/englishExamBuilder.contract";
import {
  englishQuestionBankReferenceSchema,
  englishQuestionBankResolveRequestSchema,
  englishQuestionBankResolveResponseSchema,
  type EnglishBankQuestion,
} from "@/contracts/englishQuestionBank.contract";
import { jsonInit, requestEnglish } from "./englishClient";

export async function resolveEnglishExam(
  items: EnglishBankQuestion[],
  signal?: AbortSignal,
) {
  const input = englishQuestionBankResolveRequestSchema.parse({
    items: items.map(({ setId, revision, questionIndex }) => ({
      setId,
      revision,
      questionIndex,
    })),
  });
  const result = await requestEnglish("/api/english/questions/resolve", {
    ...jsonInit("POST", input),
    signal,
  });
  return englishQuestionBankResolveResponseSchema.parse(result).data;
}

export function createEnglishExamSource(): ExamBuilderSource<EnglishBankQuestion> {
  return {
    async loadScopes(signal) {
      const scopes = new Map<string, ExamScope>();
      for (let page = 1; page <= 10_000; page++) {
        const body = await requestEnglish(
          `/api/english/questions/scopes?page=${page}`,
          { signal },
        );
        const data = englishExamScopeResponseSchema.parse(body).data;
        data.items.forEach((scope) => scopes.set(scope.id, scope));
        if (page * 100 >= data.total || !data.items.length) break;
      }
      return [...scopes.values()];
    },
    async list(request, signal) {
      if (!request.scopeIds.length) return { items: [], total: 0 };
      const exclude = request.excludeIds.map((key) => {
        const [setId, revision, questionIndex] = key.split(":");
        return englishQuestionBankReferenceSchema.parse({
          setId,
          revision: Number(revision),
          questionIndex: Number(questionIndex),
        });
      });
      const body = await requestEnglish("/api/english/questions/candidates", {
        ...jsonInit("POST", {
          scopeIds: request.scopeIds,
          difficulty: request.difficulty || undefined,
          query: request.query,
          page: request.page,
          pageSize: request.pageSize,
          exclude,
        }),
        signal,
      });
      return englishExamCandidatesResponseSchema.parse(body).data;
    },
    async compose(allocations, signal) {
      const body = await requestEnglish("/api/english/questions/compose", {
        ...jsonInit("POST", { allocations }),
        signal,
      });
      return englishQuestionBankResolveResponseSchema.parse(body).data;
    },
    info: (item) => ({
      id: item.key,
      scopeId: item.setId,
      scopeLabel: item.title,
      difficulty: item.difficulty ?? "미지정",
      detail: `${item.question.type} · 원본 ${item.questionIndex + 1}번 · ${item.status}`,
    }),
    prepareOutput: resolveEnglishExam,
  };
}

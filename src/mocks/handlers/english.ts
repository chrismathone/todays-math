/**
 * MSW 핸들러 — 오늘의 영어 (D-148 · 25 §3). 대응 계약: src/contracts/english.contract.ts
 * 대응 API 경로:
 *   GET/POST          /api/english/exams
 *   PATCH/DELETE      /api/english/exams/{id}
 *   GET/POST          /api/english/exams/{id}/materials
 *   GET/DELETE        /api/english/materials/{id}
 *   GET/POST          /api/english/exams/{id}/sets
 *   GET/PUT/DELETE    /api/english/sets/{id}
 *
 * 셸 트랙은 base 의 라우트가 워크트리에 없어도 화면 시험이 돌게 이 대역을 쓴다(공통 지시 §3).
 * ⚠️ 상태를 갖지 않는다(class.ts 와 같은 결) — POST/PATCH/DELETE 는 «반영됐다면 이런 모양»을 새로
 *    계산해 돌려주고 픽스처를 바꾸지 않는다. 화면은 응답으로 자기 상태를 고친다.
 * ⚠️ 표본 지문은 우리가 지은 짧은 글이다 — 교재·모의고사 지문을 붙이지 않는다(원장님 원칙).
 * 오류 코드는 계약(2de827cc3)대로 — 검증기 거절 422 ENGLISH_DRAFT_REJECTED(details.issues) · revision 불일치 409
 *    REVISION_MISMATCH · 파일 상한 초과 413 PAYLOAD_TOO_LARGE. 화면은 코드가 아니라 **상태 코드**로 판정한다.
 */
import { http, HttpResponse, type HttpHandler } from "msw";

import {
  ENGLISH_MATERIAL_MAX_BYTES,
  ENGLISH_MATERIAL_MAX_LABEL,
  englishExamCreateSchema,
  englishExamListResponseSchema,
  englishExamResponseSchema,
  englishExamUpdateSchema,
  englishMaterialListResponseSchema,
  englishMaterialReadResponseSchema,
  englishMaterialResponseSchema,
  englishMaterialTextCreateSchema,
  englishSetCreateSchema,
  englishSetListResponseSchema,
  englishSetResponseSchema,
  englishSetUpdateSchema,
  type EnglishExam,
  type EnglishMaterial,
  type EnglishQuestion,
  type EnglishSet,
  type EnglishSetSummary,
} from "@/contracts/english.contract";
import { deleteResponseSchema } from "@/contracts/common.contract";
import { makeCloze } from "@/lib/english/cloze";
import { validateEnglishDraft } from "@/lib/english/validate";

import { jsonError, jsonOk, notFoundError, validationError } from "./_helpers";

// ─────────────────────────────────────────────
// 픽스처 — 시험 둘 · 자료 둘 · 세트 둘 (전부 첫 시험에 딸림)
// ─────────────────────────────────────────────

const id = (domain: string, seq: number) =>
  `${domain}0000-0000-4000-8000-${seq.toString().padStart(12, "0")}`;

export const ENGLISH_EXAM_A_ID = id("7100", 1);
export const ENGLISH_EXAM_B_ID = id("7100", 2);
export const ENGLISH_MATERIAL_PDF_ID = id("7200", 1);
export const ENGLISH_MATERIAL_TEXT_ID = id("7200", 2);
export const ENGLISH_SET_DRAFT_ID = id("7300", 1);
export const ENGLISH_SET_DONE_ID = id("7300", 2);
/** 어느 픽스처에도 없는 세트 id — 딥링크 «찾을 수 없음» 시험용 */
export const ENGLISH_SET_MISSING_ID = id("7300", 99);

const T0 = "2026-09-30T01:00:00.000Z";
const T1 = "2026-09-30T02:30:00.000Z";

/** 우리가 지은 짧은 글 — 마을 학생들의 나무 심기 */
export const ENGLISH_MOCK_PASSAGE =
  "Every spring, the students of a small town plant trees along the river. " +
  "The project began ten years ago when a teacher noticed that the riverbank was losing its soil after heavy rain. " +
  "She asked her class to help, and the idea spread quickly to other schools. " +
  "Today the young forest protects the town from floods and gives shade to people who walk there in summer. " +
  "The students say the work is tiring, but they feel proud when they return years later and see how tall their trees have grown.";

export const ENGLISH_MOCK_EXAMS: EnglishExam[] = [
  {
    id: ENGLISH_EXAM_A_ID,
    school: "침산중학교",
    grade: "중3",
    title: "2학기 중간고사",
    examDate: "2026-10-14",
    types: ["주제", "내용 일치", "어법", "서술형"],
    materialCount: 2,
    setCount: 2,
    reviewedCount: 1,
    createdAt: T0,
    updatedAt: T1,
  },
  {
    id: ENGLISH_EXAM_B_ID,
    school: "경명여자중학교",
    grade: "중2",
    title: "2학기 기말고사",
    examDate: null,
    types: [],
    materialCount: 0,
    setCount: 0,
    reviewedCount: 0,
    createdAt: T0,
    updatedAt: T0,
  },
];

export const ENGLISH_MOCK_MATERIALS: EnglishMaterial[] = [
  {
    id: ENGLISH_MATERIAL_PDF_ID,
    examId: ENGLISH_EXAM_A_ID,
    name: "2025-2 중간 기출.pdf",
    mimeType: "application/pdf",
    size: 421_888,
    hasFile: true,
    content: null,
    createdAt: T0,
  },
  {
    id: ENGLISH_MATERIAL_TEXT_ID,
    examId: ENGLISH_EXAM_A_ID,
    name: "3과 외부지문 (텍스트)",
    mimeType: "text/plain",
    size: ENGLISH_MOCK_PASSAGE.length,
    hasFile: false,
    content: ENGLISH_MOCK_PASSAGE,
    createdAt: T1,
  },
];

const DRAFT_QUESTIONS: EnglishQuestion[] = [
  {
    type: "주제",
    prompt: "다음 글의 주제로 가장 적절한 것은?",
    options: [
      "강가에 나무를 심는 일의 어려움",
      "학생들의 나무 심기가 마을에 가져온 변화",
      "홍수를 막는 여러 가지 방법",
      "여름에 강가를 걷는 즐거움",
      "교사와 학생의 갈등",
    ],
    answer: "2",
    explanation:
      "학생들이 심은 나무가 자라 마을을 홍수에서 지키고 그늘을 준다는 변화가 글의 중심이다.",
    evidence:
      "Today the young forest protects the town from floods and gives shade to people who walk there in summer.",
  },
  {
    type: "내용 일치",
    prompt: "다음 글의 내용과 일치하는 것은?",
    options: [
      "나무 심기는 올해 처음 시작되었다.",
      "학생들은 여름마다 나무를 심는다.",
      "한 교사가 강둑의 흙이 쓸려 가는 것을 보고 일을 시작했다.",
      "다른 학교는 참여하지 않았다.",
      "학생들은 일이 쉽다고 말한다.",
    ],
    answer: "3",
    explanation:
      "폭우 뒤 강둑의 흙이 쓸려 가는 것을 본 교사가 시작했다고 했다.",
    evidence:
      "The project began ten years ago when a teacher noticed that the riverbank was losing its soil after heavy rain.",
  },
  {
    type: "서술형",
    prompt: "학생들이 자랑스러움을 느끼는 때를 우리말로 쓰시오.",
    options: [],
    answer: "몇 년 뒤 돌아와 자신들이 심은 나무가 얼마나 자랐는지 볼 때",
    explanation: "마지막 문장의 when 절을 우리말로 옮기면 정답으로 인정한다.",
    evidence:
      "they feel proud when they return years later and see how tall their trees have grown.",
  },
];

const clozeDraft = makeCloze(ENGLISH_MOCK_PASSAGE, 3, "원문 복원 연습");
if (!clozeDraft.ok) throw new Error(clozeDraft.message);

export const ENGLISH_MOCK_SETS: EnglishSet[] = [
  {
    id: ENGLISH_SET_DRAFT_ID,
    examId: ENGLISH_EXAM_A_ID,
    title: "협력의 가치 · 외부지문 기본 훈련",
    status: "초안",
    source: "chatgpt",
    questionCount: DRAFT_QUESTIONS.length,
    types: ["주제", "내용 일치", "서술형"],
    revision: 1,
    createdAt: T1,
    updatedAt: T1,
    passage: ENGLISH_MOCK_PASSAGE,
    questions: DRAFT_QUESTIONS,
  },
  {
    id: ENGLISH_SET_DONE_ID,
    examId: ENGLISH_EXAM_A_ID,
    title: "원문 복원 연습",
    status: "검토 완료",
    source: "cloze",
    questionCount: clozeDraft.draft.questions.length,
    types: ["원문 복원"],
    revision: 3,
    createdAt: T0,
    updatedAt: T0,
    passage: clozeDraft.draft.passage,
    questions: clozeDraft.draft.questions,
  },
];

export function englishSetSummaryOf(set: EnglishSet): EnglishSetSummary {
  const { passage: _passage, questions: _questions, ...summary } = set;
  void _passage;
  void _questions;
  return summary;
}

const typesOf = (questions: EnglishQuestion[]) => [
  ...new Set(questions.map((question) => question.type)),
];

const findExam = (examId: string) =>
  ENGLISH_MOCK_EXAMS.find((exam) => exam.id === examId);
const findSet = (setId: string) =>
  ENGLISH_MOCK_SETS.find((set) => set.id === setId);

const ACCEPTED_FILE = /\.(pdf|docx|txt|png|jpe?g)$/i;

export const englishHandlers: HttpHandler[] = [
  // GET /api/english/exams — 내 범위의 시험 목록
  http.get("/api/english/exams", () =>
    jsonOk(englishExamListResponseSchema, { data: ENGLISH_MOCK_EXAMS }),
  ),

  // POST /api/english/exams — 새 시험
  http.post("/api/english/exams", async ({ request }) => {
    const parsed = englishExamCreateSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const now = new Date().toISOString();
    return jsonOk(
      englishExamResponseSchema,
      {
        data: {
          id: crypto.randomUUID(),
          school: parsed.data.school,
          grade: parsed.data.grade,
          title: parsed.data.title,
          examDate: parsed.data.examDate ?? null,
          types: [],
          materialCount: 0,
          setCount: 0,
          reviewedCount: 0,
          createdAt: now,
          updatedAt: now,
        },
      },
      { status: 201 },
    );
  }),

  // PATCH /api/english/exams/{id}
  http.patch("/api/english/exams/:id", async ({ params, request }) => {
    const exam = findExam(String(params.id));
    if (!exam) return notFoundError("시험");
    const parsed = englishExamUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    return jsonOk(englishExamResponseSchema, {
      data: {
        ...exam,
        ...parsed.data,
        updatedAt: new Date().toISOString(),
      },
    });
  }),

  // DELETE /api/english/exams/{id}
  http.delete("/api/english/exams/:id", ({ params }) => {
    const exam = findExam(String(params.id));
    if (!exam) return notFoundError("시험");
    return jsonOk(deleteResponseSchema, { data: { id: exam.id } });
  }),

  // GET /api/english/exams/{id}/materials
  http.get("/api/english/exams/:id/materials", ({ params }) => {
    const exam = findExam(String(params.id));
    if (!exam) return notFoundError("시험");
    return jsonOk(englishMaterialListResponseSchema, {
      data: ENGLISH_MOCK_MATERIALS.filter(
        (material) => material.examId === exam.id,
      ),
    });
  }),

  // POST /api/english/exams/{id}/materials — JSON {name, content} 또는 multipart file
  http.post("/api/english/exams/:id/materials", async ({ params, request }) => {
    const exam = findExam(String(params.id));
    if (!exam) return notFoundError("시험");
    const now = new Date().toISOString();
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      // 실제 라우트는 받기 전에 content-length 로 먼저 자른다(25 §3) — 대역도 413 을 {error} 로 낸다.
      const length = Number(request.headers.get("content-length") ?? 0);
      if (length > ENGLISH_MATERIAL_MAX_BYTES)
        return jsonError(
          "PAYLOAD_TOO_LARGE",
          `${ENGLISH_MATERIAL_MAX_LABEL} 이하의 파일만 올릴 수 있습니다.`,
          413,
        );
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File))
        return jsonError("VALIDATION_ERROR", "파일이 없습니다.", 400);
      if (file.size > ENGLISH_MATERIAL_MAX_BYTES)
        return jsonError(
          "PAYLOAD_TOO_LARGE",
          `${ENGLISH_MATERIAL_MAX_LABEL} 이하의 파일만 올릴 수 있습니다.`,
          413,
        );
      if (!ACCEPTED_FILE.test(file.name))
        return jsonError(
          "VALIDATION_ERROR",
          "pdf · docx · txt · png · jpg 파일만 올릴 수 있습니다.",
          400,
        );
      const isText = /\.txt$/i.test(file.name);
      return jsonOk(
        englishMaterialResponseSchema,
        {
          data: {
            id: crypto.randomUUID(),
            examId: exam.id,
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
            hasFile: true,
            content: isText ? await file.text() : null,
            createdAt: now,
          },
        },
        { status: 201 },
      );
    }
    const parsed = englishMaterialTextCreateSchema.safeParse(
      await request.json(),
    );
    if (!parsed.success) return validationError(parsed.error);
    return jsonOk(
      englishMaterialResponseSchema,
      {
        data: {
          id: crypto.randomUUID(),
          examId: exam.id,
          name: parsed.data.name,
          mimeType: "text/plain",
          size: parsed.data.content.length,
          hasFile: false,
          content: parsed.data.content,
          createdAt: now,
        },
      },
      { status: 201 },
    );
  }),

  // GET /api/english/materials/{id} — 내려받기(JSON 아님)
  http.get("/api/english/materials/:id", ({ params }) => {
    const material = ENGLISH_MOCK_MATERIALS.find(
      (item) => item.id === String(params.id),
    );
    if (!material) return notFoundError("자료");
    return new HttpResponse(material.content ?? "%PDF-1.4 mock", {
      status: 200,
      headers: {
        "Content-Type": material.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(material.name)}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  }),

  // POST /api/english/materials/{id}/read — 사진 자료에서 읽은 글(저장하지 않는다 · D-158). 대역의 자료에는 사진이 없다 —
  // 사진이 아닌 자료는 400, 대역에 없는 id(방금 올린 사진)는 표본 글을 돌려준다
  http.post("/api/english/materials/:id/read", ({ params }) => {
    const material = ENGLISH_MOCK_MATERIALS.find(
      (item) => item.id === String(params.id),
    );
    if (material && !/^image\/(png|jpeg)$/.test(material.mimeType))
      return jsonError(
        "VALIDATION_ERROR",
        "사진 자료만 글을 읽을 수 있습니다.",
        400,
      );
    return jsonOk(englishMaterialReadResponseSchema, {
      data: { text: ENGLISH_MOCK_PASSAGE },
    });
  }),

  // DELETE /api/english/materials/{id}
  http.delete("/api/english/materials/:id", ({ params }) => {
    const material = ENGLISH_MOCK_MATERIALS.find(
      (item) => item.id === String(params.id),
    );
    if (!material) return notFoundError("자료");
    return jsonOk(deleteResponseSchema, { data: { id: material.id } });
  }),

  // GET /api/english/exams/{id}/sets — 세트 요약 목록
  http.get("/api/english/exams/:id/sets", ({ params }) => {
    const exam = findExam(String(params.id));
    if (!exam) return notFoundError("시험");
    return jsonOk(englishSetListResponseSchema, {
      data: ENGLISH_MOCK_SETS.filter((set) => set.examId === exam.id).map(
        englishSetSummaryOf,
      ),
    });
  }),

  // POST /api/english/exams/{id}/sets — 검증기 통과 · 항상 «초안»
  http.post("/api/english/exams/:id/sets", async ({ params, request }) => {
    const exam = findExam(String(params.id));
    if (!exam) return notFoundError("시험");
    const parsed = englishSetCreateSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const verdict = validateEnglishDraft(parsed.data);
    if (!verdict.ok)
      return jsonError(
        "ENGLISH_DRAFT_REJECTED",
        "초안이 검증 규칙에 걸렸습니다.",
        422,
        { issues: verdict.issues },
      );
    const now = new Date().toISOString();
    return jsonOk(
      englishSetResponseSchema,
      {
        data: {
          id: crypto.randomUUID(),
          examId: exam.id,
          title: parsed.data.title,
          status: "초안",
          source: parsed.data.source,
          questionCount: parsed.data.questions.length,
          types: typesOf(parsed.data.questions),
          revision: 1,
          createdAt: now,
          updatedAt: now,
          passage: parsed.data.passage,
          questions: parsed.data.questions,
        },
      },
      { status: 201 },
    );
  }),

  // GET /api/english/sets/{id}
  http.get("/api/english/sets/:id", ({ params }) => {
    const set = findSet(String(params.id));
    if (!set) return notFoundError("문제 세트");
    return jsonOk(englishSetResponseSchema, { data: set });
  }),

  // PUT /api/english/sets/{id} — revision CAS
  http.put("/api/english/sets/:id", async ({ params, request }) => {
    const set = findSet(String(params.id));
    if (!set) return notFoundError("문제 세트");
    const parsed = englishSetUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    if (parsed.data.revision !== set.revision)
      return jsonError(
        "REVISION_MISMATCH",
        "다른 곳에서 먼저 저장됐습니다. 다시 불러온 뒤 고쳐 주세요.",
        409,
      );
    const verdict = validateEnglishDraft({
      title: parsed.data.title,
      source: set.source,
      passage: parsed.data.passage,
      questions: parsed.data.questions,
    });
    if (!verdict.ok)
      return jsonError(
        "ENGLISH_DRAFT_REJECTED",
        "문항이 검증 규칙에 걸렸습니다.",
        422,
        { issues: verdict.issues },
      );
    return jsonOk(englishSetResponseSchema, {
      data: {
        ...set,
        title: parsed.data.title,
        status: parsed.data.status,
        passage: parsed.data.passage,
        questions: parsed.data.questions,
        questionCount: parsed.data.questions.length,
        types: typesOf(parsed.data.questions),
        revision: set.revision + 1,
        updatedAt: new Date().toISOString(),
      },
    });
  }),

  // DELETE /api/english/sets/{id}
  http.delete("/api/english/sets/:id", ({ params }) => {
    const set = findSet(String(params.id));
    if (!set) return notFoundError("문제 세트");
    return jsonOk(deleteResponseSchema, { data: { id: set.id } });
  }),
];

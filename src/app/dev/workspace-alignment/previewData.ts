import type { EnglishExam, EnglishSet } from "@/contracts/english.contract";
import type { EnglishListeningDocument } from "@/contracts/englishListening.contract";
import type { EnglishPassageDetail } from "@/contracts/englishBank.contract";
import { DEFAULT_PRINT_OPTIONS } from "@/components/unified/print/types";
import {
  englishExamCandidatesSchema,
  englishExamComposeSchema,
} from "@/contracts/englishExamBuilder.contract";
import {
  ARITHMETIC_MAX_ITEMS_PER_ROUND,
  ARITHMETIC_MAX_ITEMS_TOTAL,
  ARITHMETIC_MAX_ROUNDS,
} from "@/contracts/arithmetic.contract";
import type { ArithmeticSheetPayload } from "@/contracts/arithmeticSheet.contract";
import type { ArithmeticV2SheetPayload } from "@/contracts/arithmeticV2.contract";

// Authored examples for visual review; never copied from an exam or user account.
const stamp = "2026-10-08T00:00:00.000Z";
const libraryDrafts = ["review", "output"].map((step, index) => ({
  id: `preview-draft-${index + 1}`,
  ownerId: "workspace-preview",
  isOwner: true,
  kind: "draft",
  title: index ? "중1 문자와 식 확인 학습지" : "초3 덧셈 기초 다지기",
  problemCount: 1,
  revision: 1,
  createdAt: stamp,
  updatedAt: stamp,
  workflow: { source: "bank", step },
  payload: {
    version: 1,
    title: index ? "중1 문자와 식 확인 학습지" : "초3 덧셈 기초 다지기",
    columns: 2,
    answers: false,
    problems: [
      {
        id: `preview-question-${index}`,
        content: index ? "$2x+3x$를 간단히 하세요." : "$123+234$를 계산하세요.",
        answer: index ? "$5x$" : "357",
        solution: "",
        grade: index ? "중1" : "초3",
        chapter: "",
        section: "",
        difficulty: "",
        problemCode: "",
        figureUrls: [],
        figureSvg: null,
        figureDims: [],
        figureSourceMm: [],
      },
    ],
    printOptions: DEFAULT_PRINT_OPTIONS,
    printMeta: {
      title: "",
      subject: "수학",
      schoolName: "한빛학원",
      grade: index ? "중1" : "초3",
    },
    workflow: { source: "bank", step },
  },
}));
// 종류 넷이 다 보이게 — 추출 자료 둘(작업 중 하나 · 기록 없음 하나)과 개념 백지 하나(2026-10-16 외부 검토 §3 의 5건).
const libraryExtras = [
  {
    id: "preview-extraction-1",
    ownerId: "workspace-preview",
    isOwner: true,
    kind: "extraction",
    title: "2학기 기말 기출 추출",
    problemCount: 6,
    revision: 1,
    createdAt: stamp,
    updatedAt: "2026-10-07T00:00:00.000Z",
    workflow: { source: "extraction", step: "crop" },
    payload: { data: { step: "crop", sources: [], crops: [] }, assets: {} },
  },
  {
    id: "preview-extraction-2",
    ownerId: "workspace-preview",
    isOwner: true,
    kind: "extraction",
    title: "단원 평가 스캔본",
    problemCount: 10,
    revision: 1,
    createdAt: stamp,
    updatedAt: "2026-10-06T00:00:00.000Z",
    payload: { data: { step: "review", sources: [], crops: [] }, assets: {} },
  },
  {
    id: "preview-blank-1",
    ownerId: "workspace-preview",
    isOwner: true,
    kind: "conceptBlank",
    title: "삼각형의 합동 개념 백지",
    problemCount: 24,
    revision: 1,
    createdAt: stamp,
    updatedAt: "2026-10-05T00:00:00.000Z",
    payload: { version: 1 },
  },
];
const libraryDocuments = [...libraryDrafts, ...libraryExtras];
const exam: EnglishExam = {
  id: "30000000-0000-4000-8000-000000000002",
  school: "한빛중학교",
  grade: "중3",
  title: "2학기 중간고사",
  examDate: null,
  types: ["주제", "내용 일치", "어법"],
  materialCount: 1,
  setCount: 2,
  reviewedCount: 1,
  createdAt: stamp,
  updatedAt: stamp,
};
const passage =
  "Our school opened a reading room last spring. Students meet there after class to share books. Mina brought a story about a small town library. After reading it, the group decided to build a shelf where anyone could leave a book for a friend.";
const set: EnglishSet = {
  id: "30000000-0000-4000-8000-000000000001",
  examId: exam.id,
  title: "함께 읽는 즐거움",
  status: "검토 완료",
  source: "manual",
  questionCount: 2,
  types: ["주제", "서술형"],
  revision: 1,
  createdAt: stamp,
  updatedAt: stamp,
  passage,
  questions: [
    {
      type: "주제",
      prompt: "다음 글의 주제로 가장 적절한 것을 고르시오.",
      options: [
        "sharing books with friends",
        "building a new school",
        "learning to draw",
        "traveling to a town",
        "planning a sports day",
      ],
      answer: "1",
      explanation: "학생들이 책을 읽고 친구와 나누는 활동을 설명합니다.",
      evidence: "a shelf where anyone could leave a book for a friend",
    },
    {
      type: "서술형",
      prompt: "학생들이 책을 읽은 뒤 하기로 한 일을 우리말로 쓰시오.",
      options: [],
      answer: "누구나 친구를 위해 책을 놓아둘 수 있는 책장을 만들기로 했다.",
      explanation: "마지막 문장에서 모임의 결정을 확인합니다.",
      evidence: "the group decided to build a shelf",
    },
  ],
};
const sets: EnglishSet[] = [
  set,
  {
    ...set,
    id: "30000000-0000-4000-8000-000000000003",
    title: "학교 텃밭에서 배우는 것 — 확인 문제",
    status: "초안",
  },
];
const summaries = sets.map((item) => ({
  id: item.id,
  examId: item.examId,
  title: item.title,
  status: item.status,
  source: item.source,
  questionCount: item.questionCount,
  types: item.types,
  revision: item.revision,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
}));
const questions = sets.flatMap((item) =>
  item.questions.map((question, questionIndex) => ({
    key: `${item.id}:${item.revision}:${questionIndex}`,
    setId: item.id,
    revision: item.revision,
    questionIndex,
    examId: exam.id,
    school: exam.school,
    grade: exam.grade,
    examTitle: exam.title,
    title: item.title,
    status: item.status,
    source: item.source,
    passage: item.passage,
    question,
    difficulty: null,
    updatedAt: stamp,
  })),
);

export async function previewFetch(
  url: URL,
  init?: RequestInit,
  listeningDocument?: EnglishListeningDocument,
): Promise<Response> {
  const path = url.pathname;
  const method = init?.method?.toUpperCase() ?? "GET";
  const json = (value: unknown, status = 200) =>
    Response.json(value, { status });
  // The workspace has a fixture storage scope, so arithmetic uses its normal
  // catalog gate. Run its deterministic engine locally, never an account API.
  const arithmetic =
    /^\/api\/arithmetic\/(v2\/)?(catalog|generate|regenerate)$/.exec(path);
  if (arithmetic && method === (arithmetic[2] === "catalog" ? "GET" : "POST")) {
    const v2 = Boolean(arithmetic[1]);
    try {
      if (arithmetic[2] === "regenerate") {
        const {
          arithmeticRegenerationRequestSchema,
          regenerateArithmeticItems,
          regenerateArithmeticV2Items,
        } = await import("@/lib/arithmeticRegeneration");
        const { sheet, target, seed } =
          arithmeticRegenerationRequestSchema.parse(
            JSON.parse(String(init?.body)),
          );
        return json({
          data: v2
            ? regenerateArithmeticV2Items(
                sheet as ArithmeticV2SheetPayload,
                target,
                seed,
              )
            : regenerateArithmeticItems(
                sheet as ArithmeticSheetPayload,
                target,
                seed,
              ),
        });
      }
      const limits = {
        itemsPerRound: ARITHMETIC_MAX_ITEMS_PER_ROUND,
        itemsTotal: ARITHMETIC_MAX_ITEMS_TOTAL,
        rounds: ARITHMETIC_MAX_ROUNDS,
      };
      if (v2) {
        const engine = await import("@/lib/arithmetic-v2");
        return json({
          data:
            arithmetic[2] === "catalog"
              ? {
                  engineVersion: engine.ARITHMETIC_V2_ENGINE_VERSION,
                  catalogVersion: engine.ARITHMETIC_V2_CATALOG_VERSION,
                  types: engine.listArithmeticV2Types(),
                  limits,
                  writerEnabled: false,
                }
              : engine.buildArithmeticV2Sheet(JSON.parse(String(init?.body))),
        });
      }
      const engine = await import("@/lib/arithmetic");
      return json({
        data:
          arithmetic[2] === "catalog"
            ? {
                engineVersion: engine.ARITHMETIC_ENGINE_VERSION,
                catalogVersion: engine.ARITHMETIC_CATALOG_VERSION,
                skills: engine.listArithmeticSkills(),
                limits,
                writerEnabled: false,
              }
            : engine.buildArithmeticSheet(JSON.parse(String(init?.body))),
      });
    } catch (error) {
      return json(
        {
          error: {
            message:
              error instanceof Error
                ? error.message
                : "연산 조건을 확인해 주세요.",
          },
        },
        400,
      );
    }
  }
  if (method === "GET" && path === "/api/library/documents") {
    const kind = url.searchParams.get("kind");
    const docs = libraryDocuments.filter((item) => !kind || item.kind === kind);
    return json({
      data: docs.map(({ payload, ...summary }) => {
        void payload;
        return summary;
      }),
      meta: { total: docs.length },
    });
  }
  if (method === "GET" && path.startsWith("/api/library/documents/")) {
    const doc = libraryDocuments.find((item) => path.endsWith(`/${item.id}`));
    return doc
      ? json({ data: doc })
      : json({ error: { message: "예시 자료가 없습니다." } }, 404);
  }
  if (method === "GET" && path === "/api/english/questions/scopes") {
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const scopes = sets.map((item) => ({
      id: item.id,
      label: item.title,
      group: exam.grade,
      detail: `${exam.school} · ${exam.title}`,
      count: item.questions.length,
    }));
    return json({
      data: {
        items: scopes.slice((page - 1) * 100, page * 100),
        total: scopes.length,
      },
    });
  }
  if (method === "POST" && path === "/api/english/questions/compose") {
    const parsed = englishExamComposeSchema.safeParse(
      JSON.parse(String(init?.body)),
    );
    if (!parsed.success)
      return json({ error: { message: "출제 범위를 확인해 주세요." } }, 400);
    const items = parsed.data.allocations.flatMap(({ scopeId, count }) =>
      questions.filter((q) => q.setId === scopeId).slice(0, count),
    );
    if (
      items.length !==
      parsed.data.allocations.reduce((sum, row) => sum + row.count, 0)
    )
      return json(
        { error: { message: "해당 범위의 문항이 부족합니다." } },
        404,
      );
    return json({ data: items });
  }
  if (method === "POST" && path === "/api/english/questions/candidates") {
    const parsed = englishExamCandidatesSchema.safeParse(
      JSON.parse(String(init?.body)),
    );
    if (!parsed.success)
      return json(
        { error: { message: "문항 검색 조건을 확인해 주세요." } },
        400,
      );
    const input = parsed.data;
    const items = questions.filter(
      (q) =>
        input.scopeIds.includes(q.setId) &&
        (!input.difficulty ||
          input.difficulty === (q.difficulty ?? "미지정")) &&
        `${q.title} ${q.passage} ${q.question.prompt} ${q.question.options.join(" ")}`
          .toLocaleLowerCase()
          .includes(input.query.toLocaleLowerCase()) &&
        !input.exclude.some(
          (ref) =>
            ref.setId === q.setId && ref.questionIndex === q.questionIndex,
        ),
    );
    return json({
      data: {
        items: items.slice(
          (input.page - 1) * input.pageSize,
          input.page * input.pageSize,
        ),
        total: items.length,
      },
    });
  }
  if (method === "POST" && path === "/api/english/questions/resolve") {
    const body = JSON.parse(String(init?.body)) as {
      items: { setId: string; revision: number; questionIndex: number }[];
    };
    return json({
      data: body.items.flatMap((ref) =>
        questions.filter(
          (q) => q.key === `${ref.setId}:${ref.revision}:${ref.questionIndex}`,
        ),
      ),
    });
  }
  if (method !== "GET")
    return json(
      { error: { message: "미리보기에서는 저장하거나 제작하지 않습니다." } },
      403,
    );
  if (path === "/api/account/access") return json({});
  if (path === "/api/auth/session") return json(null);
  if (path === "/api/english/exams") return json({ data: [exam] });
  if (path.endsWith(`/exams/${exam.id}/materials`))
    return json({
      data: [
        {
          id: "30000000-0000-4000-8000-000000000004",
          examId: exam.id,
          name: "읽기 수업 지문",
          mimeType: "text/plain",
          size: passage.length,
          hasFile: false,
          content: passage,
          createdAt: stamp,
        },
      ],
    });
  if (path.endsWith(`/exams/${exam.id}/sets`)) return json({ data: summaries });
  if (path === "/api/english/questions") {
    const items = questions.filter(
      (q) =>
        (!url.searchParams.get("q") ||
          `${q.title} ${q.question.prompt}`.includes(
            url.searchParams.get("q")!,
          )) &&
        (!url.searchParams.get("type") ||
          q.question.type === url.searchParams.get("type")) &&
        (!url.searchParams.get("status") ||
          q.status === url.searchParams.get("status")) &&
        (!url.searchParams.get("grade") ||
          q.grade === url.searchParams.get("grade")),
    );
    return json({
      data: { items, total: items.length, page: 1, pageSize: 20 },
    });
  }
  const selected = sets.find((item) => path === `/api/english/sets/${item.id}`);
  if (selected) return json({ data: selected });
  if (path === "/api/english/passages") {
    const { text, importedFrom, usages, ...summary } = bankPassage;
    void text;
    void importedFrom;
    void usages;
    return json({
      data: url.searchParams.get("q") ? [] : [summary],
      meta: { nextCursor: null },
    });
  }
  if (path === `/api/english/passages/${bankPassage.id}`)
    return json({ data: bankPassage });
  if (listeningDocument) {
    const summary = {
      id: listeningDocument.id,
      revision: listeningDocument.revision,
      title: listeningDocument.title,
      level: listeningDocument.level,
      groupCount: listeningDocument.groups.length,
      publicationCount: 0,
      updatedAt: stamp,
    };
    if (path === "/api/english/listening/sets")
      return json({ data: [summary] });
    if (path === "/api/english/listening/bank")
      return json({ data: [summary], meta: { nextCursor: null } });
    if (path === `/api/english/listening/sets/${listeningDocument.id}`)
      return json({
        data: {
          id: listeningDocument.id,
          revision: listeningDocument.revision,
          document: listeningDocument,
          publications: [],
          mediaUrlsByAssetId: {},
        },
      });
    if (
      path ===
      `/api/english/listening/sets/${listeningDocument.id}/compose-source`
    )
      return json({
        data: {
          detail: {
            id: listeningDocument.id,
            revision: listeningDocument.revision,
            document: listeningDocument,
            publications: [],
            mediaUrlsByAssetId: {},
          },
          documentHash: "a".repeat(64),
        },
      });
  }
  if (
    path === "/api/english/listening/sets" ||
    path === "/api/english/listening/assignments" ||
    path === "/api/english/listening/classes"
  )
    return json({ data: [] });
  return json({ error: { message: "이 화면의 예시 데이터가 없습니다." } }, 503);
}

const bankPassage: EnglishPassageDetail = {
  id: "30000000-0000-4000-8000-000000000005",
  title: "함께 읽는 즐거움",
  grade: "중3",
  source: { label: "화면 검증용 자체 작성 지문", url: null },
  revision: 1,
  textRevision: 1,
  textLength: passage.length,
  snapshotHash: "a".repeat(64),
  rights: {
    status: "unconfirmed",
    basis: "",
    allowedUses: [],
    confirmedBy: null,
    confirmedAt: null,
  },
  archivedAt: null,
  createdAt: stamp,
  updatedAt: stamp,
  text: passage,
  importedFrom: null,
  usages: [],
};

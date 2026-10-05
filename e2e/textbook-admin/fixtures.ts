import type { Page, Route } from "@playwright/test";

/**
 * 합성 교재 서버 — 브라우저의 `/api/textbook/**` 요청을 가로채 메모리 안의 상태로 답한다.
 * 실제 서버 · DB · 인증은 닿지 않는다. 응답은 제품 클라이언트가 strict 계약으로 다시 검증한다 —
 * 모양이 틀리면 화면이 «교재 응답을 읽지 못했습니다»를 내고 시험이 실패한다.
 * 이름 · 문장은 전부 지어낸 것이다.
 */
export const ORIGIN = "http://127.0.0.1:4322";
export const HARNESS = "/e2e/textbook-admin/index.html";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const ids = {
  book: id(1),
  edition: id(2),
  owner: id(3),
  sectionA: id(11),
  sectionB: id(12),
};

type Block =
  | { blockId: string; kind: "text"; markdown: string }
  | { blockId: string; kind: "concept"; conceptKey: string };

interface SectionState {
  id: string;
  unitKey: string;
  sectionKey: string;
  title: string;
  templateKey: string;
  startPolicy: "even-left" | "continue";
  blocks: Block[];
  teacherAnswer?: string;
  revision: number;
}

export interface Seen {
  method: string;
  path: string;
  body: Record<string, unknown> | null;
}

export interface TextbookWorld {
  sections: Map<string, SectionState>;
  concepts: Map<string, { concept: Record<string, unknown>; revision: number }>;
  status: "draft" | "published";
  aggregateRevision: number;
  requests: Seen[];
  unexpected: string[];
  /** 다음 구획 저장 n번을 409 로 거절한다 */
  rejectSectionSaves: number;
  /** 판본 읽기 n번을 503 으로 실패시킨다 */
  failEditionReads: number;
  /** 구획 저장을 이 약속이 풀릴 때까지 붙잡는다 */
  holdSectionSave: Promise<void> | null;
  count(method: string, pathEnd: string): number;
  last(method: string, pathEnd: string): Seen | undefined;
}

const NOW = "2026-10-04T00:00:00.000Z";

const config = () => ({
  bookId: ids.book,
  schoolLevel: "elementary",
  grade: 5,
  semester: 2,
  volume: 1,
  volumeCount: 1,
  displayCode: "5-2-1",
  title: "합성 검증 교재",
  curriculumVersion: "2022",
  mode: "integrated",
  pageBudget: { target: 32, tolerance: 8, strict: false },
  print: {
    paper: "A4",
    innerMarginMm: 18,
    outerMarginMm: 16,
    sectionStart: "even-left",
    coverMode: "separate",
    firstPhysicalPageIndex: 1,
  },
  videoPolicy: "optional",
});

const sectionOf = (state: SectionState) => ({
  sectionKey: state.sectionKey,
  title: state.title,
  templateKey: state.templateKey,
  startPolicy: state.startPolicy,
  blocks: state.blocks,
  ...(state.teacherAnswer === undefined
    ? {}
    : { teacherAnswer: state.teacherAnswer }),
});

const recordOf = (state: SectionState) => ({
  id: state.id,
  unitKey: state.unitKey,
  revision: state.revision,
  section: sectionOf(state),
  updatedAt: NOW,
});

function newWorld(): TextbookWorld {
  const sections = new Map<string, SectionState>([
    [
      ids.sectionA,
      {
        id: ids.sectionA,
        unitKey: "unit-1",
        sectionKey: "intro",
        title: "도입",
        templateKey: "basic",
        startPolicy: "even-left",
        blocks: [
          { blockId: "block-a1", kind: "text", markdown: "저장된 문장" },
        ],
        revision: 3,
      },
    ],
    [
      ids.sectionB,
      {
        id: ids.sectionB,
        unitKey: "unit-1",
        sectionKey: "practice",
        title: "연습",
        templateKey: "basic",
        startPolicy: "continue",
        blocks: [
          { blockId: "block-b1", kind: "text", markdown: "연습 구획의 글" },
        ],
        revision: 1,
      },
    ],
  ]);
  const world: TextbookWorld = {
    sections,
    concepts: new Map(),
    status: "draft",
    aggregateRevision: 9,
    requests: [],
    unexpected: [],
    rejectSectionSaves: 0,
    failEditionReads: 0,
    holdSectionSave: null,
    count: (method, pathEnd) =>
      world.requests.filter(
        (seen) => seen.method === method && seen.path.endsWith(pathEnd),
      ).length,
    last: (method, pathEnd) =>
      world.requests
        .filter((seen) => seen.method === method && seen.path.endsWith(pathEnd))
        .at(-1),
  };
  return world;
}

const bookOf = (world: TextbookWorld) => ({
  id: ids.book,
  ownerId: ids.owner,
  ownerName: "합성 교사",
  isOwner: true,
  title: "합성 검증 교재",
  visibility: "private",
  sharedBranchId: null,
  archivedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
  draftEditionId: world.status === "draft" ? ids.edition : null,
  latestPublishedEditionId: world.status === "published" ? ids.edition : null,
});

const editionOf = (world: TextbookWorld) => ({
  editionId: ids.edition,
  label: "1",
  status: world.status,
  revision: world.aggregateRevision,
  publishedAt: world.status === "published" ? NOW : null,
  manifestHash: null,
});

const outlineOf = (world: TextbookWorld) => [
  {
    unitKey: "unit-1",
    title: "약수와 배수",
    sourceUnitIds: [],
    prerequisites: [],
    goals: [],
    conceptLectureRefs: [],
    sections: [...world.sections.values()].map((state) => ({
      id: state.id,
      sectionKey: state.sectionKey,
      title: state.title,
      revision: state.revision,
    })),
  },
];

const detailOf = (world: TextbookWorld) => ({
  book: bookOf(world),
  edition: editionOf(world),
  structureRevision: 3,
  config: config(),
  outline: outlineOf(world),
  issues: [],
});

function exchangeOf(world: TextbookWorld) {
  const placed = new Map<string, string>();
  for (const state of world.sections.values())
    for (const block of state.blocks)
      if (block.kind === "concept") placed.set(block.conceptKey, state.sectionKey);
  const concepts = [...world.concepts.values()].map((row) => ({
    ...row.concept,
    sectionKey: placed.get(String(row.concept.conceptKey)) ?? null,
  }));
  return {
    schemaVersion: "injaewon.textbook.exchange.v1",
    exportedAt: NOW,
    config: config(),
    edition: editionOf(world),
    units: [
      {
        unitKey: "unit-1",
        title: "약수와 배수",
        sourceUnitIds: [],
        prerequisites: [],
        goals: [],
        conceptLectureRefs: [],
        sections: [...world.sections.values()].map(sectionOf),
      },
    ],
    snapshots: [],
    items: [],
    assets: [],
    qrTargets: [],
    videoBindings: [],
    pageMap: [],
    rendererVersion: "synthetic.renderer.v1",
    templateVersion: "synthetic.template.v1",
    ...(concepts.length > 0
      ? {
          conceptIntegration: {
            version: "injaewon.textbook.concepts.v1",
            concepts,
          },
        }
      : {}),
  };
}

const jobOf = (world: TextbookWorld, requestId: string, status: string) => ({
  requestId,
  editionId: ids.edition,
  expectedRevision: world.aggregateRevision,
  status,
  completedSteps: 1,
  totalSteps: 1,
  issues: [],
  artifacts: [],
  manifestHash: null,
  replayed: false,
});

/** 가로채기를 건다. 다른 출처 · 모르는 API 는 실패로 적고 끊는다 */
export async function installTextbookApi(page: Page, origin = ORIGIN): Promise<TextbookWorld> {
  const world = newWorld();
  const json = (route: Route, data: unknown, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  const refuse = (route: Route, status: number, message: string, details = {}) =>
    json(route, { error: { code: "ERROR", message, details } }, status);

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) {
      world.unexpected.push(url.href);
      return route.abort();
    }
    if (!url.pathname.startsWith("/api/")) return route.continue();
    const method = request.method();
    const path = url.pathname;
    const body =
      method === "GET" ? null : (request.postDataJSON() as Seen["body"]);
    world.requests.push({ method, path, body });
    const base = `/api/textbook/editions/${ids.edition}`;

    if (method === "GET" && path === "/api/textbook/books")
      return json(route, { data: [bookOf(world)] });
    if (method === "GET" && path === "/api/textbook/quick-create")
      return json(route, { units: [] });
    if (method === "GET" && path === base) {
      if (world.failEditionReads > 0) {
        world.failEditionReads -= 1;
        return refuse(route, 503, "판본을 읽지 못했습니다.");
      }
      return json(route, { data: detailOf(world) });
    }
    if (method === "GET" && path === `${base}/export`)
      return json(route, { data: exchangeOf(world) });
    if (method === "GET" && path === `${base}/assignments`)
      return json(route, { data: [] });
    if (method === "GET" && path === "/api/textbook/videos")
      return json(route, { data: { videos: [], bindings: [] } });
    if (method === "GET" && path === "/api/classes")
      return json(route, {
        data: [],
        meta: { page: 1, pageSize: 100, total: 0 },
      });

    const section = path.startsWith(`${base}/sections/`)
      ? world.sections.get(path.slice(`${base}/sections/`.length))
      : undefined;
    if (section && method === "GET")
      return json(route, { data: recordOf(section) });
    if (section && method === "PUT" && body) {
      if (world.holdSectionSave) await world.holdSectionSave;
      if (world.status !== "draft")
        return refuse(route, 409, "발행한 판본은 고칠 수 없습니다.");
      if (world.rejectSectionSaves > 0) {
        world.rejectSectionSaves -= 1;
        return refuse(route, 409, "다른 곳에서 구획을 고쳤습니다.", {
          serverRevision: section.revision,
          serverSection: recordOf(section),
        });
      }
      if (body.expectedRevision !== section.revision)
        return refuse(route, 409, "구획이 그사이 바뀌었습니다.", {
          serverRevision: section.revision,
          serverSection: recordOf(section),
        });
      const next = body.section as Omit<SectionState, "id" | "revision">;
      section.title = next.title;
      section.templateKey = next.templateKey;
      section.startPolicy = next.startPolicy;
      section.blocks = next.blocks;
      if (next.teacherAnswer === undefined) delete section.teacherAnswer;
      else section.teacherAnswer = next.teacherAnswer;
      section.revision += 1;
      world.aggregateRevision += 1;
      return json(route, {
        data: {
          section: recordOf(section),
          aggregateRevision: world.aggregateRevision,
          replayed: false,
        },
      });
    }

    if (path.startsWith(`${base}/concepts/`)) {
      const key = decodeURIComponent(path.slice(`${base}/concepts/`.length));
      if (method === "PUT" && body) {
        const revision = (world.concepts.get(key)?.revision ?? 0) + 1;
        world.concepts.set(key, {
          concept: body.concept as Record<string, unknown>,
          revision,
        });
        world.aggregateRevision += 1;
        return json(route, {
          data: {
            concept: body.concept,
            revision,
            aggregateRevision: world.aggregateRevision,
          },
        });
      }
      const row = world.concepts.get(key);
      if (method === "GET" && row)
        return json(route, {
          data: {
            concept: row.concept,
            revision: row.revision,
            aggregateRevision: world.aggregateRevision,
          },
        });
    }

    if (method === "POST" && path === `${base}/publish/reserve` && body)
      return json(route, {
        data: jobOf(world, String(body.requestId), "ready"),
      });
    if (method === "POST" && path === `${base}/publish/finalize` && body) {
      world.status = "published";
      return json(route, {
        data: jobOf(world, String(body.requestId), "published"),
      });
    }

    world.unexpected.push(`${method} ${path}`);
    return refuse(route, 404, "합성 서버가 모르는 요청입니다.");
  });
  return world;
}

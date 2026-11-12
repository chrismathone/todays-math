import { Blob as NodeBlob } from "node:buffer";
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createWorkspaceDraftStore,
  DRAFT_STORE_KEY,
} from "@/components/unified/draftStore";
import { createPrivateDraftStore } from "@/components/unified/privateDraftStore";
import { PrivateCloudClient } from "@/components/unified/privateCloudClient";
import { studioProblem } from "@/components/unified/studioHelpers";
import type { StudioProblem } from "@/components/unified/types";
import { privateServer } from "../fixtures/privateCloud";

/**
 * 뺀 기억을 시험지와 같이 저장한다 — 원장님 2026-09-21 확정(트랙 44 여쭐 것 3 → 트랙 47).
 *
 * 전에는 뺀 기억이 화면 상태에만 있어, 새로 고치면 ④ 에서 뺀 작업실 문항이 «N문항 담기»·«담고 내보내기»에
 * 다시 잡혔다. 이제 시험지 초안의 `removed` 칸에 싣는다.
 *
 * - 옛 저장본(칸 없음)은 그대로 열린다 — 빈 기억으로.
 * - 뺀 문항은 담은 목록에서 **옮겨** 온 것이다 — 그림 data URL 이 두 벌이 되지 않는다.
 * - 이 판 전 배포본의 창이 칸을 떨구고 저장해도 «다른 창의 변경»으로 읽지 않는다.
 */

const shot = (id: string, page: number) =>
  studioProblem({
    id,
    sourceId: "s1",
    sourceLabel: "원본.pdf",
    page,
    rect: { x: 0.1, y: 0.1, width: 0.8, height: 0.2 },
    // 문항마다 다른 그림 — 셀 때 다른 문항의 그림이 섞이지 않게.
    image: `data:image/png;base64,${Buffer.from(`crop-image-${id}`).toString("base64")}`,
    content: "",
    answer: "",
    solution: "",
    level: "secondary",
    grade: "중2",
    mode: "image",
  });

const bank = (id: string): StudioProblem => ({
  id,
  content: "은행 문항",
  answer: "",
  solution: "",
  grade: "중1",
  chapter: "일차방정식",
  section: "일차방정식의 활용",
  difficulty: "중",
  problemCode: "B-1",
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
});

function memory() {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  return {
    values,
    raw: () => values.get(DRAFT_STORE_KEY)!,
    create: () => createWorkspaceDraftStore(() => storage),
  };
}

/** ④ 에서 한 문항을 뺀 것과 같은 두 걸음 — `UnifiedWorkspace.toggle`. 브라우저·계정 저장소 둘 다. */
function removeAt(
  store: Pick<
    ReturnType<typeof createWorkspaceDraftStore>,
    "getSnapshot" | "setRemoved" | "setProblems"
  >,
  index: number,
) {
  const target = store.getSnapshot().draft.problems[index];
  store.setRemoved((items) => [...items, { problem: target, index }]);
  store.setProblems((items) => items.filter((item) => item.id !== target.id));
  return target;
}

const count = (text: string, part: string) => text.split(part).length - 1;

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("뺀 기억은 시험지와 같이 저장된다", () => {
  it("쪽 제외로 보관한 문항은 저장 왕복에도 자동 복원 이유와 원래 자리를 보존한다", () => {
    const { create } = memory();
    const store = create();
    store.hydrate();
    store.importDraft({
      version: 1,
      title: "쪽 제외",
      problems: [shot("b", 2)],
      removed: [{ problem: shot("a", 1), index: 0, pageExcluded: true }],
    });
    expect(store.saveNow()).toBe(true);
    const reload = create();
    reload.hydrate();
    expect(reload.getSnapshot().draft.removed[0]).toMatchObject({
      index: 0,
      pageExcluded: true,
      problem: { id: "a" },
    });
    expect(reload.getSnapshot().draft.problems.map((p) => p.id)).toEqual(["b"]);
  });

  it("새로 고친 뒤에도 뺀 문항과 뺀 자리가 남는다", () => {
    const { create } = memory();
    const store = create();
    store.hydrate();
    store.importDraft({
      version: 1,
      title: "뺀 기억",
      problems: [shot("a", 1), shot("b", 2), bank("bank-1")],
    });
    const removed = removeAt(store, 1);
    expect(store.saveNow()).toBe(true);

    const reload = create();
    reload.hydrate();
    expect(reload.getSnapshot().draft.problems.map((item) => item.id)).toEqual([
      "a",
      "bank-1",
    ]);
    expect(reload.getSnapshot().draft.removed).toEqual([
      { problem: removed, index: 1 },
    ]);
  });

  it("옛 저장본(칸 없음)은 그대로 열린다 — 빈 기억", () => {
    const { values, create } = memory();
    values.set(
      DRAFT_STORE_KEY,
      JSON.stringify({
        version: 1,
        activeId: "old",
        drafts: [
          {
            id: "old",
            title: "이 판 전에 저장한 시험지",
            problems: [shot("a", 1)],
            columns: 2,
            answers: false,
            updatedAt: "2026-09-20T00:00:00.000Z",
          },
        ],
      }),
    );
    const store = create();
    store.hydrate();
    expect(store.getSnapshot()).toMatchObject({
      saveStatus: "saved",
      saveError: null,
      draft: { id: "old", removed: [] },
    });
    expect(store.getSnapshot().draft.problems.map((item) => item.id)).toEqual([
      "a",
    ]);
  });

  it("뺀 문항은 담은 목록에서 옮겨 온 것 — 그림 data URL 이 두 벌이 되지 않는다", () => {
    const { raw, create } = memory();
    const store = create();
    store.hydrate();
    store.importDraft({
      version: 1,
      title: "크기",
      problems: [shot("a", 1), shot("b", 2)],
    });
    store.saveNow();
    const before = raw();
    const image = store.getSnapshot().draft.problems[1].croppedImage!;
    expect(count(before, image)).toBeGreaterThan(0);

    removeAt(store, 1);
    store.saveNow();
    const after = raw();
    // 같은 그림이 담은 목록에서 빠지고 뺀 기억에 들어갔다 — 벌 수가 같다.
    expect(count(after, image)).toBe(count(before, image));
    // 늘어난 것은 칸 이름·자리 번호뿐이다.
    expect(after.length - before.length).toBeLessThan(200);
  });

  it("담은 목록에 다시 있는 문항의 기억은 읽을 때 버린다 — 두 곳에 같은 문항을 두지 않는다", () => {
    const { values, create } = memory();
    const a = shot("a", 1);
    values.set(
      DRAFT_STORE_KEY,
      JSON.stringify({
        version: 1,
        activeId: "d",
        drafts: [
          {
            id: "d",
            title: "겹침",
            problems: [a],
            removed: [
              { problem: a, index: 0 },
              { problem: bank("bank-1"), index: 1 },
            ],
            columns: 2,
            answers: false,
            updatedAt: "2026-09-21T00:00:00.000Z",
          },
        ],
      }),
    );
    const store = create();
    store.hydrate();
    expect(
      store.getSnapshot().draft.removed.map((item) => item.problem.id),
    ).toEqual(["bank-1"]);
  });

  it("망가진 기억은 저장본을 덮어쓰지 않고 멈춘다 — 파일 가져오기도 거절", () => {
    for (const removed of [
      "b",
      [{ problem: bank("b"), index: -1 }],
      [{ problem: bank("b"), index: 1.5 }],
      [
        {
          problem: { ...bank("b"), figureSvg: "<svg onload='x()'/>" },
          index: 0,
        },
      ],
      [
        { problem: bank("b"), index: 0 },
        { problem: bank("b"), index: 1 },
      ],
    ]) {
      const { values, create } = memory();
      const stored = JSON.stringify({
        version: 1,
        activeId: "d",
        drafts: [
          {
            id: "d",
            title: "망가짐",
            problems: [],
            removed,
            columns: 2,
            answers: false,
            updatedAt: "2026-09-21T00:00:00.000Z",
          },
        ],
      });
      values.set(DRAFT_STORE_KEY, stored);
      const store = create();
      store.hydrate();
      expect(store.getSnapshot().saveStatus).toBe("error");
      store.setTitle("덮어쓰려는 수정");
      expect(store.saveNow()).toBe(false);
      expect(values.get(DRAFT_STORE_KEY)).toBe(stored);

      const clean = memory().create();
      clean.hydrate();
      expect(
        clean.importDraft({ version: 1, title: "파일", problems: [], removed }),
      ).toBe(false);
    }
  });

  it("이 판 전 배포본의 창이 칸을 떨구고 저장해도 «다른 창의 변경»으로 읽지 않는다", () => {
    const { values, raw, create } = memory();
    const store = create();
    store.hydrate();
    store.importDraft({
      version: 1,
      title: "옛 창과 같이",
      problems: [shot("a", 1), shot("b", 2)],
    });
    const removed = removeAt(store, 0);
    store.saveNow();
    // 옛 창의 파서는 모르는 칸을 버리고 봉투를 통째로 다시 쓴다(`parseImport` 가 아는 칸만 고른다).
    const envelope = JSON.parse(raw());
    for (const draft of envelope.drafts) delete draft.removed;
    values.set(DRAFT_STORE_KEY, JSON.stringify(envelope));

    store.setTitle("새 창에서 고친 제목");
    expect(store.saveNow()).toBe(true);
    expect(store.getSnapshot().saveError).toBeNull();
    // 새 창의 기억이 다시 실린다.
    const reload = create();
    reload.hydrate();
    expect(reload.getSnapshot().draft).toMatchObject({
      title: "새 창에서 고친 제목",
      removed: [{ problem: removed, index: 0 }],
    });
  });
});

describe("계정 저장(보관함)도 뺀 기억을 싣는다", () => {
  beforeEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    vi.stubGlobal("Blob", NodeBlob);
    vi.stubGlobal("crypto", webcrypto);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:private-crop");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("다른 기기에서 열어도 뺀 기억이 있고, 그림은 자산 주소로 올라간다", async () => {
    const server = privateServer();
    const first = createPrivateDraftStore(
      "owner-a",
      new PrivateCloudClient("owner-a", server.transport),
    );
    await first.hydrate();
    first.setProblems([shot("a", 1), shot("b", 2)]);
    removeAt(first, 1);
    expect(await first.saveNow()).toBe(true);
    const payload = [...server.documents.values()][0].payload as {
      removed: { problem: { id: string }; index: number }[];
    };
    expect(
      payload.removed.map((item) => [item.problem.id, item.index]),
    ).toEqual([["b", 1]]);
    expect(JSON.stringify(payload)).not.toContain("data:image");

    localStorage.clear();
    const fresh = createPrivateDraftStore(
      "owner-a",
      new PrivateCloudClient("owner-a", server.transport),
    );
    await fresh.hydrate();
    expect(
      fresh
        .getSnapshot()
        .draft.removed.map((item) => [item.problem.id, item.index]),
    ).toEqual([["b", 1]]);
  });
});

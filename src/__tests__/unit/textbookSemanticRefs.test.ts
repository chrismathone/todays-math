import { describe, expect, it } from "vitest";

import type { TextbookSemantic } from "@/contracts/textbookSemantic.contract";
import { semanticFragmentAssetIds } from "@/lib/textbook/semanticAssets";
import { remapSemanticRefs } from "@/lib/textbook/semanticRefs";

const itemIds = new Map([
  ["old-1", "new-1"],
  ["old-2", "new-2"],
]);
const assetIds = new Map([["a-old", "a-new"]]);

const group = (): TextbookSemantic => ({
  activity: "workedExamples",
  node: {
    kind: "exampleGroup",
    groupId: "example-old-1",
    title: "예제",
    strategy: "전략",
    exampleItemId: "old-1",
    confirmItemIds: ["old-2", "keep"],
  },
});

describe("remapSemanticRefs", () => {
  it("예제 묶음의 예제 · 확인 문항 id 를 바꾸고 groupId 는 그대로 둔다", () => {
    const result = remapSemanticRefs(group(), { itemIds });
    expect(result.node).toEqual({
      kind: "exampleGroup",
      groupId: "example-old-1",
      title: "예제",
      strategy: "전략",
      exampleItemId: "new-1",
      confirmItemIds: ["new-2", "keep"],
    });
  });

  it("참조 항목의 targetItemId 만 바꾸고 없는 칸 · 모르는 id 는 둔다", () => {
    const semantic: TextbookSemantic = {
      activity: "tableOfContents",
      node: {
        kind: "references",
        entries: [
          { key: "a", label: "가", targetItemId: "old-1" },
          { key: "b", label: "나" },
          { key: "c", label: "다", targetItemId: "unknown" },
        ],
      },
    };
    const result = remapSemanticRefs(semantic, { itemIds });
    expect(result.node).toMatchObject({
      entries: [
        { key: "a", label: "가", targetItemId: "new-1" },
        { key: "b", label: "나" },
        { key: "c", label: "다", targetItemId: "unknown" },
      ],
    });
    expect(
      "targetItemId" in (result.node as { entries: object[] }).entries[1]!,
    ).toBe(false);
  });

  it("조각 트리의 그림 자산 id 를 자식 깊이까지 바꾼다 — 본문 · 머리말 · 꼬리말 모두", () => {
    const img = { tag: "img" as const, attributes: { assetId: "a-old" } };
    const tree = [
      {
        tag: "div" as const,
        children: [{ tag: "p" as const, children: [img] }],
      },
    ];
    const semantic: TextbookSemantic = {
      activity: "practice",
      node: { kind: "fragments", fragments: tree },
      sourceFooter: tree,
      sourceQuestionHeader: [img, { ...img, attributes: { assetId: "keep" } }],
    };
    const result = remapSemanticRefs(semantic, { assetIds });
    expect(semanticFragmentAssetIds(result)).toEqual([
      "a-new",
      "a-new",
      "a-new",
      "keep",
    ]);
    // 원본은 건드리지 않는다
    expect(semanticFragmentAssetIds(semantic)).toEqual([
      "a-old",
      "a-old",
      "a-old",
      "keep",
    ]);
  });

  it("바꿀 것이 없으면 같은 객체를 돌려주고 직렬화가 같다", () => {
    const semantic = group();
    const before = JSON.stringify(semantic);
    expect(remapSemanticRefs(semantic, {})).toBe(semantic);
    expect(remapSemanticRefs(semantic, { itemIds: new Map() })).toBe(semantic);
    expect(remapSemanticRefs(semantic, { assetIds })).toBe(semantic);
    expect(
      remapSemanticRefs(semantic, { itemIds: new Map([["zzz", "yyy"]]) }),
    ).toBe(semantic);
    expect(JSON.stringify(semantic)).toBe(before);
    const plain: TextbookSemantic = { activity: "rest" };
    expect(remapSemanticRefs(plain, { itemIds, assetIds })).toBe(plain);
    expect(remapSemanticRefs(undefined, { itemIds })).toBeUndefined();
  });

  it("바뀌어도 키 순서는 그대로다", () => {
    const semantic = group();
    const result = remapSemanticRefs(semantic, { itemIds });
    expect(Object.keys(result)).toEqual(Object.keys(semantic));
    expect(Object.keys(result.node!)).toEqual(Object.keys(semantic.node!));
    const mapped = JSON.parse(JSON.stringify(result));
    expect(JSON.stringify(mapped)).toBe(
      JSON.stringify(semantic)
        .replace('"exampleItemId":"old-1"', '"exampleItemId":"new-1"')
        .replace('"old-2"', '"new-2"'),
    );
  });

  it("같은 묶음 메타를 단 제목 글 블록과 문제 블록 둘 다 같은 결과다", () => {
    const heading = remapSemanticRefs(group(), { itemIds });
    const member = remapSemanticRefs(group(), { itemIds });
    expect(member).toEqual(heading);
  });
});

describe("semanticFragmentAssetIds", () => {
  it("sourceFooter · sourceQuestionHeader 의 그림도 모은다", () => {
    const img = (assetId: string) => ({
      tag: "img" as const,
      attributes: { assetId },
    });
    expect(
      semanticFragmentAssetIds({
        activity: "practice",
        sourceFooter: [{ tag: "div", children: [img("f1")] }],
        sourceQuestionHeader: [img("h1")],
      }),
    ).toEqual(["f1", "h1"]);
  });
});

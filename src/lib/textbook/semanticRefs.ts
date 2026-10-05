import type {
  TextbookSemantic,
  TextbookSourceFragment,
} from "@/contracts/textbookSemantic.contract";

export interface SemanticRefMaps {
  /** 옛 배치 id → 새 배치 id */
  itemIds?: ReadonlyMap<string, string>;
  /** 옛 자산 id → 새 자산 id */
  assetIds?: ReadonlyMap<string, string>;
}

/**
 * 구조 메타(`semantic`) 안의 배치 id · 자산 id 를 새 id 로 바꾼다 — 복제와 가져오기가 함께 쓴다.
 * 바꿀 것이 없으면 같은 객체를 돌려준다(직렬화가 한 바이트도 달라지지 않는다). 키 순서는 그대로다.
 * `groupId` 는 묶음 구성원끼리 같은지만 보므로 바꾸지 않는다.
 */
export function remapSemanticRefs(
  semantic: TextbookSemantic,
  maps: SemanticRefMaps,
): TextbookSemantic;
export function remapSemanticRefs(
  semantic: TextbookSemantic | undefined,
  maps: SemanticRefMaps,
): TextbookSemantic | undefined;
export function remapSemanticRefs(
  semantic: TextbookSemantic | undefined,
  maps: SemanticRefMaps,
): TextbookSemantic | undefined {
  if (!semantic) return semantic;
  const itemOf = (id: string) => maps.itemIds?.get(id) ?? id;
  const assetOf = (id: string) => maps.assetIds?.get(id) ?? id;

  /** 배열 원소가 하나도 안 바뀌면 같은 배열 */
  const mapArray = <T>(list: readonly T[], fn: (value: T) => T): T[] => {
    let changed = false;
    const next = list.map((value) => {
      const mapped = fn(value);
      if (mapped !== value) changed = true;
      return mapped;
    });
    return changed ? next : (list as T[]);
  };
  const fragment = (node: TextbookSourceFragment): TextbookSourceFragment => {
    let next = node;
    const assetId = node.attributes?.assetId;
    if (node.tag === "img" && assetId && assetOf(assetId) !== assetId)
      next = {
        ...next,
        attributes: { ...node.attributes, assetId: assetOf(assetId) },
      };
    if (node.children) {
      const children = mapArray(node.children, fragment);
      if (children !== node.children) next = { ...next, children };
    }
    return next;
  };

  let next = semantic;
  const node = semantic.node;
  if (node?.kind === "exampleGroup") {
    const confirmItemIds = mapArray(node.confirmItemIds, itemOf);
    const exampleItemId = itemOf(node.exampleItemId);
    if (
      exampleItemId !== node.exampleItemId ||
      confirmItemIds !== node.confirmItemIds
    )
      next = {
        ...next,
        node: { ...node, exampleItemId, confirmItemIds },
      };
  } else if (node?.kind === "references") {
    const entries = mapArray(node.entries, (entry) =>
      entry.targetItemId && itemOf(entry.targetItemId) !== entry.targetItemId
        ? { ...entry, targetItemId: itemOf(entry.targetItemId) }
        : entry,
    );
    if (entries !== node.entries)
      next = { ...next, node: { ...node, entries } };
  } else if (node?.kind === "fragments") {
    const fragments = mapArray(node.fragments, fragment);
    if (fragments !== node.fragments)
      next = { ...next, node: { ...node, fragments } };
  }
  if (semantic.sourceFooter) {
    const sourceFooter = mapArray(semantic.sourceFooter, fragment);
    if (sourceFooter !== semantic.sourceFooter)
      next = { ...next, sourceFooter };
  }
  if (semantic.sourceQuestionHeader) {
    const sourceQuestionHeader = mapArray(
      semantic.sourceQuestionHeader,
      fragment,
    );
    if (sourceQuestionHeader !== semantic.sourceQuestionHeader)
      next = { ...next, sourceQuestionHeader };
  }
  return next;
}

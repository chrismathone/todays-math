import type {
  TextbookSemantic,
  TextbookSourceFragment,
} from "@/contracts/textbookSemantic.contract";

/** Bounded, schema-validated source trees refer only to frozen assets, never URLs. */
export function semanticFragmentAssetIds(
  semantic?: TextbookSemantic,
): string[] {
  const ids: string[] = [];
  const walk = (nodes: readonly TextbookSourceFragment[]) => {
    for (const node of nodes) {
      if (node.tag === "img" && node.attributes?.assetId)
        ids.push(node.attributes.assetId);
      if (node.children) walk(node.children);
    }
  };
  if (semantic?.node?.kind === "fragments") walk(semantic.node.fragments);
  return ids;
}

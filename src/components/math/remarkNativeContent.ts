import type { Root, RootContent, Text } from "mdast";

/** Native OCR additions only; bank markdown keeps its existing parser and DOM. */
export function remarkNativeContent(options: {
  figureCount: number;
  emphasizeNegation: boolean;
}) {
  return (tree: Root) => {
    const visit = (parent: { children: RootContent[] }) => {
      parent.children = parent.children.flatMap((node): RootContent[] => {
        if (node.type !== "text") {
          if ("children" in node) visit(node as { children: RootContent[] });
          return [node];
        }
        const result: RootContent[] = [];
        const pattern = /\[그림\s*(\d+)\]|(않은|않는|아닌|틀린)(?=\s*것)/g;
        let start = 0;
        for (const match of node.value.matchAll(pattern)) {
          const figure = Number(match[1]);
          if (
            match[1]
              ? figure < 1 || figure > options.figureCount
              : !options.emphasizeNegation
          )
            continue;
          if (match.index! > start)
            result.push({
              type: "text",
              value: node.value.slice(start, match.index),
            });
          result.push(
            match[1]
              ? {
                  type: "image",
                  url: `#mathgen-figure-${figure}`,
                  alt: `문항 그림 ${figure}`,
                }
              : {
                  type: "strong",
                  children: [{ type: "text", value: match[0] } satisfies Text],
                  data: { hProperties: { className: ["underline"] } },
                },
          );
          start = match.index! + match[0].length;
        }
        if (start === 0) return [node];
        if (start < node.value.length)
          result.push({ type: "text", value: node.value.slice(start) });
        return result;
      });
    };
    visit(tree);
  };
}

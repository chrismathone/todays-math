import type { Root, RootContent, Text } from "mdast";

/** Only prose containers can be empty; math, breaks, rules, cells and media carry intent. */
function isEmptyQuoteContent(node: RootContent): boolean {
  if (node.type === "text") return node.value.trim() === "";
  if (
    node.type === "blockquote" ||
    node.type === "paragraph" ||
    node.type === "emphasis" ||
    node.type === "strong"
  )
    return node.children.every((child) => isEmptyQuoteContent(child));
  return false;
}

/** Empty OCR quotes also reach the legacy saved-Markdown path. */
export function remarkEmptyBlockquotes() {
  return (tree: Root) => {
    const visit = (parent: { children: RootContent[] }) => {
      parent.children = parent.children.filter((node) => {
        if ("children" in node) visit(node as { children: RootContent[] });
        // OCR can emit a bare `>`; reparsing a serialized condition box can also
        // leave one before the rebuilt box. Do not give that empty AST a border.
        // Never infer emptiness from rendered text: an answer rule, phantom math,
        // blank table cell or image can be meaningful without visible words.
        return node.type !== "blockquote" || !isEmptyQuoteContent(node);
      });
    };
    visit(tree);
  };
}

/** Native OCR figure anchors and negation emphasis only. */
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

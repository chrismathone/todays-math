import { SVG_NS, cleanFigureForSave } from "./figureSvgEditing";

const color = (value: string | null, fallback: string) =>
  /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(value ?? "")
    ? value!
    : value === "white"
      ? "#ffffff"
      : fallback;

/** Mathgen's editable-text/rendered-path split, with local lazy-loaded MathJax. */
export async function typesetFigureSvg(
  source: string,
  preserveObjectIds = false,
): Promise<string> {
  const doc = new DOMParser().parseFromString(source, "image/svg+xml");
  const nodes = [...doc.querySelectorAll("text")].filter(
    (node) => !node.closest("defs,clipPath,mask,marker,pattern"),
  );
  if (nodes.length) {
    const { typesetLabel, placeLabel } = await import("./mathjaxLabel");
    for (const node of nodes) {
      const text = node.getAttribute("data-mj") ?? node.textContent ?? "";
      const weight = node.getAttribute("font-weight") ?? "400";
      const laid = typesetLabel(
        text,
        weight === "bold" || Number(weight) >= 600,
        node.getAttribute("font-style") === "italic",
      );
      if (!laid) continue;
      const width = Number(node.getAttribute("stroke-width"));
      const anchor = node.getAttribute("text-anchor");
      const fragment = placeLabel(
        laid,
        text,
        Number(node.getAttribute("x") ?? 0),
        Number(node.getAttribute("y") ?? 0),
        Number(node.getAttribute("font-size") ?? 18),
        color(node.getAttribute("fill"), "#111111"),
        width > 0 && node.getAttribute("stroke") !== "none"
          ? { color: color(node.getAttribute("stroke"), "#ffffff"), width }
          : undefined,
        {
          anchor: anchor === "middle" || anchor === "end" ? anchor : "start",
          centerY: ["middle", "central"].includes(
            node.getAttribute("dominant-baseline") ?? "",
          ),
        },
      );
      if (!fragment) continue;
      const parsed = new DOMParser().parseFromString(
        `<svg xmlns="${SVG_NS}">${fragment}</svg>`,
        "image/svg+xml",
      );
      const wrapper = doc.createElementNS(SVG_NS, "g");
      for (const child of [...parsed.documentElement.childNodes])
        wrapper.append(doc.importNode(child, true));
      if (node.hasAttribute("transform"))
        wrapper.setAttribute("transform", node.getAttribute("transform")!);
      if (preserveObjectIds && node.hasAttribute("data-object-id"))
        wrapper.setAttribute(
          "data-object-id",
          node.getAttribute("data-object-id")!,
        );
      node.replaceWith(wrapper);
    }
  }
  const rendered = new XMLSerializer().serializeToString(doc.documentElement);
  return preserveObjectIds ? rendered : cleanFigureForSave(rendered);
}

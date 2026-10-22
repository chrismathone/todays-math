const NS = "http://www.w3.org/2000/svg";
const GROUP_PRESENTATION = new Set("style fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit opacity color clip-path mask visibility display".split(" "));

/** 엔진이 명시한 화살표만 합친다. 가까운 삼각형을 추측해서 화살촉으로 취급하지 않는다. */
export function normalizeFigureArrows(root: Element): void {
  const doc = root.ownerDocument;
  const ids = new Set([root.id, ...[...root.querySelectorAll("[id]")].map((node) => node.id)].filter(Boolean));
  let serial = 0;
  for (const group of root.querySelectorAll("g[data-arrow]")) {
    if (group.closest("defs,clipPath,mask,marker,pattern,[data-asset],[data-grid]")) continue;
    const both = group.getAttribute("data-arrow") === "both";
    if (!both && group.getAttribute("data-arrow") !== "end") continue;
    const children = [...group.children];
    const line = children.find((node) => node.localName === "line");
    const heads = children.filter((node) => node.localName === "polygon");
    if (!line || children.length !== (both ? 3 : 2) || heads.length !== (both ? 2 : 1)) continue;
    // Engine groups have no presentation overrides. Keep an imported styled or
    // clipped group intact: moving a head into root defs would lose its context.
    let hasPresentation = false;
    for (let ancestor: Element | null = group; ancestor && ancestor !== root; ancestor = ancestor.parentElement) {
      if ([...ancestor.attributes].some((attr) => GROUP_PRESENTATION.has(attr.name))) hasPresentation = true;
    }
    if (hasPresentation || heads.some((head) => head.hasAttribute("clip-path") || head.hasAttribute("mask"))) continue;
    if (children.some((node) => node.hasAttribute("transform")) || line.hasAttribute("marker-end") || line.hasAttribute("marker-start")) continue;
    const [x1, y1, x2, y2] = ["x1", "y1", "x2", "y2"].map((name) => Number(line.getAttribute(name) ?? 0));
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (![x1, y1, x2, y2, length].every(Number.isFinite) || length < 1e-9) continue;
    const points = heads.map((head) => (head.getAttribute("points") ?? "").trim().split(/[\s,]+/).map(Number));
    if (points.some((values) => values.length !== 6 || !values.every(Number.isFinite))) continue;
    const ux = (x2 - x1) / length, uy = (y2 - y1) / length;
    let defs = [...root.children].find((node) => node.localName === "defs");
    if (!defs) { defs = doc.createElementNS(NS, "defs"); root.prepend(defs); }
    heads.forEach((head, index) => {
      const start = both && index === 0;
      const ax = start ? x1 : x2, ay = start ? y1 : y2;
      let id: string;
      do { id = `engine-arrow-${serial++}`; } while (ids.has(id));
      ids.add(id);
      const marker = doc.createElementNS(NS, "marker");
      for (const [name, value] of Object.entries({ id, markerWidth: "1", markerHeight: "1", markerUnits: "userSpaceOnUse", refX: "0", refY: "0", orient: "auto", overflow: "visible" })) marker.setAttribute(name, value);
      const polygon = head.cloneNode(false) as Element;
      polygon.removeAttribute("data-object-id");
      polygon.removeAttribute("data-n");
      const values = points[index];
      const local: string[] = [];
      for (let i = 0; i < values.length; i += 2) {
        const dx = values[i] - ax, dy = values[i + 1] - ay;
        local.push(`${ux * dx + uy * dy},${-uy * dx + ux * dy}`);
      }
      polygon.setAttribute("points", local.join(" "));
      marker.append(polygon);
      defs!.append(marker);
      line.setAttribute(start ? "marker-start" : "marker-end", `url(#${id})`);
      head.remove();
    });
    group.removeAttribute("data-arrow");
  }
}

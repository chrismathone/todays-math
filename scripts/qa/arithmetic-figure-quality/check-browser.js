// Runs inside the single Orca browser. Every unique final SVG receives both
// screen and physical print-size bounds/collision probes; candidates are not
// equated with confirmed defects. No app endpoints are called.
window.auditBatch = async function (
  offset,
  count = 50,
  media = "screen",
  providedRows,
) {
  const rows =
    providedRows ??
    (await (await fetch(`/batch?offset=${offset}&count=${count}`)).json());
  let root = document.querySelector("#audit-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "audit-root";
    document.body.replaceChildren(root);
  }
  const results = [];
  for (const row of rows) {
    root.innerHTML = row.svg;
    const svg = root.querySelector("svg");
    if (!svg) {
      results.push({ id: row.id, hash: row.display, error: "no SVG" });
      continue;
    }
    const size =
      media === "print"
        ? {
            width: (row.print.widthMm * 96) / 25.4,
            height: (row.print.heightMm * 96) / 25.4,
          }
        : row.screen;
    svg.style.width = `${size.width}px`;
    svg.style.height = `${size.height}px`;
    const frame = svg.getBoundingClientRect();
    const clipped = [],
      overlaps = [],
      hits = [],
      details = [];
    const labels = [...svg.querySelectorAll("g[data-label],text")].filter(
      (e) =>
        !e.closest("defs,mask,clipPath") &&
        !(e.tagName === "text" && e.closest("g[data-label]")),
    );
    const bbox = (e) => {
      const b = e.getBoundingClientRect();
      if (e.tagName === "text" && /^[A-Z]$/.test(e.textContent || "")) {
        const ctx = document.createElement("canvas").getContext("2d");
        ctx.font = getComputedStyle(e).font;
        ctx.textAlign =
          getComputedStyle(e).textAnchor === "middle" ? "center" : "left";
        const m = ctx.measureText(e.textContent);
        const mat = e.getScreenCTM();
        const p = new DOMPoint(
          e.x.baseVal[0].value,
          e.y.baseVal[0].value,
        ).matrixTransform(mat);
        const scale = Math.hypot(mat.a, mat.b);
        return {
          x: p.x - m.actualBoundingBoxLeft * scale,
          y: p.y - m.actualBoundingBoxAscent * scale,
          w: (m.actualBoundingBoxLeft + m.actualBoundingBoxRight) * scale,
          h: (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) * scale,
        };
      }
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    };
    const boxes = labels.map((e) => ({
      label: e.getAttribute("data-label") || e.textContent,
      box: bbox(e),
    }));
    for (const l of boxes)
      if (
        l.box.x < frame.x - 0.5 ||
        l.box.y < frame.y - 0.5 ||
        l.box.x + l.box.w > frame.right + 0.5 ||
        l.box.y + l.box.h > frame.bottom + 0.5
      )
        clipped.push(l.label);
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i].box,
          b = boxes[j].box;
        if (
          a.x < b.x + b.w - 0.6 &&
          a.x + a.w > b.x + 0.6 &&
          a.y < b.y + b.h - 0.6 &&
          a.y + a.h > b.y + 0.6
        )
          overlaps.push([boxes[i].label, boxes[j].label]);
      }
    const lineHits = (p, q, b) => {
      let lo = 0,
        hi = 1;
      for (let axis = 0; axis < 2; axis++) {
        const start = (axis ? b.y : b.x) + 0.7,
          end = start + (axis ? b.h : b.w) - 1.4,
          delta = q[axis] - p[axis];
        if (Math.abs(delta) < 1e-12) {
          if (p[axis] < start || p[axis] > end) return false;
        } else {
          const a = (start - p[axis]) / delta,
            c = (end - p[axis]) / delta;
          lo = Math.max(lo, Math.min(a, c));
          hi = Math.min(hi, Math.max(a, c));
          if (lo > hi) return false;
        }
      }
      return true;
    };
    // Label-versus-solid-outline probes deliberately exclude dimension/leader
    // dashes and MathJax glyphs. Intersections remain review candidates because
    // SVG masks can intentionally clear auxiliary geometry.
    for (const e of svg.querySelectorAll(
      "line,path,polyline,polygon,circle,ellipse",
    )) {
      if (
        e.closest("g[data-label],defs,mask,clipPath") ||
        !(e instanceof SVGGeometryElement)
      )
        continue;
      const style = getComputedStyle(e);
      if (
        style.stroke === "none" ||
        parseFloat(style.strokeWidth) === 0 ||
        style.strokeDasharray !== "none"
      )
        continue;
      const matrix = e.getScreenCTM();
      if (!matrix) continue;
      if (e.tagName === "line") {
        const a = new DOMPoint(
            e.x1.baseVal.value,
            e.y1.baseVal.value,
          ).matrixTransform(matrix),
          b = new DOMPoint(
            e.x2.baseVal.value,
            e.y2.baseVal.value,
          ).matrixTransform(matrix);
        for (const l of boxes)
          if (
            lineHits([a.x, a.y], [b.x, b.y], l.box) &&
            !hits.includes(l.label)
          ) {
            hits.push(l.label);
            details.push({
              label: l.label,
              tag: e.tagName,
              width: parseFloat(style.strokeWidth),
              d: e.getAttribute("d"),
              endpoints:
                e.tagName === "line"
                  ? [
                      e.x1.baseVal.value,
                      e.y1.baseVal.value,
                      e.x2.baseVal.value,
                      e.y2.baseVal.value,
                    ]
                  : undefined,
            });
          }
        continue;
      }
      let n;
      try {
        n = e.getTotalLength();
      } catch {
        continue;
      }
      if (!Number.isFinite(n)) continue;
      for (let i = 1; i < Math.ceil(n / 2); i++) {
        const p = e.getPointAtLength((i * n) / Math.ceil(n / 2));
        const q = new DOMPoint(p.x, p.y).matrixTransform(matrix);
        for (const l of boxes) {
          const b = l.box;
          if (
            q.x > b.x + 0.7 &&
            q.x < b.x + b.w - 0.7 &&
            q.y > b.y + 0.7 &&
            q.y < b.y + b.h - 0.7
          ) {
            if (!hits.includes(l.label)) {
              hits.push(l.label);
              details.push({
                label: l.label,
                tag: e.tagName,
                width: parseFloat(style.strokeWidth),
                d: e.getAttribute("d"),
                endpoints:
                  e.tagName === "line"
                    ? [
                        e.x1.baseVal.value,
                        e.y1.baseVal.value,
                        e.x2.baseVal.value,
                        e.y2.baseVal.value,
                      ]
                    : undefined,
              });
            }
          }
        }
      }
    }
    results.push({
      id: row.id,
      hash: row.display,
      checkerVersion: 2,
      media,
      width: frame.width,
      height: frame.height,
      clipped,
      labelOverlaps: overlaps,
      solidStrokeCandidates: hits,
      strokeDetails: details,
    });
  }
  await fetch("/results", { method: "POST", body: JSON.stringify(results) });
  return {
    offset,
    count: rows.length,
    media,
    flagged: results.filter(
      (r) =>
        r.error ||
        r.clipped?.length ||
        r.labelOverlaps?.length ||
        r.solidStrokeCandidates?.length,
    ).length,
  };
};

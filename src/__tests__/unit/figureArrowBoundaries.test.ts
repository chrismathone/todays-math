import { describe, expect, it } from "vitest";
import { figureObjects, prepareFigureSvg } from "@/components/unified/figure-editor/figureSvgEditing";

const body = '<g data-arrow="end"><line x1="10" y1="50" x2="100" y2="50" stroke="#111"/><polygon points="100,50 92,47 92,53" fill="#111"/></g>';
const wrap = (inner: string, attrs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" ${attrs}>${inner}</svg>`;
const read = (s: string) => new DOMParser().parseFromString(s, "image/svg+xml");

describe("engine arrow import boundaries", () => {
  it("reserves the root SVG id as well as child ids", () => {
    const svg = prepareFigureSvg(wrap(body, 'id="engine-arrow-0"'));
    const doc = read(svg), marker = doc.querySelector('marker')!;
    expect(figureObjects(svg)).toHaveLength(1);
    expect(marker.id).toBe('engine-arrow-1');
    expect(doc.querySelector('line')?.getAttribute('marker-end')).toBe('url(#engine-arrow-1)');
    const ids = [doc.documentElement.id, ...[...doc.querySelectorAll('[id]')].filter(n => n !== doc.documentElement).map(n => n.id)].filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(['stroke="#c00" stroke-width="3"', 'opacity="0.5"', 'style="fill:#c00"', 'clip-path="url(#clip)"'])("keeps parent presentation intact: %s", attrs => {
    const defs = '<defs><clipPath id="clip"><rect width="100" height="100"/></clipPath></defs>';
    const doc = read(prepareFigureSvg(wrap(`${defs}<g ${attrs}>${body}</g>`)));
    expect(doc.querySelector('marker')).toBeNull();
    expect(doc.querySelector('g[data-arrow] > polygon')).not.toBeNull();
  });

  it("keeps a head's clip in its original coordinate frame", () => {
    const clipped = body.replace('<polygon ', '<polygon clip-path="url(#clip)" ');
    const doc = read(prepareFigureSvg(wrap('<defs><clipPath id="clip"><rect width="96" height="100"/></clipPath></defs>' + clipped)));
    expect(doc.querySelector('marker')).toBeNull();
    expect(doc.querySelector('g[data-arrow] > polygon')?.getAttribute('clip-path')).toBe('url(#clip)');
  });
});

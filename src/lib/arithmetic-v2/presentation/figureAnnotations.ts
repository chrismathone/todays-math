/** Remove complete elements from trusted, validated presentation SVGs. This is
 * not an SVG sanitizer: it only deletes known annotations, never creates paths.
 */
function omitElements(
  svg: string,
  omit: (tag: string, attrs: string) => boolean,
): string {
  const tags = /<(\/?)([\w:-]+)\b((?:[^"'<>]|"[^"]*"|'[^']*')*)>/g;
  let result = "",
    cursor = 0,
    skippedDepth = 0;
  for (const match of svg.matchAll(tags)) {
    const [whole, closing, tag, attrs] = match;
    const selfClosing = /\/>$/.test(whole);
    if (skippedDepth) {
      if (closing) skippedDepth--;
      else if (!selfClosing) skippedDepth++;
    } else {
      result += svg.slice(cursor, match.index);
      if (!closing && omit(tag, attrs)) {
        if (!selfClosing) skippedDepth = 1;
      } else result += whole;
    }
    cursor = match.index! + whole.length;
  }
  return result + svg.slice(cursor);
}

const retainedSegmentFamily =
  /^gt1-(?:m2-incenter-part-area|m2-iso-bisector-(?:angle|base|half-base)|m2-right-triangle-(?:height|projection)|m2-right-altitude-product|m3-right-leg-product)-\d/;

/** These retained figures supply point/angle incidence, not numerical givens.
 * Their measurements are already stated completely in the problem prose.
 */
export function simplifyArithmeticFigureAnnotations(
  id: string,
  svg: string,
): string {
  if (retainedSegmentFamily.test(id)) {
    return omitElements(svg, (_tag, attrs) =>
      /\bdata-segment-(?:dimension|number)=/.test(attrs),
    );
  }
  if (id.startsWith("gm-m1-parallel-angle-")) {
    return omitElements(
      svg,
      (tag, attrs) => tag === "g" && /\bdata-label="ℓ\s*∥\s*m"/.test(attrs),
    );
  }
  if (id.startsWith("gm-m3-circle-chord-length-")) {
    // Radius and OM are already given in prose. Keep the circle, chord, OM,
    // radius, point labels and every right-angle path; only the two measured
    // curves and their labels go. One short label uses the editor's plain
    // text fallback instead of TeX, so accept both exact authored forms.
    const gaps = new Set(
      [...svg.matchAll(/<mask\b[^>]*\bid="(line-gap-[\w-]+)"/g)].map(
        (match) => match[1],
      ),
    );
    return omitElements(svg, (tag, attrs) => {
      if (tag === "path")
        return (
          /\bstroke-dasharray="5 3"/.test(attrs) && /\bd="[^"]*Q/.test(attrs)
        );
      if (tag === "g") {
        const label = /\bdata-label="([^"]*)"/.exec(attrs)?.[1];
        return Boolean(
          label &&
          (/^\d+ cm$/.test(label) || /^\$\d+\\,\\mathrm\{cm\}\$$/.test(label)),
        );
      }
      return (
        tag === "mask" && gaps.has(/\bid="([^"]+)"/.exec(attrs)?.[1] ?? "")
      );
    }).replace(
      /\s+mask="url\(#(line-gap-[\w-]+)\)"/g,
      (attribute, gap: string) => (gaps.has(gap) ? "" : attribute),
    );
  }
  return svg;
}

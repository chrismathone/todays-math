// One Chromium page, actual bundled production projection and image decoding.
// Each module URL is unique; loopback transfer/parse/eval is included explicitly.
window.runArithmeticBenchmark = async function (name, workload = "inline") {
  const cases = await (
    await fetch(
      `/scripts/qa/arithmetic-figure-quality/benchmark-${workload}-runtime.json`,
    )
  ).json();
  document.body.replaceChildren();
  const host = document.createElement("main");
  document.body.append(host);
  const heap = () => performance.memory?.usedJSHeapSize ?? null;
  const beforeHeap = heap(),
    url = `/scripts/qa/arithmetic-figure-quality/performance-${name}.mjs?cold=${Date.now()}-${Math.random()}`;
  const t0 = performance.now(),
    api = await import(url),
    moduleMs = performance.now() - t0,
    afterModuleHeap = heap();
  let start = performance.now();
  const first = api.figureFirstSvg(
    cases[0].type,
    cases[0].prompt,
    cases[0].canonical,
  );
  if (!first) throw Error("first display missing");
  const firstFigureMs = performance.now() - start;
  async function paint(svg) {
    const img = new Image(),
      blob = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    img.src = blob;
    const box = api.arithmeticGeometryDisplaySize(svg);
    img.width = box.width;
    img.height = box.height;
    host.append(img);
    await img.decode();
    URL.revokeObjectURL(blob);
    return img;
  }
  start = performance.now();
  await paint(first);
  await new Promise(requestAnimationFrame);
  const firstDecodePaintMs = performance.now() - start;
  let totalSvgChars = 0,
    sampledPeakHeap = heap(),
    missing = 0;
  start = performance.now();
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i],
      svg = api.figureFirstSvg(c.type, c.prompt, c.canonical);
    if (!svg) missing++;
    else totalSvgChars += svg.length;
    if (i % 25 === 0) {
      const h = heap();
      if (h !== null) sampledPeakHeap = Math.max(sampledPeakHeap ?? 0, h);
    }
  }
  const mixed2000Ms = performance.now() - start,
    afterMixedHeap = heap();
  start = performance.now();
  for (const c of cases.slice(1, 20)) {
    const svg = api.figureFirstSvg(c.type, c.prompt, c.canonical);
    if (svg) await paint(svg);
  }
  await new Promise(requestAnimationFrame);
  const preview20Ms = performance.now() - start;
  const resource = performance
    .getEntriesByType("resource")
    .find((r) => r.name === new URL(url, location.href).href);
  return {
    name,
    workload,
    families: new Set(cases.map((c) => c.type)).size,
    moduleMs,
    firstFigureMs,
    firstDecodePaintMs,
    mixed2000Ms,
    preview20Ms,
    worksheetItems: cases.length,
    missing,
    totalSvgChars,
    beforeHeap,
    afterModuleHeap,
    afterMixedHeap,
    sampledPeakHeap,
    afterPreviewHeap: heap(),
    resource: resource
      ? {
          transferSize: resource.transferSize,
          encodedBodySize: resource.encodedBodySize,
          decodedBodySize: resource.decodedBodySize,
        }
      : null,
    images: [...host.querySelectorAll("img")].map((i) => ({
      complete: i.complete,
      width: i.width,
      height: i.height,
    })),
    userAgent: navigator.userAgent,
    scope:
      "cold unique module import from uncompressed localhost server, actual figureFirstSvg and 20 image decodes; sampled JS heap if exposed, no forced GC, no deployed/mobile claim",
  };
};

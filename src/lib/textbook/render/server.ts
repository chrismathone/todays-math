import "server-only";
import type { Browser, Page } from "puppeteer-core";
import { PDFDocument } from "pdf-lib";
import type { TextbookExchange } from "@/contracts/textbookExchange.contract";
import type { TextbookIssue } from "@/contracts/textbookPrimitives.contract";
import { launchExportBrowser } from "@/lib/export/pdfServer";
import {
  assertTextbookIntegrity,
  TextbookIntegrityError,
  validateTextbookIntegrity,
  type ReadTextbookAsset,
} from "../integrity.server";
import { sha256 } from "../hash.server";
import { canonicalJson } from "../canonical";
import { TEXTBOOK_CHARACTERS } from "../characters";
import {
  applySourceWriting,
  measureSourceWritingDom,
  sourceWritingBlockIds,
} from "./sourceWriting";
import {
  A4,
  alignTextbookSpreads,
  continuesTextbookSection,
  paginateTextbookSections,
  studentPageMapFromPages,
  type BlockMeasurement,
  type TextbookPage,
} from "../layout/paginate";
import {
  createTextbookRenderModel,
  type TextbookVariant,
  type TextbookRenderModel,
} from "./model";
import {
  measurementHtml,
  recallMeasurementHtml,
  renderPageHtml,
  textbookHtmlDocument,
  type RenderResources,
} from "./html";
import {
  recallMeasurementModel,
  dialogueMeasurementModel,
  recoveryMeasurePlan,
  measureRecoveryDom,
  applyRecoveryMeasurements,
  assertRecoveryMeasurementBudget,
  measureIntroGeometry,
} from "./recoveryMeasurement";
import {
  dataUrl,
  editorialResourceUrl,
  inlineBundleCss,
  loadTextbookAssets,
  loadTextbookLocalBundle,
  shareInlineTextbookImages,
  RESOURCE_ORIGIN,
  type TrustedResource,
} from "./bundle.server";
import { generateTextbookQrs, modelQrTargets } from "./qr.server";
import {
  withTextbookPageReferences,
  assertTextbookReferenceLayoutUnchanged,
} from "./pageReferences";
import {
  verifyPdfQrPixels,
  type QrPlacement,
  type QrPixelCheck,
} from "./qrVerify.server";

export interface RenderTextbookChunkInput {
  exchange: TextbookExchange;
  readAsset: ReadTextbookAsset;
  officialOrigin: string;
  sectionIndices: number[];
  firstPhysicalPageIndex: number;
  variant: TextbookVariant;
  signal?: AbortSignal;
  /** Reuse within a bounded server job; never supplied from a client request. */
  browser?: Browser;
  mode?: "publish" | "draft";
  maxPages?: number;
  /** Verified server-owned student pages supply source labels only; answers paginate independently. */
  studentPages?: readonly TextbookPage[];
  referencePages?: readonly TextbookPage[];
  reservedPages?: readonly TextbookPage[];
  onProgress?: (
    phase: "integrity" | "measuring" | "layout" | "pdf" | "qr",
  ) => void;
}
export interface TextbookChunkResult {
  pdf: Uint8Array;
  html: string;
  pageMap: TextbookExchange["pageMap"];
  pages: TextbookPage[];
  qrChecks: QrPixelCheck[];
  qrPlacements: QrPlacement[];
  issues: TextbookIssue[];
  artifactHash: string;
  nextPhysicalPageIndex: number;
  metrics: {
    elapsedMs: number;
    htmlBytes: number;
    pdfBytes: number;
    measuredBlocks: number;
  };
}

async function trustedPage(
  browser: Browser,
  resources: ReadonlyMap<string, TrustedResource>,
): Promise<{ page: Page; errors: string[] }> {
  const page = await browser.newPage(),
    errors: string[] = [];
  await page.setJavaScriptEnabled(false);
  await page.setRequestInterception(true);
  await page.emulateMediaType("print");
  page.on("request", (request) => {
    const resource = resources.get(request.url());
    if (
      resource &&
      ["font", "image", "stylesheet"].includes(request.resourceType())
    )
      void request
        .respond({
          status: 200,
          contentType: resource.mimeType,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: resource.bytes,
        })
        .catch((e: unknown) => errors.push(String(e)));
    else if (
      request.url().startsWith("data:image/") &&
      request.resourceType() === "image"
    )
      void request.continue().catch((e: unknown) => errors.push(String(e)));
    else {
      errors.push(
        `Blocked render request ${request.resourceType()}: ${request.url()}`,
      );
      void request.abort();
    }
  });
  page.on("pageerror", (error) => errors.push(String(error)));
  return { page, errors };
}
async function loadReady(page: Page, html: string): Promise<void> {
  await page.setContent(html, { waitUntil: "load", timeout: 30_000 });
  await page.evaluate(async () => {
    await document.fonts.load(
      "400 13px TextbookPretendard",
      "가나다 수학 ABC 123",
    );
    await document.fonts.load(
      "700 13px TextbookPretendard",
      "가나다 수학 ABC 123",
    );
    await document.fonts.ready;
    if (!document.fonts.check("400 13px TextbookPretendard", "가나다"))
      throw new Error("Local textbook font failed to load");
    await Promise.all(
      Array.from(document.images).map(async (image) => {
        await image.decode();
        if (!image.naturalWidth || !image.naturalHeight)
          throw new Error("Image failed to load");
      }),
    );
    // A synchronous layout read works with manuscript JavaScript disabled.
    document.documentElement.getBoundingClientRect();
  });
}
async function measure(page: Page): Promise<BlockMeasurement[]> {
  const introFits = await page.evaluate(measureIntroGeometry);
  const measured = await page.evaluate(
    (atlasSpeakers) =>
      Array.from(
        document.querySelectorAll<HTMLElement>("[data-measure-id]"),
      ).map((element) => {
        const rect = element.getBoundingClientRect();
        for (const child of element.querySelectorAll<HTMLElement>(
          ".katex-html, img, table, pre",
        )) {
          // The atlas intentionally extends past its clipped portrait frame. Validate the
          // visible frame; every ordinary figure still uses its full image bounds.
          const frame = child.matches("img[data-textbook-portrait-atlas]")
            ? child.parentElement
            : null;
          const speaker = frame?.closest<HTMLElement>(
            ".tb-dialogue-atlas[data-speaker-id]",
          )?.dataset.speakerId;
          const visible =
            frame?.matches(".tb-portrait-frame") &&
            speaker &&
            atlasSpeakers.includes(speaker) &&
            getComputedStyle(frame).overflow === "hidden"
              ? frame
              : child;
          const r = visible.getBoundingClientRect();
          const bleedPx =
            child.dataset.textbookDecorativeBleedMm === "4"
              ? (4 * 96) / 25.4
              : 0;
          if (
            r.left < rect.left - 1.89 - bleedPx ||
            r.right > rect.right + 1.89 + bleedPx
          )
            throw new Error(
              `Math/figure width overflow: ${element.dataset.measureId}`,
            );
        }
        return {
          blockId: element.dataset.measureId!,
          heightMm: Math.ceil(((rect.height * 25.4) / 96) * 100) / 100,
          widthMm: (rect.width * 25.4) / 96,
        };
      }),
    TEXTBOOK_CHARACTERS.map((character) => `tb-portrait-${character.id}`),
  );
  return measured.map((block) => ({
    ...block,
    ...(introFits[block.blockId] === undefined
      ? {}
      : { introTextFits: introFits[block.blockId] }),
  }));
}

export async function validateRenderedPages(
  page: Page,
  model: TextbookRenderModel,
  pages: TextbookPage[],
): Promise<QrPlacement[]> {
  const result = await page.evaluate(
    ({ expected, bodyBottom, tolerance, atlasSpeakers }) => {
      const scale = 25.4 / 96,
        qr: QrPlacement[] = [];
      const paper = Array.from(
        document.querySelectorAll<HTMLElement>("[data-textbook-page]"),
      );
      if (paper.length !== expected)
        throw new Error("Rendered page count mismatch");
      paper.forEach((page, index) => {
        const pageRect = page.getBoundingClientRect();
        if (
          Math.abs(pageRect.width * scale - 210) > tolerance ||
          Math.abs(pageRect.height * scale - 297) > tolerance
        )
          throw new Error("A4 dimensions mismatch");
        for (const block of page.querySelectorAll<HTMLElement>(".tb-block")) {
          const rect = block.getBoundingClientRect();
          if (
            (rect.bottom - pageRect.top) * scale > bodyBottom + tolerance ||
            rect.left < pageRect.left ||
            rect.right > pageRect.right
          )
            throw new Error(`Block outside page: ${block.dataset.blockId}`);
          const children = block.querySelectorAll<HTMLElement>(
            ".tb-block-inner, .tb-prose, .katex-html, img, table, .tb-qr, .tb-work-lines",
          );
          for (const child of children) {
            const frame = child.matches("img[data-textbook-portrait-atlas]")
              ? child.parentElement
              : null;
            const speaker = frame?.closest<HTMLElement>(
              ".tb-dialogue-atlas[data-speaker-id]",
            )?.dataset.speakerId;
            const visible =
              frame?.matches(".tb-portrait-frame") &&
              speaker &&
              atlasSpeakers.includes(speaker) &&
              getComputedStyle(frame).overflow === "hidden"
                ? frame
                : child;
            const c = visible.getBoundingClientRect();
            const bleedMm =
              child.dataset.textbookDecorativeBleedMm === "4" ? 4 : 0;
            if (
              (c.bottom - rect.bottom) * scale > tolerance ||
              (rect.top - c.top) * scale > tolerance ||
              (rect.left - c.left) * scale > tolerance + bleedMm ||
              (c.right - rect.right) * scale > tolerance + bleedMm ||
              (pageRect.left - c.left) * scale > tolerance ||
              (c.right - pageRect.right) * scale > tolerance
            )
              throw new Error(`Content overflow: ${block.dataset.blockId}`);
          }
        }
        for (const figure of page.querySelectorAll<HTMLElement>(
          "[data-qr-id]",
        )) {
          const image = figure.querySelector("img")!;
          const rect = image.getBoundingClientRect();
          qr.push({
            qrTargetId: figure.dataset.qrId!,
            url: figure.dataset.qrUrl!,
            pdfPageNumber: index + 1,
            physicalPageIndex: Number(page.dataset.textbookPage),
            xMm: (rect.left - pageRect.left) * scale,
            yMm: (rect.top - pageRect.top) * scale,
            widthMm: rect.width * scale,
            heightMm: rect.height * scale,
          });
        }
      });
      return qr;
    },
    {
      expected: pages.length,
      bodyBottom: A4.bodyBottomMm,
      tolerance: A4.toleranceMm,
      atlasSpeakers: TEXTBOOK_CHARACTERS.map(
        (character) => `tb-portrait-${character.id}`,
      ),
    },
  );
  const targets = modelQrTargets(model);
  if (result.length !== targets.length)
    throw new Error("QR placement count differs from manuscript targets");
  const expected = new Map<string, number>();
  for (const qr of targets) {
    const key = `${qr.id}:${qr.url}`;
    expected.set(key, (expected.get(key) ?? 0) + 1);
  }
  for (const qr of result) {
    const key = `${qr.qrTargetId}:${qr.url}`;
    const remaining = expected.get(key) ?? 0;
    if (remaining < 1) throw new Error("Unexpected QR placement");
    expected.set(key, remaining - 1);
  }
  if ([...expected.values()].some((n) => n !== 0))
    throw new Error("Unrendered QR target");
  return result;
}

/** Bounded server-owned chunk. No submitted HTML/PDF and no remote resource fetch is accepted. */
export async function renderTextbookChunk(
  input: RenderTextbookChunkInput,
): Promise<TextbookChunkResult> {
  const started = performance.now();
  if (input.signal?.aborted) throw new Error("Textbook render aborted");
  const { exchange, officialOrigin } = input;
  input.onProgress?.("integrity");
  const integrityIssues = await validateTextbookIntegrity(exchange, {
    mode: input.mode ?? "publish",
    officialOrigin,
    requirePageMap: false,
    verifyManifest: false,
    readAsset: input.readAsset,
  });
  const failures = integrityIssues.filter(
    (issue) => issue.severity === "error",
  );
  if (failures.length) throw new TextbookIntegrityError(failures);
  let wholeModel = createTextbookRenderModel(exchange, input.variant);
  if (
    !input.sectionIndices.length ||
    input.sectionIndices.length > 8 ||
    input.sectionIndices.some(
      (n, i) =>
        !Number.isSafeInteger(n) ||
        n < 0 ||
        n >= wholeModel.sections.length ||
        (i > 0 && n !== input.sectionIndices[i - 1] + 1),
    )
  )
    throw new Error("Render chunks require 1–8 contiguous valid sections");
  if (input.studentPages) {
    if (input.variant !== "answers")
      throw new Error("Student page references are only accepted for answers");
    const studentModel = createTextbookRenderModel(exchange, "student");
    const pageMap = studentPageMapFromPages(
      input.sectionIndices.map((i) => studentModel.sections[i]),
      input.studentPages,
      exchange.config,
    );
    wholeModel = createTextbookRenderModel(
      { ...exchange, pageMap },
      input.variant,
    );
  }
  if (input.referencePages)
    wholeModel = withTextbookPageReferences(wholeModel, input.referencePages);
  const model = {
    ...wholeModel,
    sections: input.sectionIndices.map((i) => wholeModel.sections[i]),
  };
  if (
    model.sections.reduce((sum, section) => sum + section.blocks.length, 0) >
    600
  )
    throw new Error(
      "Render chunk exceeds 600 projected blocks; split sections before publishing",
    );
  const sizingModel = dialogueMeasurementModel(wholeModel, model);
  const recallProbes = recallMeasurementModel(
    createTextbookRenderModel(exchange, "answers"),
    model,
  );
  assertRecoveryMeasurementBudget(sizingModel, recallProbes);
  if (
    continuesTextbookSection(
      wholeModel.sections[input.sectionIndices[0] - 1],
      model.sections[0],
    ) ||
    (wholeModel.sections[input.sectionIndices.at(-1)! + 1] &&
      continuesTextbookSection(
        model.sections.at(-1),
        wholeModel.sections[input.sectionIndices.at(-1)! + 1],
      ))
  )
    throw new Error(
      "CHUNK_CONTINUATION: keep a section and its continued sections in the same chunk",
    );
  if (model.sections.reduce((sum, s) => sum + s.blocks.length, 0) > 600)
    throw new Error(
      "Render chunk exceeds 600 blocks; split sections before publishing",
    );
  const [bundle, assets, qrs] = await Promise.all([
    loadTextbookLocalBundle(),
    loadTextbookAssets(model.assets, input.readAsset),
    generateTextbookQrs(model, officialOrigin),
  ]);
  const resources = new Map([...bundle.resources, ...assets]);
  const resolver: RenderResources = {
    editorialAssetUrl: editorialResourceUrl,
    assetUrl: (id) => {
      const url = `${RESOURCE_ORIGIN}/assets/${encodeURIComponent(id)}`;
      if (!resources.has(url)) throw new Error(`Missing asset ${id}`);
      return url;
    },
    qrDataUrl: (id, url) => {
      const image = qrs.get(id);
      if (!image || image.url !== url)
        throw new Error("QR target was not reserved");
      return image.dataUrl;
    },
  };
  const browser = input.browser ?? (await launchExportBrowser());
  const ownedBrowser = !input.browser;
  const { page, errors } = await trustedPage(browser, resources);
  const abort = () => {
    void page.close();
  };
  const timer = setTimeout(abort, 180_000);
  input.signal?.addEventListener("abort", abort, { once: true });
  try {
    input.onProgress?.("measuring");
    await loadReady(
      page,
      textbookHtmlDocument(
        model.title,
        measurementHtml(sizingModel, resolver) +
          recallMeasurementHtml(recallProbes, resolver),
        bundle.fontCss,
        bundle.katexCss,
      ),
    );
    const recoveryMeasurements = await page.evaluate(
      measureRecoveryDom,
      recoveryMeasurePlan(sizingModel, input.firstPhysicalPageIndex),
    );
    applyRecoveryMeasurements(model, recoveryMeasurements);
    await loadReady(
      page,
      textbookHtmlDocument(
        model.title,
        measurementHtml(model, resolver),
        bundle.fontCss,
        bundle.katexCss,
      ),
    );
    const measured = await measure(page);
    input.onProgress?.("layout");
    const includeCover =
      input.sectionIndices[0] === 0 &&
      exchange.config.print.coverMode === "included" &&
      input.firstPhysicalPageIndex ===
        exchange.config.print.firstPhysicalPageIndex;
    const layout = paginateTextbookSections(
      model.sections,
      measured,
      model.config,
      {
        firstPhysicalPageIndex: input.firstPhysicalPageIndex,
        includeCover,
        previousSectionKey:
          wholeModel.sections[input.sectionIndices[0] - 1]?.sectionKey,
        previousTemplateKey:
          wholeModel.sections[input.sectionIndices[0] - 1]?.templateKey,
        maxPages: input.maxPages ?? 32,
      },
    );
    // Writing-space alignment is a student layout constraint, not answer padding.
    if (input.variant === "student")
      alignTextbookSpreads(layout.pages, model.sections);
    const sourceWritingIds = sourceWritingBlockIds(model);
    if (sourceWritingIds.length) {
      await loadReady(
        page,
        textbookHtmlDocument(
          model.title,
          layout.pages
            .map((p) =>
              renderPageHtml(
                p,
                model,
                resolver,
                input.referencePages ?? layout.pages,
              ),
            )
            .join(""),
          bundle.fontCss,
          bundle.katexCss,
        ),
      );
      applySourceWriting(
        model,
        layout,
        await page.evaluate(measureSourceWritingDom, {
          blockIds: sourceWritingIds,
        }),
      );
    }
    if (input.reservedPages)
      assertTextbookReferenceLayoutUnchanged(input.reservedPages, layout.pages);
    const body = layout.pages
      .map((p) =>
        renderPageHtml(
          p,
          model,
          resolver,
          input.referencePages ?? layout.pages,
        ),
      )
      .join("");
    await loadReady(
      page,
      textbookHtmlDocument(model.title, body, bundle.fontCss, bundle.katexCss),
    );
    const qrPlacements = await validateRenderedPages(page, model, layout.pages);
    if (errors.length) throw new Error(errors.join("\n"));
    if (input.signal?.aborted) throw new Error("Textbook render aborted");
    input.onProgress?.("pdf");
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      timeout: 60_000,
    });
    input.onProgress?.("qr");
    const qrChecks = await verifyPdfQrPixels(
      browser,
      pdf,
      qrPlacements,
      layout.pages.length,
      { signal: input.signal },
    );
    const inlineResolver: RenderResources = {
      ...resolver,
      editorialAssetUrl: (name) =>
        dataUrl(resources.get(editorialResourceUrl(name))!),
      assetUrl: (id) => dataUrl(resources.get(resolver.assetUrl(id))!),
    };
    const sharedImages = shareInlineTextbookImages(
      layout.pages
        .map((p) =>
          renderPageHtml(
            p,
            model,
            inlineResolver,
            input.referencePages ?? layout.pages,
          ),
        )
        .join(""),
    );
    const html = textbookHtmlDocument(
      model.title,
      sharedImages.body,
      inlineBundleCss(bundle.fontCss, resources) + "\n" + sharedImages.css,
      inlineBundleCss(bundle.katexCss, resources),
    );
    return {
      pdf,
      html,
      pageMap: layout.pageMap,
      pages: layout.pages,
      qrPlacements,
      qrChecks,
      issues: [...integrityIssues, ...layout.issues],
      artifactHash: sha256(pdf),
      nextPhysicalPageIndex: layout.nextPhysicalPageIndex,
      metrics: {
        elapsedMs: performance.now() - started,
        htmlBytes: Buffer.byteLength(html),
        pdfBytes: pdf.length,
        measuredBlocks: measured.length,
      },
    };
  } finally {
    clearTimeout(timer);
    input.signal?.removeEventListener("abort", abort);
    await page.close().catch(() => undefined);
    if (ownedBrowser) await browser.close();
  }
}

export interface MergedTextbookPdf {
  pdf: Uint8Array;
  artifactHash: string;
  pageCount: number;
  qrChecks: QrPixelCheck[];
  qrPlacements: QrPlacement[];
}
export async function mergeTextbookPdfs(
  chunks: readonly Pick<
    TextbookChunkResult,
    "pdf" | "pages" | "qrPlacements" | "artifactHash"
  >[],
  maxBytes = 128 * 1024 * 1024,
  suppliedBrowser?: Browser,
): Promise<MergedTextbookPdf> {
  if (!chunks.length || chunks.length > 500)
    throw new Error("PDF merge chunk count invalid");
  const output = await PDFDocument.create();
  const targets: QrPlacement[] = [];
  let offset = 0,
    bytesIn = 0;
  let expectedPhysical = chunks[0].pages[0]?.physicalPageIndex;
  for (const chunk of chunks) {
    if (
      !chunk.pages.length ||
      chunk.pages.some((p, i) => p.physicalPageIndex !== expectedPhysical! + i)
    )
      throw new Error(
        "PDF chunks are missing, repeated or out of physical order",
      );
    expectedPhysical! += chunk.pages.length;
    bytesIn += chunk.pdf.length;
    if (bytesIn > maxBytes)
      throw new Error(
        "PDF_VOLUME_REQUIRED: verified volumes must be delivered separately",
      );
    if (sha256(chunk.pdf) !== chunk.artifactHash)
      throw new Error("Persisted PDF chunk hash mismatch");
    const source = await PDFDocument.load(chunk.pdf, { updateMetadata: false });
    if (source.getPageCount() !== chunk.pages.length)
      throw new Error("PDF chunk page count mismatch");
    const copied = await output.copyPages(source, source.getPageIndices());
    copied.forEach((p) => output.addPage(p));
    targets.push(
      ...chunk.qrPlacements.map((p) => ({
        ...p,
        pdfPageNumber: p.pdfPageNumber + offset,
      })),
    );
    offset += source.getPageCount();
  }
  const pdf = await output.save({ useObjectStreams: true });
  if (pdf.length > maxBytes)
    throw new Error("PDF_VOLUME_REQUIRED: merged PDF exceeds storage limit");
  const browser = suppliedBrowser ?? (await launchExportBrowser());
  try {
    const qrChecks = await verifyPdfQrPixels(browser, pdf, targets, offset);
    return {
      pdf,
      artifactHash: sha256(pdf),
      pageCount: offset,
      qrChecks,
      qrPlacements: targets,
    };
  } finally {
    if (!suppliedBrowser) await browser.close();
  }
}

/** Rebind two A4 pages to a 420mm spread; all QRs are decoded from this final artifact too. */
export async function createTextbookSpreadPdf(
  original: MergedTextbookPdf,
  firstPhysicalPageIndex: number,
  suppliedBrowser?: Browser,
): Promise<MergedTextbookPdf> {
  if (
    sha256(original.pdf) !== original.artifactHash ||
    !Number.isSafeInteger(firstPhysicalPageIndex) ||
    firstPhysicalPageIndex < 1
  )
    throw new Error("Invalid spread source");
  const source = await PDFDocument.load(original.pdf),
    output = await PDFDocument.create();
  const targets: QrPlacement[] = [];
  for (let i = 0; i < source.getPageCount();) {
    const pairCount =
      (firstPhysicalPageIndex + i) % 2 === 0 && i + 1 < source.getPageCount()
        ? 2
        : 1;
    const sourcePages = source.getPages().slice(i, i + pairCount);
    const embedded = await output.embedPages(sourcePages);
    const width = embedded[0].width,
      height = embedded[0].height;
    const spread = output.addPage([width * pairCount, height]);
    embedded.forEach((p, index) =>
      spread.drawPage(p, { x: index * width, y: 0 }),
    );
    for (const target of original.qrPlacements.filter(
      (p) => p.pdfPageNumber > i && p.pdfPageNumber <= i + pairCount,
    ))
      targets.push({
        ...target,
        pdfPageNumber: output.getPageCount(),
        xMm: target.xMm + ((target.pdfPageNumber - i - 1) * width * 25.4) / 72,
      });
    i += pairCount;
  }
  const pdf = await output.save(),
    browser = suppliedBrowser ?? (await launchExportBrowser());
  try {
    const qrChecks = await verifyPdfQrPixels(
      browser,
      pdf,
      targets,
      output.getPageCount(),
    );
    return {
      pdf,
      artifactHash: sha256(pdf),
      pageCount: output.getPageCount(),
      qrChecks,
      qrPlacements: targets,
    };
  } finally {
    if (!suppliedBrowser) await browser.close();
  }
}

/** Store each returned artifact and its manifest as a volume when one merged file is too large. */
export async function mergeTextbookPdfVolumes(
  chunks: Parameters<typeof mergeTextbookPdfs>[0],
  maxBytes = 128 * 1024 * 1024,
  browser?: Browser,
): Promise<MergedTextbookPdf[]> {
  if (maxBytes < 1024 * 1024)
    throw new Error("PDF volume limit must allow at least 1 MiB");
  const result: MergedTextbookPdf[] = [];
  let group: (typeof chunks)[number][] = [],
    size = 0;
  for (const chunk of chunks) {
    if (chunk.pdf.length > maxBytes * 0.8)
      throw new Error("PDF_CHUNK_TOO_LARGE: render fewer sections per chunk");
    if (size + chunk.pdf.length > maxBytes * 0.8 && group.length) {
      result.push(await mergeTextbookPdfs(group, maxBytes, browser));
      group = [];
      size = 0;
    }
    group.push(chunk);
    size += chunk.pdf.length;
  }
  if (group.length)
    result.push(await mergeTextbookPdfs(group, maxBytes, browser));
  if (!result.length) throw new Error("No PDF chunks to export");
  return result;
}

export function planTextbookChunks(
  exchange: TextbookExchange,
  maximumSections = 4,
): number[][] {
  if (
    !Number.isSafeInteger(maximumSections) ||
    maximumSections < 1 ||
    maximumSections > 8
  )
    throw new Error("Chunk section limit must be 1–8");
  const sections = createTextbookRenderModel(exchange, "student").sections,
    result: number[][] = [];
  const chains: number[][] = [];
  sections.forEach((section, i) => {
    if (continuesTextbookSection(sections[i - 1], section)) {
      chains.at(-1)!.push(i);
    } else {
      chains.push([i]);
    }
  });
  let group: number[] = [];
  for (const chain of chains) {
    if (chain.length > 8)
      throw new Error(
        "CHUNK_CONTINUATION: split a chain of more than eight continued sections in the manuscript",
      );
    // Each automatic lesson includes several recall forms and needs its own
    // bounded render job. Manual continuation chains remain together.
    const automaticLesson = chain.some((i) =>
      sections[i].templateKey.startsWith("auto-lesson"),
    );
    if (
      group.length &&
      (automaticLesson || group.length + chain.length > maximumSections)
    ) {
      result.push(group);
      group = [];
    }
    group.push(...chain);
    if (automaticLesson) {
      result.push(group);
      group = [];
    }
  }
  if (group.length) result.push(group);
  return result;
}

/** Whole-edition single file from verified placements; never concatenates submitted HTML. */
export async function renderTextbookOfflineHtml(input: {
  exchange: TextbookExchange;
  pages: readonly TextbookPage[];
  readAsset: ReadTextbookAsset;
  officialOrigin: string;
  variant: TextbookVariant;
  /** Explicit teacher archive contains the full frozen exchange, including answers. */
  includeTeacherArchiveData?: boolean;
}): Promise<string> {
  if (input.includeTeacherArchiveData && input.variant !== "answers")
    throw new Error("Student HTML cannot contain teacher archive data");
  if (!input.pages.length || input.pages.length > 5000)
    throw new Error("Offline page count exceeded");
  await assertTextbookIntegrity(input.exchange, {
    mode: "archive",
    readAsset: input.readAsset,
  });
  const model = createTextbookRenderModel(input.exchange, input.variant);
  const [bundle, assets, qrs] = await Promise.all([
    loadTextbookLocalBundle(),
    loadTextbookAssets(model.assets, input.readAsset),
    generateTextbookQrs(model, input.officialOrigin),
  ]);
  const resolver: RenderResources = {
    editorialAssetUrl: (name) =>
      dataUrl(bundle.resources.get(editorialResourceUrl(name))!),
    assetUrl: (id) => {
      const r = assets.get(
        `${RESOURCE_ORIGIN}/assets/${encodeURIComponent(id)}`,
      );
      if (!r) throw new Error(`Missing offline asset ${id}`);
      return dataUrl(r);
    },
    qrDataUrl: (id, url) => {
      const q = qrs.get(id);
      if (!q || q.url !== url) throw new Error("Missing offline reserved QR");
      return q.dataUrl;
    },
  };
  const seen = new Set<number>();
  let body = input.pages
    .map((page, i) => {
      if (
        seen.has(page.physicalPageIndex) ||
        (i &&
          page.physicalPageIndex !== input.pages[i - 1].physicalPageIndex + 1)
      )
        throw new Error("Offline pages must preserve physical order");
      seen.add(page.physicalPageIndex);
      return renderPageHtml(page, model, resolver, input.pages);
    })
    .join("");
  const sharedImages = shareInlineTextbookImages(body);
  body = sharedImages.body;
  if (input.includeTeacherArchiveData) {
    const data = canonicalJson(input.exchange).replace(
      /[<>&\u2028\u2029]/g,
      (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
    );
    body += `<script type="application/json" id="textbook-exchange">${data}</script>`;
  }
  const html = textbookHtmlDocument(
    model.title,
    body,
    inlineBundleCss(bundle.fontCss, bundle.resources) + "\n" + sharedImages.css,
    inlineBundleCss(bundle.katexCss, bundle.resources),
  );
  if (Buffer.byteLength(html) > 128 * 1024 * 1024)
    throw new Error("OFFLINE_VOLUME_REQUIRED: HTML exceeds 128 MiB");
  return html;
}

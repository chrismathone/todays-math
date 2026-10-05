/** Final, print-media DOM extraction with explicit model/placement population accounting. */
import type { Page } from "puppeteer-core";
import type { TextbookPage } from "../../../../src/lib/textbook/layout/paginate";
import type { TextbookRenderModel } from "../../../../src/lib/textbook/render/model";

export const anchorMappings = [
  [".running", ".tb-header"],
  [".page-head", ".tb-stage-head"],
  [".page-head h1", ".tb-section-heading"],
  [".page-head p", ".tb-stage-subtitle"],
  [".progress", ".tb-progress"],
  [".content", ".tb-reference-content,[data-source-body]"],
  [".edge-tab", ".tb-edge-tab"],
  [".foot", ".tb-footer"],
  [".foot b", ".tb-footer strong"],
  [".foot .name", ".tb-footer-brand"],
  [".master-row", "[data-row-key]"],
  [
    ".master-row .label",
    "[data-row-key] .tb-memory-label,[data-row-key] .tb-row-label,[data-row-key] .tb-master-label,[data-row-key] .label",
  ],
  [".paired-cols", ".tb-paired-cols,.paired-cols"],
  [".paired-cols > .worked", ".tb-paired-worked"],
  [".study-footer", ".study-footer"],
  [".study-footer > span", ".study-footer > span"],
  [
    ".checkbar",
    ".tb-source-study-footer > .checkbar,.tb-source-page-footer > .checkbar,.tb-reference-content .tb-recall-checkbar",
  ],
  [
    ".page-end-note",
    ".tb-source-study-footer,.tb-source-page-footer,.tb-dialogue-page-note",
  ],
  [
    ".script-continue",
    ".tb-source-page-footer > .script-continue,.tb-dialogue-page-note",
  ],
  [".twins", ".tb-confirm-problems,.twins"],
  [".script-board", ".tb-board,.tb-dialogue-board"],
  [".chat-bubble", ".tb-bubble"],
  [".chat-person", ".tb-portrait"],
  [".portrait-frame", ".tb-portrait-frame"],
  [".chat-name", ".tb-portrait-name"],
  [".script-head", ".tb-script-head,.script-head"],
  [".rule-box", ".rule-box"],
  [".section-label", ".section-label"],
  ["table", ".tb-source-fragments table"],
  [".chapter-title", ".tb-source-fragments .chapter-title"],
  [".chapter-hero", ".tb-source-fragments .chapter-hero"],
  [".chapter-hero img", ".tb-source-fragments .chapter-hero img"],
  [".daily-banner", ".tb-source-fragments .daily-banner"],
  [".return-strip", ".tb-source-fragments .return-strip"],
  [".q", ".tb-source-problem"],
  [".qhead", ".tb-source-problem .tb-problem-head"],
  [".qid", ".tb-source-problem .tb-problem-head > strong"],
  [".prompt", ".tb-source-problem .tb-problem-question > .tb-prose"],
  [
    ".work",
    ".tb-source-problem .tb-work-area:not([data-empty-work]),.tb-source-fragments .work",
  ],
] as const;
interface NativeWritingArea {
  id: string;
  selector: string;
  ordinal: number;
  questionId?: string | null;
  boxMm: number[];
  lines: { boxMm: number[]; thicknessMm: number }[];
  referencePdfVectors: {
    x0: number;
    x1: number;
    y: number;
    thicknessMm: number;
  }[];
}
export interface SourceGeometry {
  nativeWritingReference?: { originalPdfSha256: string; domSha256: string };
  pages: {
    physicalPageIndex: number;
    anchors: {
      id: string;
      selector: string;
      ordinal: number;
      boxMm: number[];
    }[];
    nativeWritingAreas?: NativeWritingArea[];
    nativeQuestionWritingAreas?: NativeWritingArea[];
  }[];
}

export async function captureDomWitness(
  page: Page,
  model: TextbookRenderModel,
  placements: readonly TextbookPage[],
  source?: SourceGeometry,
) {
  await page.emulateMediaType("print");
  await page.evaluate("globalThis.__name = (fn) => fn");
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((i) => i.decode()));
  });
  const blocks = model.sections.flatMap((s) => s.blocks);
  const captured = await page.evaluate(
    ({ blocks, placements, mappings, source, variant }) => {
      const blockById = new Map(blocks.map((b) => [b.id, b]));
      const hasNativeWriting = (
        fragments: {
          attributes?: { className?: string };
          children?: unknown[];
        }[],
      ): boolean =>
        fragments.some(
          (fragment) =>
            fragment.attributes?.className
              ?.split(/\s+/)
              .some((name) => ["work", "recall-rules"].includes(name)) ||
            hasNativeWriting((fragment.children ?? []) as typeof fragments),
        );
      const mm = 25.4 / 96;
      const phaseStarts = new Map<string, number>();
      const fontFaces = Array.from(document.fonts).map((font) => ({
        family: font.family.replace(/["']/g, ""),
        weight: font.weight,
        status: font.status,
      }));
      const loadedRequiredFaces = ["400", "700"].every((weight) =>
        fontFaces.some(
          (font) =>
            font.family === "TextbookPretendard" &&
            font.weight === weight &&
            font.status === "loaded",
        ),
      );
      const pages = Array.from(
        document.querySelectorAll<HTMLElement>("[data-textbook-page]"),
      ).map((paper) => {
        const pr = paper.getBoundingClientRect(),
          physicalPageIndex = Number(paper.dataset.textbookPage);
        const rect = (e: Element) => {
          const r = e.getBoundingClientRect();
          return [
            r.left - pr.left,
            r.top - pr.top,
            r.right - pr.left,
            r.bottom - pr.top,
          ].map((v) => v * mm);
        };
        const placed = placements.find(
          (p) => p.physicalPageIndex === physicalPageIndex,
        );
        const elements = Array.from(
          paper.querySelectorAll<HTMLElement>("[data-block-id]"),
        );
        const sourcePage = Number(
          /^reference-p(\d+)$/.exec(paper.dataset.sectionKey ?? "")?.[1] ?? 0,
        );
        const original = source?.pages.find(
          (p) => p.physicalPageIndex === sourcePage,
        );
        const anchorAccounting = mappings.flatMap(([from, to]) => {
          const wanted =
            variant === "student"
              ? (original?.anchors.filter((a) => a.selector === from) ?? [])
              : [];
          const actual = Array.from(paper.querySelectorAll<HTMLElement>(to));
          return wanted.map((expected, i) => ({
            id: expected.id,
            sourceSelector: from,
            renderSelector: to,
            found: !!actual[i],
            expectedCount: wanted.length,
            actualCount: actual.length,
            referenceBoxMm: expected.boxMm,
            ...(actual[i]
              ? {
                  boxMm:
                    from === ".q" && actual[i].dataset.exampleRole === "example"
                      ? (() => {
                          // Native .q excludes the separate public solution. Measure
                          // the rendered header+question union, including any figure.
                          const parts = Array.from(
                            actual[i].querySelectorAll(
                              ".tb-problem-head,.tb-problem-question",
                            ),
                          ).map(rect);
                          return parts.length
                            ? [
                                Math.min(...parts.map((b) => b[0])),
                                Math.min(...parts.map((b) => b[1])),
                                Math.max(...parts.map((b) => b[2])),
                                Math.max(...parts.map((b) => b[3])),
                              ]
                            : rect(actual[i]);
                        })()
                      : rect(actual[i]),
                  geometryMethod:
                    from === ".q" && actual[i].dataset.exampleRole === "example"
                      ? "actual-header-and-question-union-excluding-separate-public-solution"
                      : "actual-element-border-box",
                }
              : {}),
          }));
        });
        const nodes = elements.flatMap((el) => {
          const b = blockById.get(el.dataset.blockId!),
            continuation =
              (b && "continuation" in b && b.continuation === true) ||
              el.classList.contains("tb-continuation");
          const base = {
            id: el.dataset.blockId,
            itemId: el.dataset.itemId,
            activity:
              el.dataset.activity ??
              el.querySelector<HTMLElement>("[data-activity]")?.dataset
                .activity ??
              null,
            expectedActivity: b?.semantic?.activity ?? null,
            kind: b?.kind,
            sourceBlockId: b?.sourceBlockId,
            boxMm: rect(el),
            role: "content",
            modelFound: !!b,
            ...(continuation
              ? {
                  continuation: true,
                  titlePresent: !!paper.querySelector(
                    ".tb-section-heading,.tb-continuation-title,.tb-concept-title,.tb-recall-title",
                  ),
                  continuationLabelPresent: !!paper.querySelector(
                    "[data-continuation],.tb-continuation-label,.tb-concept-continuation,.tb-recall-continuation",
                  ),
                }
              : {}),
            ...(b?.kind === "problem"
              ? {
                  displayNumber:
                    el
                      .querySelector(".tb-problem-head strong")
                      ?.textContent?.trim() ?? null,
                  expectedDisplayNumber: b.displayNumber,
                }
              : {}),
          };
          return [
            base,
            ...Array.from(
              el.querySelectorAll<HTMLElement>(
                ".tb-answer,.tb-worked-answer,.tb-worked-solution,[data-role='answer'],[data-role='solution'],[data-role='teacher-answer']",
              ),
            ).map((n, i) => ({
              ...base,
              id: `${base.id}.role${i}`,
              boxMm: rect(n),
              role:
                n.dataset.role ??
                (n.matches(".tb-worked-solution") ? "solution" : "answer"),
            })),
          ];
        });
        const references = Array.from(
          paper.querySelectorAll<HTMLElement>(".tb-reference-row"),
        ).map((row) => {
          const owner = row.closest<HTMLElement>("[data-block-id]");
          const label = row.querySelector<HTMLElement>(
            ":scope > span:first-child",
          );
          const number = row.querySelector<HTMLElement>(".tb-reference-page");
          return {
            blockId: owner?.dataset.blockId ?? null,
            key: row.dataset.referenceKey ?? null,
            label: label?.textContent?.trim() ?? null,
            pageLabel: number?.textContent?.trim() ?? null,
            boxMm: rect(row),
            labelBoxMm: label ? rect(label) : null,
            pageBoxMm: number ? rect(number) : null,
          };
        });
        const rows = Array.from(
          paper.querySelectorAll<HTMLElement>("[data-row-key]"),
        ).map((el) => {
          const owner = el.closest<HTMLElement>("[data-block-id]"),
            b = blockById.get(owner?.dataset.blockId ?? "");
          const phase =
            el.dataset.phase ??
            el.closest<HTMLElement>("[data-phase]")?.dataset.phase;
          const key = `${b?.unitKey}:${phase}`;
          if (!phaseStarts.has(key)) phaseStarts.set(key, physicalPageIndex);
          return {
            rowKey: el.dataset.rowKey,
            conceptId: el.dataset.conceptId,
            unitKey: b?.unitKey,
            phase,
            relativePageIndex: physicalPageIndex - phaseStarts.get(key)!,
            boxMm: rect(el),
            blockId: owner?.dataset.blockId,
            labelBoxMm: el.querySelector(
              ".label,.tb-memory-label,.tb-row-label,.tb-master-label",
            )
              ? rect(
                  el.querySelector(
                    ".label,.tb-memory-label,.tb-row-label,.tb-master-label",
                  )!,
                )
              : null,
          };
        });
        const writeCandidates = Array.from(
          paper.querySelectorAll<HTMLElement>(
            ".tb-work-lines,.tb-blank,.tb-semantic-lines,[data-writing-space],[data-write-box],.tb-source-fragments .work,.tb-source-fragments .recall-rules",
          ),
        );
        // Keep each writing container once; individual ruled lines are evidence within it.
        const writeElements = writeCandidates.filter(
          (e) =>
            !writeCandidates.some((other) => other !== e && other.contains(e)),
        );
        const writeBoxes = writeElements.map((el, i) => {
          const block = blockById.get(
            el.closest<HTMLElement>("[data-block-id]")?.dataset.blockId ?? "",
          );
          const sourceQuestionId =
            variant === "student" && el.closest(".tb-source-problem")
              ? block?.semantic?.source?.questionId
              : undefined;
          const nativeSelector =
            el.matches(".work,.recall-rules") &&
            !!el.closest(".tb-source-fragments")
              ? el.matches(".recall-rules")
                ? ".recall-rules"
                : ".work"
              : null;
          const nativeOrdinal = nativeSelector
            ? Array.from(
                paper.querySelectorAll(
                  `.tb-source-fragments ${nativeSelector}`,
                ),
              ).indexOf(el)
            : null;
          const nativeLines =
            nativeSelector || sourceQuestionId
              ? Array.from(
                  el.querySelectorAll<HTMLElement>(
                    nativeSelector ? ":scope > span" : ".tb-work-line",
                  ),
                ).map((line) => ({
                  boxMm: rect(line),
                  thicknessMm:
                    parseFloat(getComputedStyle(line).borderBottomWidth) * mm,
                }))
              : undefined;
          const nativeOriginal = nativeSelector
            ? original?.nativeWritingAreas?.find(
                (area) =>
                  area.selector === nativeSelector &&
                  area.ordinal === nativeOrdinal,
              )
            : sourceQuestionId
              ? original?.nativeQuestionWritingAreas?.find(
                  (area) => area.questionId === sourceQuestionId,
                )
              : undefined;
          const nativeReference =
            variant === "student" ? nativeOriginal : undefined;
          return {
            id: `${physicalPageIndex}.write${i}`,
            boxMm: rect(el),
            writingSpace:
              nativeSelector || sourceQuestionId
                ? "native-source"
                : el.dataset.writingSpace || "ruled",
            ...(nativeSelector || sourceQuestionId
              ? {
                  nativeSelector,
                  nativeOrdinal,
                  sourceQuestionId,
                  nativeLines,
                  nativeExpectedLineCount: nativeOriginal?.lines.length,
                  ...(variant === "student"
                    ? {
                        nativeReference,
                        nativeReferenceRequired: true,
                        nativeReferencePdfSha256:
                          source?.nativeWritingReference?.originalPdfSha256,
                        nativeReferenceDomSha256:
                          source?.nativeWritingReference?.domSha256,
                      }
                    : {}),
                }
              : {}),
            written: !!el.closest(
              ".tb-problem-wide,[data-learning-stage='written']",
            ),
            columnWidthMm:
              (el.closest(".tb-problem-question")?.getBoundingClientRect()
                .width ?? el.getBoundingClientRect().width) * mm,
          };
        });
        const qrs = Array.from(
          paper.querySelectorAll<HTMLElement>(".tb-qr,[data-qr-id]"),
        )
          .filter(
            (e, i, a) => !a.some((other, j) => i !== j && other.contains(e)),
          )
          .map((el, i) => ({
            id: el.dataset.qrId ?? `${physicalPageIndex}.qr${i}`,
            boxMm: rect(el),
          }));
        const clipElements = Array.from(
          paper.querySelectorAll<HTMLElement>(
            ".katex-html,img,svg,table,.tb-bubble,.tb-board,.tb-dialogue-board,.tb-prose p,.tb-semantic-line,.tb-work-line,.tb-write-line,.tb-memory-label,.tb-row-label,.label,.tb-source-fragments .work > span,.tb-source-fragments .recall-rules > span",
          ),
        );
        const clips = clipElements.map((el, i) => {
          // An atlas is intentionally cropped to its visible portrait frame.
          const visible = el.matches("img[data-textbook-portrait-atlas]")
            ? (el.closest<HTMLElement>(".tb-portrait-frame") ?? el)
            : el;
          const bounds = rect(paper);
          let owner = visible.parentElement;
          while (owner && owner !== paper) {
            const s = getComputedStyle(owner),
              r = rect(owner);
            if (s.overflowX === "hidden" || s.overflowX === "clip") {
              bounds[0] = Math.max(bounds[0], r[0]);
              bounds[2] = Math.min(bounds[2], r[2]);
            }
            if (s.overflowY === "hidden" || s.overflowY === "clip") {
              bounds[1] = Math.max(bounds[1], r[1]);
              bounds[3] = Math.min(bounds[3], r[3]);
            }
            owner = owner.parentElement;
          }
          return {
            id: `${physicalPageIndex}.clip${i}`,
            tag: el.tagName,
            boxMm: rect(visible),
            clipBoxMm: bounds,
            blockId:
              el.closest<HTMLElement>("[data-block-id]")?.dataset.blockId,
            blockBoxMm: el.closest<HTMLElement>("[data-block-id]")
              ? rect(el.closest<HTMLElement>("[data-block-id]")!)
              : null,
          };
        });
        const dialogueBoxes = Array.from(
          paper.querySelectorAll<HTMLElement>(".tb-bubble"),
        ).map((e, i) => ({
          id: `${physicalPageIndex}.speech${i}`,
          unitId: placed?.unitKey,
          boxMm: rect(e),
          fontSizePt: (parseFloat(getComputedStyle(e).fontSize) * 72) / 96,
        }));
        const expectedIds = placed?.blocks.map((b) => b.blockId) ?? [],
          actualIds = elements.map((e) => e.dataset.blockId!);
        const expectedQrIds = expectedIds.flatMap((id) => {
          const b = blockById.get(id);
          return b && "qr" in b && b.qr ? [b.qr.id] : [];
        });
        const missingQrIds = expectedQrIds.filter(
          (id) => !qrs.some((q) => q.id === id),
        );
        const expectedWritingIds = expectedIds.filter((id) => {
          const b = blockById.get(id);
          return (
            b?.semantic?.node?.kind === "writing" ||
            (b?.semantic?.node?.kind === "fragments" &&
              hasNativeWriting(b.semantic.node.fragments)) ||
            (b?.kind === "recall" &&
              b.answersVisible === false &&
              (b.displayRows?.some(
                (row) =>
                  row.hidden ||
                  row.pieces.some((piece) => piece.kind === "blank"),
              ) ||
                b.pieces.some((piece) => piece.kind === "blank"))) ||
            (b?.kind === "problem" &&
              b.answer === undefined &&
              !b.publicWorkedExample &&
              b.layout.preferredWorkLines > 0)
          );
        });
        const missingWritingIds = expectedWritingIds.filter(
          (id) =>
            !elements
              .find((e) => e.dataset.blockId === id)
              ?.querySelector(
                ".tb-work-lines,.tb-semantic-lines,.tb-blank,[data-writing-space],[data-write-box],.tb-source-fragments .work,.tb-source-fragments .recall-rules",
              ),
        );
        const missingActivityIds = nodes
          .filter(
            (node) =>
              node.expectedActivity && node.activity !== node.expectedActivity,
          )
          .map((node) => node.id);
        const missingNumberIds = nodes
          .filter(
            (node) =>
              "expectedDisplayNumber" in node &&
              node.displayNumber !== node.expectedDisplayNumber,
          )
          .map((node) => node.id);
        const missingBlocks = expectedIds.filter(
            (id) => !actualIds.includes(id),
          ),
          unexpectedBlocks = actualIds.filter(
            (id) => !expectedIds.includes(id),
          );
        const placementAnchors = elements.map((el) => {
          const position = placed?.blocks.find(
            (b) => b.blockId === el.dataset.blockId,
          );
          return {
            id: `placement:${el.dataset.blockId}`,
            boxMm: rect(el),
            referenceBoxMm: position
              ? [
                  position.xMm,
                  position.yMm,
                  position.xMm + position.widthMm,
                  position.yMm + position.heightMm,
                ]
              : null,
          };
        });
        return {
          physicalPageIndex,
          printedPageLabel:
            paper.querySelector(".tb-footer strong")?.textContent?.trim() ??
            null,
          widthMm: pr.width * mm,
          heightMm: pr.height * mm,
          sectionKey: paper.dataset.sectionKey,
          sourcePage: sourcePage || null,
          sourceReferenceFound: !!original,
          anchors: [
            {
              id: "A4.paper",
              boxMm: [0, 0, pr.width * mm, pr.height * mm],
              referenceBoxMm: [0, 0, 210, 297],
            },
            ...placementAnchors,
            ...anchorAccounting.filter((a) => a.found),
          ],
          anchorAccounting,
          rows,
          writeBoxes,
          qrs,
          clips,
          nodes,
          references,
          dialogueBoxes,
          accounting: {
            placementFound: !!placed,
            expectedBlocks: expectedIds.length,
            actualBlocks: actualIds.length,
            missingBlocks,
            unexpectedBlocks,
            duplicateBlocks: actualIds.filter(
              (id, i) => actualIds.indexOf(id) !== i,
            ),
            clipCandidates: clipElements.length,
            writeCandidates: writeElements.length,
            qrCandidates: qrs.length,
            expectedQrIds,
            missingQrIds,
            expectedWritingIds,
            missingWritingIds,
            missingActivityIds,
            missingNumberIds,
          },
          fontsLoaded:
            loadedRequiredFaces &&
            document.fonts.check("400 12px TextbookPretendard", "가나다") &&
            document.fonts.check("700 12px TextbookPretendard", "가나다"),
          fontFaces,
        };
      });
      return pages;
    },
    {
      blocks,
      placements,
      mappings: anchorMappings,
      source,
      variant: model.variant,
    },
  );
  return captured;
}

export function computedCoverage(
  pages: Awaited<ReturnType<typeof captureDomWitness>>,
  expectedPages: readonly TextbookPage[],
  expectedRows: Record<string, string[][]>,
  compareSource: boolean,
) {
  const complete =
    pages.length === expectedPages.length &&
    pages.every(
      (p) =>
        p.accounting.placementFound &&
        p.fontsLoaded &&
        !p.accounting.missingBlocks.length &&
        !p.accounting.unexpectedBlocks.length &&
        !p.accounting.duplicateBlocks.length,
    );
  const actualRows = pages.flatMap((p) => p.rows);
  const finiteBox = (box: unknown) =>
    Array.isArray(box) &&
    box.length === 4 &&
    box.every((v) => typeof v === "number" && Number.isFinite(v));
  const anchorGeometry = pages.every((p) =>
    p.anchors.every((a) => finiteBox(a.boxMm) && finiteBox(a.referenceBoxMm)),
  );
  const observedPhases = new Set([
    ...Object.keys(expectedRows),
    ...actualRows.map((row) => row.phase ?? "unphased"),
  ]);
  const rowComplete = [...observedPhases].every(
    (phase) =>
      JSON.stringify(
        actualRows
          .filter((r) => (r.phase ?? "unphased") === phase)
          .map((r) => [r.conceptId, r.rowKey]),
      ) === JSON.stringify(expectedRows[phase] ?? []),
  );
  return {
    anchors:
      complete &&
      anchorGeometry &&
      (!compareSource ||
        pages.every(
          (p) =>
            p.sourceReferenceFound &&
            p.anchorAccounting.length > 0 &&
            p.anchorAccounting.every(
              (a) => a.found && a.expectedCount === a.actualCount,
            ),
        )),
    rows: complete && rowComplete,
    writeBoxes:
      complete &&
      pages.every(
        (p) =>
          p.writeBoxes.length === p.accounting.writeCandidates &&
          p.writeBoxes.every(
            (write) =>
              write.writingSpace !== "native-source" ||
              !write.nativeReferenceRequired ||
              (write.nativeReference &&
                write.nativeLines?.length ===
                  write.nativeReference.lines.length &&
                /^[a-f0-9]{64}$/.test(write.nativeReferencePdfSha256 ?? "") &&
                /^[a-f0-9]{64}$/.test(write.nativeReferenceDomSha256 ?? "")),
          ) &&
          !p.accounting.missingWritingIds.length,
      ),
    qrs:
      complete &&
      pages.every(
        (p) =>
          p.qrs.length === p.accounting.qrCandidates &&
          !p.accounting.missingQrIds.length,
      ),
    nodes:
      complete &&
      pages.every(
        (p) =>
          p.nodes.every((n) => n.modelFound) &&
          !p.accounting.missingActivityIds.length &&
          !p.accounting.missingNumberIds.length,
      ),
    clips:
      complete &&
      pages.every((p) => p.clips.length === p.accounting.clipCandidates),
  };
}

/** Include unphased concept-card rows as well as the three memory forms. */
export function expectedRenderedRows(model: TextbookRenderModel) {
  const expected: Record<string, string[][]> = {};
  const seen = new Set<string>();
  for (const block of model.sections.flatMap((section) => section.blocks)) {
    const node = block.semantic?.node;
    if (!node || (node.kind !== "concept" && node.kind !== "rows")) continue;
    const conceptCard = block.kind === "concept" && node.kind === "concept";
    if (!conceptCard && block.kind !== "recall") continue;
    const phase = block.kind === "recall" ? block.phase : "unphased";
    const key = conceptCard ? block.id : `${block.sourceBlockId}:${phase}`;
    if (seen.has(key)) continue;
    seen.add(key);
    (expected[phase] ??= []).push(
      ...node.rows.map((row) => [
        node.kind === "concept" ? node.conceptId : "",
        row.rowKey,
      ]),
    );
  }
  return expected;
}

/** Chunk boundaries must not reset the observed phase-relative page split. */
export function normalizeRowPages(
  pages: Awaited<ReturnType<typeof captureDomWitness>>,
) {
  const starts = new Map<string, number>();
  for (const page of pages)
    for (const row of page.rows) {
      const key = `${row.unitKey}:${row.phase}`;
      if (!starts.has(key)) starts.set(key, page.physicalPageIndex);
      row.relativePageIndex = page.physicalPageIndex - starts.get(key)!;
    }
}

import type { TextbookExchange } from "@/contracts/textbookExchange.contract";
import {
  contentHash,
  snapshotHash,
  manifestHash,
} from "@/lib/textbook/hash.server";
import { CANONICALIZATION_VERSION } from "@/lib/textbook/canonical";
import {
  TEXTBOOK_RENDERER_VERSION,
  TEXTBOOK_TEMPLATE_VERSION,
} from "@/lib/textbook/render/versions";

export const SYNTHETIC_ORIGIN = "https://school.example.test";
export const fixtureUuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
/** Explicit synthetic source. These IDs never assert the presence of production Problem rows. */
export function textbookFixture(
  sectionCount = 1,
  problemsPerSection = 4,
): TextbookExchange {
  const result: TextbookExchange = {
    schemaVersion: "injaewon.textbook.exchange.v1",
    canonicalizationVersion: CANONICALIZATION_VERSION,
    exportedAt: "2026-10-03T00:00:00Z",
    config: {
      bookId: fixtureUuid(1),
      schoolLevel: "elementary",
      grade: 5,
      semester: 2,
      volume: 1,
      volumeCount: 1,
      displayCode: "SYNTHETIC-5-2",
      title: "합성 검증용 수학 교재",
      curriculumVersion: "2022",
      mode: "integrated",
      pageBudget: {
        target: sectionCount * 2 + 1,
        tolerance: 20,
        strict: false,
      },
      print: {
        paper: "A4",
        innerMarginMm: 18,
        outerMarginMm: 16,
        sectionStart: "even-left",
        coverMode: "included",
        firstPhysicalPageIndex: 1,
      },
      videoPolicy: "optional",
    },
    edition: {
      editionId: fixtureUuid(2),
      label: "합성 검증 1판",
      status: "draft",
      revision: 1,
      publishedAt: null,
      manifestHash: null,
    },
    units: [
      {
        unitKey: "synthetic-unit",
        title: "약수와 배수 · 합성 원고",
        sourceUnitIds: [],
        prerequisites: ["곱셈"],
        goals: ["공약수를 찾을 수 있다."],
        conceptLectureRefs: [],
        sections: [],
      },
    ],
    snapshots: [],
    items: [],
    assets: [],
    qrTargets: [],
    videoBindings: [],
    pageMap: [],
    rendererVersion: TEXTBOOK_RENDERER_VERSION,
    templateVersion: TEXTBOOK_TEMPLATE_VERSION,
  };
  for (let section = 0; section < sectionCount; section++) {
    const sectionKey = `section-${section}`;
    const blocks: TextbookExchange["units"][number]["sections"][number]["blocks"] =
      [];
    for (let p = 0; p < problemsPerSection; p++) {
      const n = section * problemsPerSection + p,
        snapshotId = `snapshot-${n}`,
        itemId = `item-${n}`,
        qrTargetId = `qr-${n}`,
        slug = `synthetic_target_${String(n).padStart(8, "0")}`;
      const payload = {
        format: "markdown-latex" as const,
        content: `두 수 $${12 + n}$와 $${18 + n}$의 공약수를 구하시오.`,
        answer: `비공개 정답 ${n}`,
        solution: `비공개 해설 ${n}`,
        questionType: "단답형",
        figures: [],
      };
      const snapshot: TextbookExchange["snapshots"][number] = {
        snapshotId,
        source: {
          system: "todays-math",
          problemId: fixtureUuid(n + 100),
          problemCode: `SYNTHETIC-${n}`,
        },
        sourceUpdatedAt: null,
        capturedAt: "2026-10-03T00:00:00Z",
        unitId: fixtureUuid(3),
        familyKey: "synthetic-only",
        difficulty: "기본",
        problemType: "합성",
        payload,
        contentHash: contentHash(payload),
        sourceMetadata: {
          unitId: fixtureUuid(3),
          grade: "초5",
          chapter: "약수와 배수",
          section: "공약수",
          difficulty: "기본",
          originalScore: 3,
        },
        rawSource: {
          figureUrls: [],
          figureDims: [],
          figureSourceMm: [],
          choiceFigureIndex: [],
          figureSvgAssetId: null,
        },
      };
      snapshot.snapshotHash = snapshotHash(snapshot);
      result.snapshots.push(snapshot);
      result.items.push({
        itemId,
        editionId: result.edition.editionId,
        snapshotId,
        linkStatus: "linked",
        sourceTestId: null,
        sourceTestProblemId: null,
        unitKey: "synthetic-unit",
        sectionKey,
        learningStage: "basic",
        displayNumber: String(n + 1).padStart(3, "0"),
        orderIndex: n,
        layout: {
          columnSpan: 1,
          minWorkLines: 18,
          preferredWorkLines: 18,
          maxWorkLines: 20,
          keepTogether: true,
        },
        qrTargetId,
      });
      result.qrTargets.push({
        qrTargetId,
        editionId: result.edition.editionId,
        itemId,
        slug,
        url: `${SYNTHETIC_ORIGIN}/q/${slug}`,
      });
      blocks.push({ blockId: `block-${n}`, kind: "problem", itemId });
    }
    result.units[0].sections.push({
      sectionKey,
      title: `연습 ${section + 1}`,
      templateKey: "practice",
      startPolicy: "even-left",
      blocks,
    });
  }
  return result;
}
export function publishedFixture(): TextbookExchange {
  const e = textbookFixture();
  e.pageMap = e.items.map((item, i) => ({
    itemId: item.itemId,
    physicalPageIndex: 2 + Math.floor(i / 2),
    printedPageLabel: String(2 + Math.floor(i / 2)),
    column: ((i % 2) + 1) as 1 | 2,
  }));
  e.edition.status = "published";
  e.edition.publishedAt = "2026-10-03T00:00:00Z";
  e.edition.manifestHash = manifestHash(e);
  return e;
}

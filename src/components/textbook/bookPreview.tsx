"use client";

import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  PaperStrip,
  type PaperStripPage,
} from "@/components/paper-strip/PaperStrip";
import {
  TextbookPageHost,
  TextbookPaperStyle,
} from "@/components/textbook/paper/TextbookPaper";
import type { TextbookConcept } from "@/contracts/textbookConcept.contract";
import type { PreviewMaterial, TextbookStudioApi } from "@/lib/textbook/client";
import type { TextbookPage } from "@/lib/textbook/layout/paginate";
import { measureTextbookPreview } from "@/lib/textbook/render/browser";
import type { TextbookRenderModel } from "@/lib/textbook/render/model";

import { withBrowserQrImages } from "./browserQr";
import { ContentPicker } from "./contentPicker";
import { messageOf } from "./measuredPreview";
import type { EditionDetail, SectionDetail } from "./model";
import { buildSectionPreview, type PreviewResources } from "./previewModel";
import { contentOutline } from "./simpleNavigation";
import styles from "./textbook.module.css";

/**
 * 완성 보기의 미리보기 — 교재 전체를 한 띠로 옆으로 넘겨 본다(원장님 2026-10-07 «전 페이지를 우스크롤로 · 개념 백지의 쪽 목록처럼»).
 *
 * 띠와 크게 보기는 공용 부품(`PaperStrip`)이고, 내용 고르기는 공용 창 틀(`PickerDialog`)이다. 이전 · 다음 단추와 배율 단추는 없다.
 * 조판은 지금처럼 **구획마다 따로** 한다 — 앞에서부터 차례로 불러와 측정해 띠에 이어 붙이고, 고른 구획은 차례를 앞당긴다.
 * 그래서 쪽 번호와 «앞 구획에 이어 붙는 자리»는 여기서 정해지지 않는다(PDF 에서 정해진다) — 쪽 아래에는 구획 이름과 그 구획 안의 차례만 적는다.
 * 원고를 고치지 않는다. 이동(저장 안 한 수정의 가드 포함)은 부르는 쪽이 한다.
 */

type Measured = {
  status: "ready";
  pages: TextbookPage[];
  model: TextbookRenderModel;
  resources: PreviewResources;
};
type BookEntry = Measured | { status: "skipped"; message: string };

/** 측정해 둔 구획 — 화면을 오가도(세부 편집 ↔ 완성 보기) 원고가 그대로면 다시 측정하지 않는다. 부르는 쪽이 들고 있는다. */
export type BookPreviewCache = Map<
  string,
  { signature: string; entry: BookEntry }
>;

/** 이미 읽어 둔 구획(지금 연 원고) — 그 구획은 다시 읽지 않는다. `dirty` 면 저장본이 아니라 이것을 그린다. */
export type BookPreviewSeed = {
  section: SectionDetail;
  conceptSource: TextbookConcept | null;
  conceptRevision: number;
  dirty: boolean;
};

const sectionOf = (key: string) => key.slice(0, key.lastIndexOf(":"));
const firstKey = (sectionId: string) => `${sectionId}:0`;

const BookPage = memo(function BookPage({
  page,
  entry,
}: {
  page: TextbookPage;
  entry: Measured;
}) {
  return (
    <div className={styles.stripPage}>
      <TextbookPageHost
        page={page}
        pages={entry.pages}
        model={entry.model}
        resources={entry.resources}
      />
    </div>
  );
});

function useBookEntries(input: {
  api: TextbookStudioApi;
  edition: EditionDetail;
  variant: "student" | "answers";
  material: PreviewMaterial | null;
  materialReady: boolean;
  seed: BookPreviewSeed | null;
  cache: BookPreviewCache;
}) {
  const { api, edition, variant, material, materialReady, cache } = input;
  const order = useMemo(
    () =>
      edition.units.flatMap((unit) =>
        unit.sections.map((section) => section.sectionId),
      ),
    [edition.units],
  );
  // 판본 객체는 저장 · 발행 때마다 새로 온다 — 구획의 차례와 시작 면이 그대로면 다시 돌지 않는다.
  const structure = JSON.stringify(
    edition.units.map((unit) =>
      unit.sections.map((section) => [
        section.sectionId,
        section.parity,
        section.title,
      ]),
    ),
  );
  const editionRef = useRef(edition);
  const seedRef = useRef(input.seed);
  useEffect(() => {
    editionRef.current = edition;
    seedRef.current = input.seed;
  });
  // 저장 안 한 수정이 생기거나 사라지면 그 구획을 다시 그린다.
  const dirtySection = input.seed?.dirty ? input.seed.section : null;
  const run = `${edition.editionId}|${variant}`;
  const [state, setState] = useState<{
    run: string;
    entries: Record<string, BookEntry>;
  }>({ run, entries: {} });
  const priority = useRef<string | null>(input.seed?.section.sectionId ?? null);
  useEffect(() => {
    priority.current = input.seed?.section.sectionId ?? null;
  }, [input.seed?.section.sectionId]);

  // 화면이 지금 구획을 읽는 중이면(seed 가 아직 없다) 기다린다 — 같은 구획을 나란히 두 번 읽지 않는다.
  const waiting = input.seed === null && order.length > 0;
  useEffect(() => {
    if (!materialReady || waiting) return;
    let cancelled = false;
    const controller = new AbortController();
    const done = new Set<string>();
    const ids: string[] = JSON.parse(structure).flatMap(
      (unit: [string, string, string][]) => unit.map(([id]) => id),
    );

    async function load(sectionId: string): Promise<BookEntry> {
      const book = editionRef.current;
      const seed = seedRef.current;
      try {
        let section: SectionDetail;
        let conceptSource: TextbookConcept | null = null;
        let conceptRevision = "";
        const seeded = seed?.section.sectionId === sectionId ? seed : null;
        if (seeded) {
          section = seeded.section;
          conceptSource = seeded.conceptSource;
          conceptRevision = String(seeded.conceptRevision);
        } else {
          section = await api.getSection(book.editionId, sectionId);
          const block = section.blocks.find((row) => row.kind === "concept");
          if (block && block.kind === "concept") {
            try {
              const loaded = await api.readConcept(
                book.editionId,
                block.conceptKey,
              );
              conceptSource = loaded.concept;
              conceptRevision = String(loaded.revision);
              section = { ...section, concept: loaded.draft };
            } catch {
              // 개념을 못 읽으면 개념 없이 조판을 시도한다 — 못 하면 그 까닭이 자리에 적힌다.
            }
          }
        }
        const signature = [
          section.revision,
          section.parity,
          section.title,
          conceptRevision,
        ].join(":");
        const key = `${run}|${sectionId}`;
        const kept = seeded?.dirty ? undefined : cache.get(key);
        if (kept?.signature === signature) return kept.entry;
        const preview = buildSectionPreview({
          edition: book,
          section,
          variant,
          material,
          conceptSource,
        });
        if (!preview.ok) return { status: "skipped", message: preview.message };
        const resources = await withBrowserQrImages(
          preview.model,
          preview.resources,
        );
        const layout = await measureTextbookPreview(preview.model, resources, {
          signal: controller.signal,
          recallMeasurementModel: preview.recallMeasurementModel,
          dialogueMeasurementModel: preview.dialogueMeasurementModel,
        });
        const entry: BookEntry = layout.pages.length
          ? {
              status: "ready",
              pages: layout.pages,
              model: preview.model,
              resources,
            }
          : { status: "skipped", message: "측정된 쪽이 없습니다." };
        if (!seeded?.dirty) cache.set(key, { signature, entry });
        return entry;
      } catch (reason) {
        return { status: "skipped", message: messageOf(reason) };
      }
    }

    void (async () => {
      while (!cancelled) {
        const wanted = priority.current;
        const next =
          wanted && ids.includes(wanted) && !done.has(wanted)
            ? wanted
            : ids.find((id) => !done.has(id));
        if (!next) return;
        done.add(next);
        const entry = await load(next);
        if (cancelled) return;
        setState((old) => ({
          run,
          entries: { ...(old.run === run ? old.entries : {}), [next]: entry },
        }));
        // 구획 사이에 화면이 넘김 · 누름을 받을 틈을 준다.
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    api,
    cache,
    material,
    materialReady,
    run,
    structure,
    variant,
    dirtySection,
    waiting,
  ]);

  const entries = state.run === run ? state.entries : {};
  return { order, entries };
}

export function BookPreview({
  api,
  edition,
  variant,
  material,
  materialReady,
  labels,
  currentSectionId,
  seed,
  cache,
  disabled = false,
  modes = null,
  footer = null,
  onPick,
  onVisibleSection,
}: {
  api: TextbookStudioApi;
  edition: EditionDetail;
  variant: "student" | "answers";
  material: PreviewMaterial | null;
  /** 미리보기 재료(문항 · 그림)를 읽었는가 — 읽기 전에는 조판을 시작하지 않는다. */
  materialReady: boolean;
  /** 구획의 이름표(`simpleSectionLabels`). */
  labels: ReadonlyMap<string, string>;
  /** 지금 고른 구획 — 바뀌면 띠가 그 구획으로 간다. */
  currentSectionId: string | null;
  seed: BookPreviewSeed | null;
  cache: BookPreviewCache;
  /** 처리 중 — 내용 고르기를 잠근다. */
  disabled?: boolean;
  /** 지면 종류 단추(교사 화면). */
  modes?: ReactNode;
  footer?: ReactNode;
  /** «내용 고르기»에서 다른 구획을 골랐다 — 부르는 쪽이 이동한다(가드 포함). */
  onPick: (sectionId: string) => void;
  /** 넘기다가 맨 앞에 보이는 구획이 바뀌었다. */
  onVisibleSection?: (sectionId: string) => void;
}) {
  const { order, entries } = useBookEntries({
    api,
    edition,
    variant,
    material,
    materialReady,
    seed,
    cache,
  });
  const outline = useMemo(
    () => contentOutline(edition, labels),
    [edition, labels],
  );
  const [visible, setVisible] = useState<string | null>(null);
  const [jump, setJump] = useState<{
    sectionId: string | null;
    nonce: number;
  }>({ sectionId: currentSectionId, nonce: 0 });
  if (jump.sectionId !== currentSectionId) {
    // 고른 구획이 바뀌었다 — 띠를 그리로 옮기고, «지금»도 그 구획으로 맞춘다.
    setJump({ sectionId: currentSectionId, nonce: jump.nonce + 1 });
    setVisible(currentSectionId);
  }
  const shown =
    visible && order.includes(visible) ? visible : (currentSectionId ?? null);
  // «지금» 이 바뀔 때마다 알린다 — 넘겨서 바뀐 것도, 골라서 바뀐 것도.
  const report = useRef(onVisibleSection);
  useEffect(() => {
    report.current = onVisibleSection;
  });
  useEffect(() => {
    if (shown) report.current?.(shown);
  }, [shown]);

  const pages = useMemo<PaperStripPage[]>(
    () =>
      order.flatMap((sectionId): PaperStripPage[] => {
        const label = labels.get(sectionId) ?? "";
        const entry = entries[sectionId];
        if (!entry || entry.status === "skipped")
          return [
            {
              key: firstKey(sectionId),
              node: (
                <div className={`${styles.stripPage} ${styles.stripWaiting}`}>
                  <p>{entry ? entry.message : "조판하는 중입니다."}</p>
                </div>
              ),
              caption: <strong>{label}</strong>,
            },
          ];
        return entry.pages.map((page, index) => ({
          key: `${sectionId}:${index}`,
          node: <BookPage page={page} entry={entry} />,
          caption: (
            <>
              <strong>{label}</strong>
              {entry.pages.length > 1 ? (
                <span>
                  {index + 1}/{entry.pages.length}
                </span>
              ) : null}
            </>
          ),
          enlargeLabel: `${label} ${index + 1}쪽 확대`,
        }));
      }),
    [entries, labels, order],
  );
  const measured = order.filter((id) => entries[id]).length;
  const pageCount = order.reduce((sum, id) => {
    const entry = entries[id];
    return sum + (entry?.status === "ready" ? entry.pages.length : 0);
  }, 0);
  const where = (() => {
    if (!shown) return null;
    const unit = edition.units.find((row) =>
      row.sections.some((section) => section.sectionId === shown),
    );
    return unit ? `${unit.title} › ${labels.get(shown) ?? ""}` : null;
  })();

  return (
    <section
      className={`${styles.panel} ${styles.bookPreview}`}
      aria-label="미리보기"
    >
      <TextbookPaperStyle />
      <div className={styles.previewHead}>
        <h2>미리보기</h2>
        {modes}
      </div>
      <div className={styles.previewWhere}>
        <p>
          <span className={styles.muted}>지금</span>{" "}
          <span data-book-preview-where>{where ?? "구획 없음"}</span>
        </p>
        <ContentPicker
          outline={outline}
          currentSectionId={shown}
          disabled={disabled}
          onPick={(sectionId) => {
            if (sectionId === currentSectionId) {
              // 이미 고른 구획 — 띠만 그 자리로 되돌린다.
              setJump((old) => ({ ...old, nonce: old.nonce + 1 }));
              setVisible(sectionId);
              return;
            }
            onPick(sectionId);
          }}
        />
      </div>
      <PaperStrip
        label="교재 지면"
        pages={pages}
        scrollTo={
          jump.sectionId
            ? { key: firstKey(jump.sectionId), nonce: jump.nonce }
            : null
        }
        onVisible={(key) => setVisible(sectionOf(key))}
        hint={
          <>
            옆으로 넘겨 보고, 쪽을 누르면 크게 볼 수 있습니다. ·{" "}
            {measured < order.length
              ? `조판 ${measured}/${order.length} 구획`
              : `${pageCount}쪽`}
          </>
        }
      />
      <p className={styles.muted}>
        구획마다 따로 조판한 미리보기입니다. 전체 교재의 쪽 번호와 이어 붙는
        자리는 PDF에서 확인하세요.
      </p>
      {footer}
    </section>
  );
}

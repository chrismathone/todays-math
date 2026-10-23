"use client";

import { useState } from "react";
import {
  workbookCreateEditionSchema,
  type WorkbookCreateEdition,
  type WorkbookEdition,
  type WorkbookEditionDetail,
} from "@/contracts/commercialWorkbook.contract";
import type { CommercialWorkbookSource } from "@/lib/commercialWorkbooks/source";
import { editionLabel, messageOf } from "./presentation";
import s from "./CommercialWorkbooks.module.css";

type Preview = {
  id: string;
  label: string;
  coverage: string;
  input: WorkbookCreateEdition;
};

/** A published pack is immutable; the owner-scoped receipt prevents duplicate imports. */
export default function WorkbookPublisherPacks({
  source,
  books,
  onSaved,
}: {
  source: CommercialWorkbookSource;
  books: WorkbookEdition[] | null;
  onSaved: (book: WorkbookEditionDetail) => void;
}) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function open() {
    setBusy(true);
    setError("");
    try {
      const { default: pack } =
        await import("../../../data/commercial-workbooks/visang-5761-2026-ch1-v1.json");
      const input = workbookCreateEditionSchema.parse({
        requestId: `publisher-pack:${pack.id}`,
        metadata: pack.metadata,
        provenance: pack.provenance,
        exercises: pack.exercises,
      });
      setPreview({
        id: pack.id,
        label: pack.label,
        coverage: pack.coverage,
        input,
      });
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }
  const existing = preview?.input.metadata.isbn
    ? books?.find((book) => book.metadata.isbn === preview.input.metadata.isbn)
    : undefined;
  async function register() {
    if (!preview || busy || !books) return;
    setBusy(true);
    setError("");
    try {
      const saved = existing ?? (await source.createEdition(preview.input));
      onSaved(await source.getEdition(saved.id));
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }
  const reviewed =
    preview?.input.exercises.filter((item) => item.key?.status === "reviewed")
      .length ?? 0;
  const missing =
    preview?.input.exercises.filter((item) => item.key === null).length ?? 0;
  return (
    <section className={s.panel} aria-label="출판사 공개 정답 자료">
      <div className={s.sectionHeading}>
        <div>
          <h3>출판사 공개 정답 자료</h3>
          <p className={s.muted}>
            공식 자료와 대조한 범위를 확인하고 내 교재에 등록합니다.
          </p>
        </div>
        {!preview && (
          <button
            type="button"
            className={s.button}
            disabled={busy}
            onClick={() => void open()}
          >
            {busy ? "자료를 불러오는 중…" : "확보한 자료 보기"}
          </button>
        )}
      </div>
      {preview && (
        <div className={s.compactStack}>
          <strong>{preview.input.metadata.title}</strong>
          <p>
            {editionLabel(preview.input.metadata)} · ISBN{" "}
            {preview.input.metadata.isbn}
          </p>
          <p>
            <strong>등록 범위: {preview.coverage}</strong>
          </p>
          <p className={s.muted}>
            {preview.input.exercises.length}개 문항 주소 · 정답 검토 {reviewed}
            개 · 정답 미확보 {missing}개. 소문항은 원문 번호를 표시한 한
            항목으로 함께 채점합니다. 나머지 단원·복습책·평가책은 아직 등록하지
            않았습니다.
          </p>
          <details>
            <summary>출처·검토 기록</summary>
            <p className={s.caption}>{preview.input.provenance.description}</p>
          </details>
          <div className={s.actions}>
            <a
              className={s.button}
              href="https://book.visang.com/books/info/5761"
              target="_blank"
              rel="noreferrer"
            >
              출판사 교재 정보
            </a>
            <a
              className={s.button}
              href="https://cdn.visang.com/book/202506/20250617123239292.pdf"
              target="_blank"
              rel="noreferrer"
            >
              공식 정답 PDF
            </a>
            <button
              type="button"
              className={s.primary}
              disabled={busy || !books}
              onClick={() => void register()}
            >
              {busy
                ? "교재를 확인하는 중…"
                : existing
                  ? "등록된 판본 열기"
                  : "이 범위의 정답표 등록"}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
    </section>
  );
}

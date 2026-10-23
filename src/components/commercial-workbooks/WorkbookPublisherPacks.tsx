"use client";

import { useRef, useState } from "react";
import {
  type WorkbookEdition,
  type WorkbookEditionDetail,
} from "@/contracts/commercialWorkbook.contract";
import type { CommercialWorkbookSource } from "@/lib/commercialWorkbooks/source";
import {
  loadPublisherPack,
  PUBLISHER_PACKS,
  sameWorkbookEdition,
  type PublisherPackPreview,
} from "@/lib/commercialWorkbooks/publisherPacks";
import { editionLabel, messageOf } from "./presentation";
import s from "./CommercialWorkbooks.module.css";

/** A published pack is immutable; the owner-scoped receipt prevents duplicate imports. */
export default function WorkbookPublisherPacks({
  source,
  books,
  onSaved,
  onBeforeOpen,
}: {
  source: CommercialWorkbookSource;
  books: WorkbookEdition[] | null;
  onSaved: (book: WorkbookEditionDetail) => void;
  onBeforeOpen?: () => boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState(PUBLISHER_PACKS[0].id);
  const [preview, setPreview] = useState<PublisherPackPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const loadVersion = useRef(0);
  async function open(id: string) {
    const entry = PUBLISHER_PACKS.find((item) => item.id === id);
    if (!entry || busy) return;
    const version = ++loadVersion.current;
    setExpanded(true);
    setSelectedId(id);
    setPreview(null);
    setLoading(true);
    setError("");
    try {
      const next = await loadPublisherPack(entry);
      if (version === loadVersion.current) setPreview(next);
    } catch (reason) {
      if (version === loadVersion.current) setError(messageOf(reason));
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }
  const existing = preview
    ? books?.find((book) =>
        sameWorkbookEdition(book.metadata, preview.input.metadata),
      )
    : undefined;
  async function register() {
    if (!preview || busy || loading || !books) return;
    if (onBeforeOpen && !onBeforeOpen()) return;
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
  const unreviewed = preview
    ? preview.input.exercises.length - reviewed - missing
    : 0;
  return (
    <section className={s.panel} aria-label="출판사 공개 정답 자료">
      <div className={s.sectionHeading}>
        <div>
          <h3>출판사 공개 정답 자료</h3>
          <p className={s.muted}>
            공식 자료와 대조한 범위를 확인하고 내 교재에 등록합니다.
          </p>
        </div>
        {!expanded && (
          <button
            type="button"
            className={s.button}
            disabled={busy}
            onClick={() => void open(selectedId)}
          >
            확보한 자료 보기
          </button>
        )}
      </div>
      {expanded && (
        <div className={s.toolbar}>
          <label className={s.search}>
            출판사 공개 교재
            <select
              value={selectedId}
              disabled={busy}
              onChange={(event) => void open(event.target.value)}
            >
              {PUBLISHER_PACKS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          {!loading && !preview && (
            <button
              type="button"
              className={s.button}
              onClick={() => void open(selectedId)}
            >
              자료 다시 불러오기
            </button>
          )}
        </div>
      )}
      {loading && <p role="status">선택한 교재의 정답 자료를 불러오는 중…</p>}
      {preview && (
        <div className={s.compactStack}>
          <strong>{preview.input.metadata.title}</strong>
          <p>
            {editionLabel(preview.input.metadata)}
            {preview.input.metadata.isbn &&
              ` · ISBN ${preview.input.metadata.isbn}`}
          </p>
          <p>
            <strong>등록 범위: {preview.coverage}</strong>
          </p>
          <p className={s.muted}>
            {preview.input.exercises.length}개 문항 주소 · 정답 검토 {reviewed}
            개 · 정답 미확보 {missing}개
            {unreviewed > 0 && ` · 검토 전 ${unreviewed}개`}.
          </p>
          <p className={s.muted}>{preview.entry.scopeNote}</p>
          {existing && (
            <p className={s.notice}>
              같은 판본이 이미 등록되어 있습니다. 저장된 정답표를 엽니다.
            </p>
          )}
          <details>
            <summary>출처·검토 기록</summary>
            <p className={s.caption}>{preview.input.provenance.description}</p>
          </details>
          <div className={s.actions}>
            {preview.entry.links.map((link) => (
              <a
                key={link.href}
                className={s.button}
                href={link.href}
                target="_blank"
                rel="noreferrer"
              >
                {link.label}
              </a>
            ))}
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

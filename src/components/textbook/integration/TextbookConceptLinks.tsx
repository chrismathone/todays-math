"use client";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import type { z } from "zod";
import { textbookConceptLookupSchema } from "@/contracts/textbookServer.contract";
import { getBlankSection, sectionTitleTex } from "@/lib/concept-blank/sections";
import { MathText } from "@/components/math/MathText";
import { integrationRequest, integrationMessage } from "./request";
import s from "./integration.module.css";

export default function TextbookConceptLinks({
  sections,
  active,
}: {
  sections: string[];
  active: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState("");
  const section = sections.includes(chosen) ? chosen : (sections[0] ?? "");
  return (
    <section className={s.panel} aria-label="개념이 실린 교재">
      <button
        className={s.disclosure}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        이 개념이 실린 교재 <span aria-hidden>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div id={id} className={s.content}>
          {!section ? (
            <p>소단원을 고르면 그 개념과 연결된 교재를 확인할 수 있습니다.</p>
          ) : (
            <>
              <label className={s.field}>
                소단원
                <select
                  value={section}
                  onChange={(event) => setChosen(event.target.value)}
                >
                  {sections.map((key) => (
                    <option key={key} value={key}>
                      {key.split("::").join(" · ")}
                    </option>
                  ))}
                </select>
              </label>
              {active && <Lookup key={section} section={section} />}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function Lookup({ section }: { section: string }) {
  const [data, setData] = useState<z.infer<
    typeof textbookConceptLookupSchema
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void integrationRequest(
      `/api/textbook/concepts/lookup?${new URLSearchParams({ blankSectionKey: section })}`,
      textbookConceptLookupSchema,
      { signal: controller.signal },
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setError(null);
        }
      })
      .catch((caught) => {
        if (!controller.signal.aborted) setError(integrationMessage(caught));
      });
    return () => controller.abort();
  }, [section, reload]);
  return (
    <>
      <p className={s.muted}>
        <MathText
          text={sectionTitleTex(getBlankSection(section)?.title ?? section)}
        />
        에 연결된 교재 원고와 개념백지입니다.
      </p>
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => setReload((value) => value + 1)}>
            다시 불러오기
          </button>
        </div>
      ) : !data ? (
        <p role="status">연결된 교재를 불러오는 중…</p>
      ) : data.matches.length === 0 ? (
        <p>
          연결된 교재가 없습니다. 교재 제작에서 원고 개념에 백지 항목을 연결해
          주세요.
        </p>
      ) : (
        <ul className={s.list}>
          {data.matches.map((row) => (
            <li key={`${row.editionId}:${row.conceptKey}`}>
              <div className={s.row}>
                <strong>{row.bookTitle}</strong>
                <span>
                  {row.editionLabel} ·{" "}
                  {row.status === "draft"
                    ? "초안"
                    : row.status === "published"
                      ? "발행본"
                      : "보관본"}
                </span>
              </div>
              <p>
                <MathText text={row.conceptTitle} />
              </p>
              <p className={s.muted}>
                연결 {row.entries.length}개 · 확인{" "}
                {
                  row.entries.filter(
                    (entry) => entry.reviewStatus === "confirmed",
                  ).length
                }
                개
              </p>
              <div className={s.actions}>
                <Link
                  href={`/?${new URLSearchParams({ textbookEdition: row.editionId })}#textbook`}
                >
                  교재에서 열기
                </Link>
                {row.status === "published" && row.hasFrozen && (
                  <Link
                    href={`/textbook/editions/${row.editionId}/concepts/${row.conceptKey}/blank?view=student`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    교재에 실린 백지 인쇄
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

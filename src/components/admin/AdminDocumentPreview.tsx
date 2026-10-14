"use client";

import { useState } from "react";
import { ProblemContent } from "@/components/math/ProblemContent";
import { MathText, SolutionText } from "@/components/math/MathText";
import { fractionViewFor } from "@/components/unified/fractionDisplay";
import { svgDataUrl } from "@/lib/svgDataUrl";
import { accountDate } from "./AccountReview";
import {
  CONCEPT_BLANK_FORM_LABELS,
  conceptBlankDocumentSchema,
} from "@/contracts/conceptBlank.contract";
import { getBlankSection } from "@/lib/concept-blank/sections";
import { reopenArithmeticSheet } from "@/lib/arithmetic/reopen";
import { arithmeticPaperPages } from "@/components/arithmetic/ArithmeticPaper";
import { PaperStrip } from "@/components/paper-strip/PaperStrip";
import {
  ADMIN_KIND_LABEL,
  objectValue,
  stringValue,
  type DocumentDetail,
} from "./documentTypes";
import s from "./admin.module.css";
import d from "./detail.module.css";

// Private images use the admin asset read route, never another account's session route.
function imageSource(value: unknown, userId: string): string | undefined {
  const source = stringValue(value);
  if (/^data:image\/(png|jpeg|webp|gif|svg\+xml)[;,]/i.test(source))
    return source;
  if (
    source.startsWith(`/api/admin/users/${encodeURIComponent(userId)}/assets/`)
  )
    return source;
  if (source.startsWith("/api/library/assets/"))
    return source.replace(
      "/api/library/assets/",
      `/api/admin/users/${encodeURIComponent(userId)}/assets/`,
    );
  if (/^\/figures\/[\w/.,%() -]+$/.test(source)) return source;
  return undefined;
}

function PreviewImage({ src, label }: { src: string; label: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <p className={d.imageError}>
      {label} 이미지를 불러오지 못했습니다. 자료를 다시 열어 주세요.
    </p>
  ) : (
    // User-owned images must retain the authenticated request and are not optimizer inputs.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={label} loading="lazy" onError={() => setFailed(true)} />
  );
}

function ProblemPreview({
  value,
  index,
  userId,
  extraction,
}: {
  value: unknown;
  index: number;
  userId: string;
  extraction: boolean;
}) {
  const problem = objectValue(value);
  // 초등이면 가분수를 대분수로 보인다 — 작업실·학습지 인쇄와 같은 결정(원장님 2026-09-19).
  // 본문·정답·해설을 다 보고 문항 하나에 한 번 정한다.
  const source = stringValue(problem.content);
  const shown = fractionViewFor({
    grade: stringValue(problem.grade),
    content: source,
    answer: stringValue(problem.answer),
    solution: stringValue(problem.solution),
  });
  const content = shown(source);
  const cropped = imageSource(
    extraction ? problem.image : problem.croppedImage,
    userId,
  );
  const rawFigures = Array.isArray(problem.figureUrls)
    ? problem.figureUrls
    : [];
  const figures = rawFigures.flatMap((figure) => {
    const src = imageSource(figure, userId);
    return src ? [src] : [];
  });
  if (extraction && Array.isArray(problem.figures)) {
    for (const figure of problem.figures) {
      const src = imageSource(objectValue(figure).image, userId);
      if (src) figures.push(src);
    }
  }
  // SVG is rendered as an image, not injected HTML from a private document payload.
  const svg = stringValue(problem.figureSvg);
  if (svg) figures.push(svgDataUrl(svg));
  const answer = shown(stringValue(problem.answer));
  const solution = shown(stringValue(problem.solution));
  return (
    <li className={d.problem}>
      <h3>
        문항 {index + 1}{" "}
        <span>
          {[
            stringValue(problem.grade),
            stringValue(problem.sourceLabel),
            extraction && typeof problem.page === "number"
              ? `${problem.page}쪽`
              : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </h3>
      {cropped ? (
        <PreviewImage src={cropped} label={`문항 ${index + 1} 원본`} />
      ) : null}
      {content ? (
        <ProblemContent content={content} className={d.problemText} />
      ) : !cropped ? (
        <p className={d.emptyPreview}>
          저장된 본문이나 미리보기 이미지가 없습니다.
        </p>
      ) : null}
      {figures.map((src, figureIndex) => (
        <PreviewImage
          key={`${figureIndex}:${src.slice(0, 80)}`}
          src={src}
          label={`문항 ${index + 1} 그림 ${figureIndex + 1}`}
        />
      ))}
      {answer || solution ? (
        <div className={d.answer}>
          {answer ? (
            <>
              <h4>정답</h4>
              <MathText text={answer} as="div" />
            </>
          ) : null}
          {solution ? (
            <>
              <h4>해설</h4>
              <SolutionText text={solution} />
            </>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export default function AdminDocumentPreview({
  document,
  userId,
}: {
  document: DocumentDetail;
  userId: string;
}) {
  const [visibleCount, setVisibleCount] = useState(20);
  const payload = objectValue(document.payload);
  const data = objectValue(payload.data);
  const extraction = document.kind === "extraction";
  const candidates = extraction ? data.crops : payload.problems;
  const problems: unknown[] = Array.isArray(candidates) ? candidates : [];
  const assets = objectValue(payload.assets);
  const sources = (Array.isArray(data.sources) ? data.sources : []).flatMap(
    (value) => {
      const source = objectValue(value);
      const asset = stringValue(assets[stringValue(source.id)]);
      return /^[a-f0-9]{64}$/i.test(asset)
        ? [
            {
              name: stringValue(source.name) || "원본 자료",
              asset,
              kind: source.kind === "pdf" ? "PDF" : "이미지",
            },
          ]
        : [];
    },
  );

  if (document.kind === "conceptBlank")
    return <ConceptBlankPreview document={document} />;
  if (document.kind === "arithmeticSheet")
    return <ArithmeticPreview document={document} />;

  return (
    <article>
      <header className={d.previewHeading}>
        <span className={d.kind}>
          {ADMIN_KIND_LABEL[document.kind]} · 읽기 전용
        </span>
        <h2>{document.title || "제목 없는 자료"}</h2>
        <p>
          {problems.length}문항 · 버전 {document.revision} · 수정{" "}
          {accountDate(document.updatedAt)}
        </p>
      </header>
      <div className={d.previewBody}>
        {sources.length ? (
          <section className={d.sources}>
            <h3>원본 자료</h3>
            <ul>
              {sources.map((source) => (
                <li key={source.asset}>
                  <a
                    href={`/api/admin/users/${encodeURIComponent(userId)}/assets/${source.asset}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {source.name} · {source.kind} <span>새 탭에서 열기 ↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {problems.length ? (
          <ol className={d.problems}>
            {problems.slice(0, visibleCount).map((problem, index) => (
              <ProblemPreview
                key={index}
                value={problem}
                index={index}
                userId={userId}
                extraction={extraction}
              />
            ))}
          </ol>
        ) : (
          <p className={d.emptyPreview}>이 자료에 저장된 문항이 없습니다.</p>
        )}
        {visibleCount < problems.length ? (
          <div className={d.more}>
            <button
              className={s.secondary}
              type="button"
              onClick={() => setVisibleCount((count) => count + 20)}
            >
              다음 문항 보기 ({visibleCount} / {problems.length})
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ArithmeticPreview({ document }: { document: DocumentDetail }) {
  let pages;
  try {
    pages = arithmeticPaperPages({
      sheet: reopenArithmeticSheet(document.payload),
      title: document.title,
      mode: "both",
      density: 24,
    });
  } catch {
    return <p role="alert">저장된 연산 명세와 정답을 확인할 수 없습니다.</p>;
  }
  return (
    <article>
      <header className={d.previewHeading}>
        <span className={d.kind}>연산 연습지 · 읽기 전용</span>
        <h2>{document.title}</h2>
        <p>
          버전 {document.revision} · 수정 {accountDate(document.updatedAt)}
        </p>
      </header>
      <PaperStrip pages={pages} hint="저장된 식과 답을 그대로 표시합니다." />
    </article>
  );
}

/** 개념 백지(26 §9 ⑾) — 고르기만 담는다(고정 문항). 문항 대신 고른 소단원과 형식 · 난이도별 수를 보인다. */
function ConceptBlankPreview({ document }: { document: DocumentDetail }) {
  const parsed = conceptBlankDocumentSchema.safeParse(document.payload);
  return (
    <article>
      <header className={d.previewHeading}>
        <span className={d.kind}>
          {ADMIN_KIND_LABEL.conceptBlank} · 읽기 전용
        </span>
        <h2>{document.title || "제목 없는 자료"}</h2>
        <p>
          버전 {document.revision} · 수정 {accountDate(document.updatedAt)}
        </p>
      </header>
      <div className={d.previewBody}>
        {parsed.success ? (
          <section className={d.sources}>
            <h3>고른 소단원</h3>
            <ul>
              {parsed.data.selection.sections.map((key) => (
                <li key={key}>{getBlankSection(key)?.title ?? key}</li>
              ))}
            </ul>
            <h3>형식 · 하 / 중 / 상</h3>
            <ul>
              {parsed.data.selection.forms.map((f) => (
                <li key={f.form}>
                  {CONCEPT_BLANK_FORM_LABELS[f.form]} {f.counts.하} /{" "}
                  {f.counts.중} / {f.counts.상}
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className={d.emptyPreview}>저장한 고르기를 읽지 못했습니다.</p>
        )}
      </div>
    </article>
  );
}

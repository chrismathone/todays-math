import { useState } from "react";
import type { FadingCatalog } from "@/contracts/fadingApi.contract";
import { FadingMath } from "./FadingMath";
import { toPercent } from "@/lib/fading/numbers";
import { FadingIcon } from "./FadingIcon";
import { curriculumName, dueLabel, stepNames } from "./labels";
import s from "./FadingCatalogScreen.module.css";

type CatalogSection = FadingCatalog["sections"][number];
const steps = [1, 2, 3, 4] as const;
const pageSize = 6;
const stepDescriptions = {
  1: "지우지 않고 문장을 읽어요",
  2: "핵심어를 빈칸으로 바꿔요",
  3: "수식과 조건을 빈칸으로 바꿔요",
  4: "모든 표적을 빈칸으로 바꿔요",
} as const;

export function FadingCatalogScreen({
  catalog,
  busy,
  onGrade,
  onConcept,
}: {
  catalog: FadingCatalog;
  busy: boolean;
  onGrade: (grade: string) => void;
  onConcept: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [section, setSection] = useState<string | null>(null);
  const [sort, setSort] = useState<"unit" | "risk">("risk");
  const [page, setPage] = useState(1);
  const selected = catalog.sections.find((item) => item.key === section);
  const query = search.trim().toLocaleLowerCase();
  const matches = catalog.sections.flatMap((unit) =>
    unit.concepts
      .filter((concept) =>
        `${unit.chapter} ${unit.unit} ${concept.terms.join(" ")}`
          .toLocaleLowerCase()
          .includes(query),
      )
      .map((concept) => ({ unit, concept })),
  );
  if (sort === "risk")
    matches.sort(
      (a, b) =>
        (b.concept.status?.risk ?? -1) - (a.concept.status?.risk ?? -1) ||
        Number(!!b.concept.status) - Number(!!a.concept.status),
    );
  const pages = Math.max(1, Math.ceil(matches.length / pageSize));
  const currentPage = Math.min(page, pages);
  const shown = matches.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const featured = matches[0]?.unit;
  const picked = catalog.sections.reduce(
    (count, unit) =>
      count + unit.concepts.filter((concept) => concept.status).length,
    0,
  );
  function openUnit(key: string) {
    setSection(key);
  }
  function unitCounts(unit: CatalogSection) {
    return {
      learned: unit.concepts.filter((concept) => concept.status?.rated).length,
      picked: unit.concepts.filter((concept) => concept.status).length,
      propositions: unit.concepts.reduce(
        (count, concept) => count + concept.propositions,
        0,
      ),
    };
  }
  const detailCounts = selected ? unitCounts(selected) : null;
  const featuredCounts = featured ? unitCounts(featured) : null;
  return (
    <div
      className={s.screen}
      data-fading-catalog="true"
      data-unit={!!selected}
      aria-busy={busy}
    >
      {selected && detailCounts ? (
        <>
          <div className={s.detailTop}>
            <span className={s.badge}>단원 상세</span>
            <button className={s.quiet} onClick={() => setSection(null)}>
              <span aria-hidden="true">←</span> 단원 목록으로
            </button>
          </div>
          <section className={s.unitHero}>
            <div className={s.kicker}>
              {catalog.grade} · {curriculumName(selected.chapter)}
            </div>
            <h1 className={s.unitTitle}>{curriculumName(selected.unit)}</h1>
            <div className={s.tags}>
              <span>개념 {selected.concepts.length}개</span>
              <span>단계별로 확인</span>
            </div>
            <div className={s.unitPreview}>
              <span className={s.small}>이 단원의 개념</span>
              <div className={s.previewTerms}>
                {selected.concepts[0]?.terms.map((term, i) => (
                  <span key={i}>
                    <FadingMath text={term} />
                  </span>
                ))}
              </div>
            </div>
            <div className={s.unitMetrics}>
              <div>
                <span>전체 명제</span>
                <strong>
                  {detailCounts.propositions}
                  <small>개</small>
                </strong>
              </div>
              <div>
                <span>고른 개념</span>
                <strong>
                  {detailCounts.picked}
                  <small>개</small>
                </strong>
              </div>
              <div>
                <span>배운 개념</span>
                <strong>
                  {detailCounts.learned}
                  <small>개</small>
                </strong>
              </div>
            </div>
            <div className={s.progressPanel}>
              <div className={s.row}>
                <span>첫 평가를 마친 개념</span>
                <strong>
                  {detailCounts.learned} / {selected.concepts.length}개
                </strong>
              </div>
              <div className={s.progressTrack}>
                <div
                  style={{
                    width: `${toPercent(selected.concepts.length ? detailCounts.learned / selected.concepts.length : 0)}%`,
                  }}
                />
              </div>
              <p className={s.small}>
                배운 개념은 첫 평가를 마친 개념 수입니다.
              </p>
            </div>
          </section>
          <section className={s.ladderSection} aria-label="단계별 개념 수">
            <h2 className={s.sectionTitle}>
              <FadingIcon name="erase" /> 단계별 개념 수
            </h2>
            <p className={s.small}>단계와 복습일은 개념마다 다릅니다.</p>
            <div className={s.ladder}>
              {steps.map((step) => {
                const count = selected.concepts.filter(
                  (concept) => concept.status?.step === step,
                ).length;
                return (
                  <div
                    className={s.stage}
                    key={step}
                    data-step={step}
                    data-populated={count > 0}
                  >
                    <span className={s.stepBadge}>STEP 0{step}</span>
                    <strong>{stepNames[step]}</strong>
                    <span className={s.small}>{stepDescriptions[step]}</span>
                    <span className={s.stageCount}>{count}개</span>
                  </div>
                );
              })}
            </div>
          </section>
          <section className={s.conceptTree}>
            <div className={s.row}>
              <h2 className={s.sectionTitle}>
                <FadingIcon name="list" /> 단원의 개념
              </h2>
              <span className={s.small}>전체 {selected.concepts.length}개</span>
            </div>
            {selected.concepts.map((concept, index) => (
              <button
                className={s.conceptRow}
                key={concept.id}
                disabled={busy}
                onClick={() => onConcept(concept.id)}
                aria-label={`${concept.level} · ${concept.ordinal}/${concept.siblings} · ${concept.terms.join(" · ")} · 개념 읽기`}
              >
                <span className={s.conceptRowTop}>
                  <span className={s.ordinal}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className={s.rowCopy}>
                    <span className={s.rowTitle}>
                      {concept.level} · {concept.ordinal}/{concept.siblings}
                    </span>
                    <span
                      className={s.rowTerms}
                      data-fading-term-description="true"
                    >
                      <FadingMath text={concept.terms.join(" · ")} />
                    </span>
                  </span>
                  <span className={s.badge}>
                    {concept.status
                      ? `${concept.status.step}단계`
                      : "고르기 전"}
                  </span>
                </span>
                <span className={s.conceptRowMeta}>
                  <span>
                    {concept.level} · 명제 {concept.propositions}개 · 빈칸{" "}
                    {concept.targets}개
                  </span>
                  <span>
                    {concept.status
                      ? dueLabel(concept.status.daysUntil)
                      : "첫 풀이 전"}
                  </span>
                  <FadingIcon name="arrow" />
                </span>
              </button>
            ))}
          </section>
          {selected.concepts[0] ? (
            <div className={s.detailDock}>
              <button
                className={s.primary}
                disabled={busy}
                onClick={() => onConcept(selected.concepts[0]!.id)}
              >
                <FadingIcon name="book" /> 첫 개념 읽기{" "}
                <FadingIcon name="arrow" />
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <section className={s.filters}>
            <div className={s.row}>
              <h1 className={s.title}>
                <span className={s.titleIcon}>
                  <FadingIcon name="list" />
                </span>{" "}
                개념 목록
              </h1>
              <span className={s.badge}>고른 개념 {picked}개</span>
            </div>
            <div className={s.searchBox}>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="10" cy="10" r="6" />
                <path d="m15 15 5 5" />
              </svg>
              <input
                type="search"
                aria-label="단원·개념 검색"
                placeholder="단원·개념 검색"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className={s.gradeChips} aria-label="학년 고르기">
              {catalog.grades.map((grade) => (
                <button
                  className={s.gradeChip}
                  key={grade}
                  aria-pressed={catalog.grade === grade}
                  disabled={busy}
                  onClick={() => {
                    setPage(1);
                    onGrade(grade);
                  }}
                >
                  {grade}
                </button>
              ))}
            </div>
            <div className={s.sortRow}>
              <span className={s.small}>개념 {matches.length}개</span>
              <div className={s.sortControl} aria-label="개념 정렬">
                <button
                  aria-pressed={sort === "risk"}
                  onClick={() => {
                    setSort("risk");
                    setPage(1);
                  }}
                >
                  망각 위험순
                </button>
                <button
                  aria-pressed={sort === "unit"}
                  onClick={() => {
                    setSort("unit");
                    setPage(1);
                  }}
                >
                  단원순
                </button>
              </div>
            </div>
          </section>
          {featured && featuredCounts ? (
            <section className={s.featured}>
              <div className={s.featuredMain}>
                <div className={s.featuredKickers}>
                  <span className={s.featuredTag}>단원</span>
                  <div className={s.small}>
                    {catalog.grade} · {curriculumName(featured.chapter)}
                  </div>
                </div>
                <h2>{curriculumName(featured.unit)}</h2>
                <p className={s.small}>
                  개념 {featured.concepts.length}개 · 명제{" "}
                  {featuredCounts.propositions}개
                </p>
                <div className={s.progressPanel}>
                  <div className={s.row}>
                    <span>첫 평가를 마친 개념</span>
                    <strong>
                      {featuredCounts.learned} / {featured.concepts.length}개
                    </strong>
                  </div>
                  <div className={s.progressTrack}>
                    <div
                      style={{
                        width: `${toPercent(featured.concepts.length ? featuredCounts.learned / featured.concepts.length : 0)}%`,
                      }}
                    />
                  </div>
                  <div className={s.progressLegend}>
                    <span>배운 개념 {featuredCounts.learned}개</span>
                    <span>고른 개념 {featuredCounts.picked}개</span>
                    <span>전체 {featured.concepts.length}개</span>
                  </div>
                </div>
              </div>
              <button
                className={s.primary}
                disabled={busy}
                aria-label={`${curriculumName(featured.unit)} · 단원 보기`}
                onClick={() => openUnit(featured.key)}
              >
                단원 보기 <FadingIcon name="arrow" />
              </button>
            </section>
          ) : null}
          <section className={s.cardsSection}>
            <div className={s.row}>
              <h2 className={s.sectionTitle}>{catalog.grade}의 개념</h2>
              <span className={s.small}>
                표시 {shown.length} / {matches.length}개
              </span>
            </div>
            {shown.length ? (
              <div className={s.cardGrid}>
                {shown.map(({ concept, unit }) => (
                  <article
                    className={s.conceptCard}
                    key={concept.id}
                    data-due={
                      concept.status?.daysUntil !== null &&
                      concept.status?.daysUntil !== undefined &&
                      concept.status.daysUntil <= 0
                    }
                  >
                    <div className={s.cardHeader}>
                      <div className={s.cardHeaderMain}>
                        <div className={s.small}>
                          {catalog.grade} · {curriculumName(unit.chapter)}
                        </div>
                        <span className={s.badge}>
                          {concept.status
                            ? `${concept.status.step}단계 · ${stepNames[concept.status.step]}`
                            : "고르기 전"}
                        </span>
                      </div>
                      {concept.status?.risk !== null &&
                      concept.status?.risk !== undefined ? (
                        <div className={s.risk}>
                          <strong>{toPercent(concept.status.risk)}%</strong>
                          <span>망각 위험 (추정)</span>
                        </div>
                      ) : null}
                    </div>
                    <h3 className={s.conceptTitle}>
                      {curriculumName(unit.unit)} · {concept.level} ·{" "}
                      {concept.ordinal}/{concept.siblings}
                    </h3>
                    <div className={s.termPreview}>
                      <span className={s.small}>개념 미리 보기</span>
                      <div>
                        {concept.terms.map((term, index) => (
                          <span className={s.termChip} key={index}>
                            <FadingMath text={term} />
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className={s.cardFacts}>
                      <span>
                        명제 {concept.propositions}개 · 빈칸 {concept.targets}개
                      </span>
                      <span>
                        {concept.status
                          ? dueLabel(concept.status.daysUntil)
                          : "첫 풀이 전"}
                      </span>
                    </div>
                    <div
                      className={s.stepSegments}
                      aria-label={
                        concept.status
                          ? `다음 풀이 ${concept.status.step}단계`
                          : "고르기 전"
                      }
                    >
                      {steps.map((step) => (
                        <span
                          key={step}
                          data-active={concept.status?.step === step}
                        />
                      ))}
                    </div>
                    <div className={s.cardActions}>
                      <button
                        className={s.quiet}
                        disabled={busy}
                        aria-label={`${curriculumName(unit.unit)} · 단원 보기`}
                        onClick={() => openUnit(unit.key)}
                      >
                        단원 보기
                      </button>
                      <button
                        className={s.readButton}
                        disabled={busy}
                        aria-label={`${curriculumName(unit.unit)} · ${concept.level} · ${concept.ordinal}/${concept.siblings} · 개념 읽기`}
                        onClick={() => onConcept(concept.id)}
                      >
                        개념 읽기 <FadingIcon name="arrow" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className={s.empty}>
                <FadingIcon name="list" />
                <h2>찾은 개념이 없습니다</h2>
                <p className={s.small}>다른 낱말로 찾아보세요.</p>
              </div>
            )}
          </section>
          {matches.length ? (
            <div className={s.paginationRow}>
              <span className={s.small}>
                전체 {matches.length}개 중 {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, matches.length)}개
              </span>
              <nav className={s.pagination} aria-label="개념 목록 쪽 번호">
                <button
                  aria-label="이전 쪽"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  ‹
                </button>
                {Array.from({ length: pages }, (_, index) => index + 1)
                  .filter(
                    (number) =>
                      number === 1 ||
                      number === pages ||
                      Math.abs(number - currentPage) <= 1,
                  )
                  .map((number, index, numbers) => (
                    <span className={s.pageGroup} key={number}>
                      {index > 0 && number - numbers[index - 1]! > 1 ? (
                        <span className={s.ellipsis}>…</span>
                      ) : null}
                      <button
                        aria-label={`${number}쪽`}
                        aria-current={
                          number === currentPage ? "page" : undefined
                        }
                        onClick={() => setPage(number)}
                      >
                        {number}
                      </button>
                    </span>
                  ))}
                <button
                  aria-label="다음 쪽"
                  disabled={currentPage === pages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  ›
                </button>
              </nav>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type {
  ExamStudyCatalog,
  ExamStudyCourse,
  ExamStudyGenerateRequest,
  ExamStudyGeneration,
  StudyRequirementId,
} from "@/contracts/examStudy.contract";
import type { WorkspaceMenu } from "@/contracts/accountAccess.contract";
import { DIFFICULTY_LADDER, type Difficulty } from "@/contracts/difficulty";
import WorkspacePageHeader from "@/components/unified/WorkspacePageHeader";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
  type PrintMeta,
  type PrintOptions,
} from "@/components/unified/print/types";
import { ExamStudyResults } from "./ExamStudyResults";
import {
  generateStudy,
  loadStudyCatalog,
  recheckStudy,
  studyProblem,
} from "./examStudyClient";
import s from "./ExamPracticeWorkspace.module.css";

const WorksheetEditor = dynamic(
  () => import("@/components/unified/WorksheetEditor"),
  {
    loading: () => <p role="status">시험지 양식을 준비하는 중입니다…</p>,
  },
);
const noop = () => {};
const PAGE_SIZE = 20;
type Conditions = {
  course: ExamStudyCourse;
  mode: "profile" | "general";
  profileId: string;
  schoolName: string;
  familyIds: string[];
  requirementIds: StudyRequirementId[] | null;
  format: ExamStudyGenerateRequest["format"];
  difficulty: Difficulty | "";
  count: number;
  maxPerFamily: number;
};
type CatalogState =
  | { course: ExamStudyCourse; status: "loading" }
  | { course: ExamStudyCourse; status: "ready"; data: ExamStudyCatalog }
  | { course: ExamStudyCourse; status: "error"; message: string };

export function ExamPracticeWorkspace({
  allowedMenus,
}: {
  allowedMenus: WorkspaceMenu[];
}) {
  const [conditions, setConditions] = useState<Conditions>({
    course: "중1",
    mode: "profile",
    profileId: "",
    schoolName: "",
    familyIds: [],
    requirementIds: null,
    format: "혼합",
    difficulty: "",
    count: 10,
    maxPerFamily: 3,
  });
  const [catalogState, setCatalogState] = useState<CatalogState>({
    course: "중1",
    status: "loading",
  });
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("");
  const [page, setPage] = useState(0);
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ExamStudyGeneration | null>(null);
  const [output, setOutput] = useState(false);
  const [title, setTitle] = useState("기출 대비 범위 연습");
  const [printOptions, setPrintOptions] = useState<PrintOptions>(() => ({
    ...DEFAULT_PRINT_OPTIONS,
    template: "workbook",
  }));
  const [printMeta, setPrintMeta] = useState<PrintMeta>(() => ({
    ...DEFAULT_PRINT_META,
    academyName: "기출 대비 자작 연습",
  }));
  const generation = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const seed = useRef(20261018);

  useEffect(() => {
    const controller = new AbortController();
    const course = conditions.course;
    loadStudyCatalog(course, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setCatalogState({ course, status: "ready", data });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setCatalogState({
            course,
            status: "error",
            message:
              cause instanceof Error
                ? cause.message
                : "유형을 불러오지 못했습니다.",
          });
      });
    return () => controller.abort();
  }, [conditions.course, attempt]);
  useEffect(() => () => generation.current?.abort(), []);

  const catalog =
    catalogState.status === "ready" && catalogState.course === conditions.course
      ? catalogState.data
      : null;
  const profiles =
    catalog?.profiles.filter((item) => item.course === conditions.course) ?? [];
  const profile =
    profiles.find((item) => item.id === conditions.profileId) ?? profiles[0];
  const requirementIds =
    conditions.requirementIds ??
    profile?.requirements.map((row) => row.id) ??
    [];
  const families =
    catalog?.families.filter((item) => item.course === conditions.course) ?? [];
  const sections = [...new Set(families.flatMap((item) => item.unitSections))];
  const visible = families.filter(
    (item) =>
      (!section || item.unitSections.includes(section)) &&
      (!deferredQuery ||
        `${item.title} ${item.unitSections.join(" ")}`
          .toLocaleLowerCase()
          .includes(deferredQuery)),
  );
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const rows = visible.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );
  const selected = families.filter((item) =>
    conditions.familyIds.includes(item.id),
  );
  const selectedProblems = result?.questions.map(studyProblem) ?? [];
  const canOutput = allowedMenus.includes("export");

  function change(patch: Partial<Conditions>) {
    generation.current?.abort();
    sequence.current += 1;
    setBusy(false);
    setMessage(null);
    setResult(null);
    setOutput(false);
    setConditions((previous) => ({ ...previous, ...patch }));
  }

  function changeCourse(course: ExamStudyCourse) {
    change({ course, profileId: "", familyIds: [], requirementIds: null });
    setCatalogState({ course, status: "loading" });
    setSection("");
    setQuery("");
    setPage(0);
  }

  function toggleFamily(id: string) {
    if (
      !conditions.familyIds.includes(id) &&
      conditions.familyIds.length >= 40
    ) {
      setMessage("한 번에 최대 40유형을 선택할 수 있습니다.");
      return;
    }
    change({
      familyIds: conditions.familyIds.includes(id)
        ? conditions.familyIds.filter((value) => value !== id)
        : [...conditions.familyIds, id],
    });
  }

  function toggleRequirement(id: StudyRequirementId) {
    change({
      requirementIds: requirementIds.includes(id)
        ? requirementIds.filter((value) => value !== id)
        : [...requirementIds, id],
    });
  }

  async function create() {
    if (!catalog || !canOutput) return;
    if (conditions.mode === "general" && !conditions.familyIds.length) {
      setMessage("연습할 유형을 하나 이상 선택해 주세요.");
      return;
    }
    if (conditions.mode === "profile" && (!profile || !requirementIds.length)) {
      setMessage(
        "검토 범위에서 연습할 항목을 선택하거나 유형 직접 선택을 이용해 주세요.",
      );
      return;
    }
    const recipe: ExamStudyGenerateRequest = {
      course: conditions.course,
      count: conditions.count,
      format: conditions.format,
      seed: seed.current,
      maxPerFamily: conditions.maxPerFamily,
      ...(conditions.difficulty ? { difficulty: conditions.difficulty } : {}),
      ...(conditions.mode === "profile" && profile
        ? {
            profileId: profile.id,
            schoolName: profile.schoolName,
            requirementIds,
          }
        : {
            familyIds: conditions.familyIds,
            ...(conditions.schoolName.trim()
              ? { schoolName: conditions.schoolName.trim() }
              : {}),
          }),
    };
    generation.current?.abort();
    const controller = new AbortController();
    generation.current = controller;
    const current = ++sequence.current;
    setBusy(true);
    setMessage(null);
    setOutput(false);
    try {
      const previousKeys = result?.questions
        .map((item) => item.logicalKey)
        .sort()
        .join("\n");
      let next: ExamStudyGeneration | null = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const candidate = await generateStudy(
          { ...recipe, seed: seed.current },
          controller.signal,
        );
        if (current !== sequence.current || controller.signal.aborted) return;
        seed.current = (seed.current + 1) % 2_147_483_648;
        const candidateKeys = candidate.questions
          .map((item) => item.logicalKey)
          .sort()
          .join("\n");
        if (previousKeys && candidateKeys === previousKeys) continue;
        next = candidate;
        break;
      }
      if (!next) {
        setMessage(
          "현재 조건에서 다른 문항 조합을 찾지 못했습니다. 유형이나 문항 수를 바꾸면 다른 범위를 연습할 수 있습니다.",
        );
        return;
      }
      setResult(next);
      setTitle(
        `${conditions.mode === "profile" && profile ? `${profile.schoolName} · ` : ""}${conditions.course} 범위 연습`,
      );
      setPrintOptions((previous) => ({ ...previous, showAnswers: false }));
      setPrintMeta((previous) => ({
        ...previous,
        schoolName:
          conditions.mode === "profile" && profile
            ? profile.schoolName
            : "자작 범위 연습",
        grade: conditions.course,
      }));
    } catch (cause: unknown) {
      if (current === sequence.current && !controller.signal.aborted)
        setMessage(
          cause instanceof Error ? cause.message : "문항을 만들지 못했습니다.",
        );
    } finally {
      if (current === sequence.current) setBusy(false);
    }
  }

  if (output && result) {
    return (
      <div className={s.workspace}>
        <div className={s.output}>
          <WorksheetEditor
            headerTitle="기출 대비 범위 연습"
            draftActions={false}
            fixedComposition
            allowedMenus={allowedMenus}
            selected={selectedProblems}
            title={title}
            setTitle={setTitle}
            columns={printOptions.columns}
            answers={printOptions.showAnswers}
            savedAt=""
            printOptions={printOptions}
            printMeta={printMeta}
            setPrintOptions={(patch) =>
              setPrintOptions((previous) => ({ ...previous, ...patch }))
            }
            setPrintMeta={(patch) =>
              setPrintMeta((previous) => ({ ...previous, ...patch }))
            }
            setColumns={(value) =>
              setPrintOptions((previous) => ({
                ...previous,
                columns: value === 1 ? 1 : 2,
              }))
            }
            setAnswers={(value) =>
              setPrintOptions((previous) => ({
                ...previous,
                showAnswers: value,
              }))
            }
            beforeOutput={() => recheckStudy(result)}
            outputNotice={
              <p className={s.notice}>
                {result.deliveredCount}문항 ·{" "}
                {result.status === "complete"
                  ? "선택한 연습 범위"
                  : "현재 제공된 범위의 연습"}
                . 정답·해설은 교사용 출력에서 선택할 수 있습니다.
              </p>
            }
            stepNavigation={{
              label: "기출 대비 단계",
              items: [
                {
                  id: "review",
                  label: "문항 검토로 돌아가기",
                  current: false,
                  onSelect: () => setOutput(false),
                },
                {
                  id: "output",
                  label: "양식 구성·출력",
                  current: true,
                  onSelect: noop,
                },
              ],
            }}
            save={noop}
            restore={noop}
            download={noop}
            toggle={noop}
            move={noop}
            reorder={noop}
            navigate={noop}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={s.workspace}>
      <WorkspacePageHeader
        title="기출 대비 연습"
        description="검토한 학교 범위나 선택한 유형으로 새 문제를 만들고 연습합니다."
      />
      <div className={s.layout}>
        <section className={s.panel} aria-labelledby="study-conditions-title">
          <h2 id="study-conditions-title">연습 범위</h2>
          <div className={s.mode} aria-label="범위 선택 방법">
            <button
              type="button"
              aria-pressed={conditions.mode === "profile"}
              onClick={() => change({ mode: "profile" })}
            >
              학교 검토 범위
            </button>
            <button
              type="button"
              aria-pressed={conditions.mode === "general"}
              onClick={() => change({ mode: "general" })}
            >
              유형 직접 선택
            </button>
          </div>
          <label className={s.field}>
            <span>학년·과목</span>
            <select
              value={conditions.course}
              onChange={(event) =>
                changeCourse(event.target.value as ExamStudyCourse)
              }
            >
              {(catalog?.courses ?? [conditions.course]).map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>
          </label>
          {!catalog && catalogState.status !== "error" && (
            <p role="status">유형과 검토 범위를 불러오는 중입니다…</p>
          )}
          {catalogState.status === "error" &&
            catalogState.course === conditions.course && (
              <div className={s.error} role="alert">
                <p>{catalogState.message}</p>
                <button
                  className={s.secondary}
                  type="button"
                  onClick={() => {
                    setCatalogState({
                      course: conditions.course,
                      status: "loading",
                    });
                    setAttempt((value) => value + 1);
                  }}
                >
                  다시 불러오기
                </button>
              </div>
            )}
          {catalog &&
            conditions.mode === "profile" &&
            (profile ? (
              <>
                <label className={s.field}>
                  <span>학교·검토 자료</span>
                  <select
                    value={profile.id}
                    onChange={(event) =>
                      change({
                        profileId: event.target.value,
                        requirementIds: null,
                      })
                    }
                  >
                    {profiles.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.schoolName} · {item.scope.sourceYear}년{" "}
                        {item.scope.semester}학기 {item.scope.round}
                      </option>
                    ))}
                  </select>
                </label>
                <p className={s.notice}>
                  확인한 자료 {profile.scope.visibleCount}/
                  {profile.scope.totalCount}문항의 학습 요구를 사용합니다. 학교
                  전체 기출의 재현이나 실측 난도를 보장하는 범위는 아닙니다.
                </p>
                <div>
                  <p className={s.legend}>연습할 항목</p>
                  <ul className={s.list}>
                    {profile.requirements.map((row) => {
                      const requirement = catalog.requirements.find(
                        (item) => item.id === row.id,
                      );
                      const full = families.some((family) =>
                        family.fulfills.some(
                          (value) =>
                            value.requirement === row.id &&
                            value.level === "full",
                        ),
                      );
                      return (
                        <li key={row.id}>
                          <label>
                            <input
                              type="checkbox"
                              checked={requirementIds.includes(row.id)}
                              onChange={() => toggleRequirement(row.id)}
                            />
                            <span>
                              {requirement?.title ?? "학습 요구 확인 전"}
                              <small>
                                {full
                                  ? "완결 과제 연습 가능"
                                  : "기초 요소 또는 미제공 범위 확인 필요"}
                              </small>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            ) : (
              <p className={s.notice}>
                이 학년·과목의 학교별 검토 범위는 아직 없습니다. 유형 직접
                선택에서 지원하는 범위를 연습할 수 있습니다.
              </p>
            ))}
          {catalog && conditions.mode === "general" && (
            <>
              <label className={s.field}>
                <span>
                  학교 이름 <small>(선택)</small>
                </span>
                <input
                  maxLength={80}
                  value={conditions.schoolName}
                  onChange={(event) =>
                    change({ schoolName: event.target.value })
                  }
                />
              </label>
              <p className={s.muted}>
                학교별 검토 범위를 적용하지 않는 일반 유형 연습입니다.
              </p>
              <label className={s.field}>
                <span>단원에서 찾기</span>
                <select
                  value={section}
                  onChange={(event) => {
                    setSection(event.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">전체 단원</option>
                  {sections.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={s.field}>
                <span>유형 찾기</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(0);
                  }}
                />
              </label>
              <p className={s.muted}>
                검색 결과 {visible.length}유형 · 선택 {selected.length}유형 /
                최대 40
              </p>
              {selected.length > 0 && (
                <ul className={s.selected} aria-label="선택한 유형">
                  {selected.map((family) => (
                    <li key={family.id}>
                      <button
                        type="button"
                        onClick={() => toggleFamily(family.id)}
                        aria-label={`${family.title} 선택 해제`}
                      >
                        {family.title} ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <ul className={s.list}>
                {rows.map((family) => {
                  const checked = conditions.familyIds.includes(family.id);
                  const disabled = !checked && selected.length >= 40;
                  return (
                    <li key={family.id}>
                      <label data-disabled={disabled}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleFamily(family.id)}
                        />
                        <span>
                          {family.title}
                          <small>
                            {family.unitSections.join(" · ")} ·{" "}
                            {family.formats.join(" / ")}
                          </small>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              {rows.length === 0 && (
                <p className={s.notice}>
                  조건에 맞는 유형이 없습니다. 단원이나 검색어를 바꿔 주세요.
                </p>
              )}
              <div className={s.pager}>
                <button
                  type="button"
                  disabled={currentPage === 0}
                  onClick={() => setPage((value) => value - 1)}
                >
                  이전
                </button>
                <span>
                  {currentPage + 1} / {pageCount}
                </span>
                <button
                  type="button"
                  disabled={currentPage + 1 >= pageCount}
                  onClick={() => setPage((value) => value + 1)}
                >
                  다음
                </button>
              </div>
            </>
          )}
          <div className={s.fields}>
            <label className={s.field}>
              <span>응답 형식</span>
              <select
                value={conditions.format}
                onChange={(event) =>
                  change({ format: event.target.value as Conditions["format"] })
                }
              >
                {["혼합", "객관식", "단답형", "서술형"].map((format) => (
                  <option key={format} value={format}>
                    {format}
                  </option>
                ))}
              </select>
            </label>
            <label className={s.field}>
              <span>난이도</span>
              <select
                value={conditions.difficulty}
                onChange={(event) =>
                  change({
                    difficulty: event.target.value as Conditions["difficulty"],
                  })
                }
              >
                <option value="">지원하는 난이도 모두</option>
                {DIFFICULTY_LADDER.map((tier) => (
                  <option key={tier} value={tier}>
                    {tier}
                  </option>
                ))}
              </select>
            </label>
            <label className={s.field}>
              <span>문항 수</span>
              <input
                type="number"
                min={1}
                max={30}
                value={
                  Number.isFinite(conditions.count) ? conditions.count : ""
                }
                onChange={(event) =>
                  change({ count: event.target.valueAsNumber })
                }
              />
            </label>
            <label className={s.field}>
              <span>유형마다 최대 문항 수</span>
              <input
                type="number"
                min={1}
                max={30}
                value={
                  Number.isFinite(conditions.maxPerFamily)
                    ? conditions.maxPerFamily
                    : ""
                }
                onChange={(event) =>
                  change({ maxPerFamily: event.target.valueAsNumber })
                }
              />
            </label>
          </div>
          <p className={s.muted}>
            형식만 다른 같은 문제는 한 번만 포함합니다. 서술형은 풀이 과정과
            채점 기준이 있는 유형에서 제공합니다.
          </p>
          {message && (
            <p className={s.error} role="alert">
              {message}
            </p>
          )}
          <button
            className={s.primary}
            type="button"
            disabled={
              !catalog ||
              busy ||
              !canOutput ||
              !Number.isInteger(conditions.count) ||
              conditions.count < 1 ||
              conditions.count > 30 ||
              !Number.isInteger(conditions.maxPerFamily) ||
              conditions.maxPerFamily < 1 ||
              conditions.maxPerFamily > 30
            }
            onClick={() => void create()}
          >
            {busy ? "문항 만드는 중…" : "연습 문제 만들기"}
          </button>
          {busy && (
            <p className={s.muted} role="status">
              조건과 중복을 확인하고 필요한 그림을 만들고 있습니다.
            </p>
          )}
        </section>
        {result ? (
          <ExamStudyResults
            result={result}
            busy={busy}
            onRegenerate={() => void create()}
            onOutput={() => setOutput(true)}
          />
        ) : (
          <section className={s.empty} aria-live="polite">
            <h2>문항 검토</h2>
            <p>
              {busy
                ? "완성된 문항이 여기에 표시됩니다."
                : "연습 범위를 고르고 문제를 만들어 주세요. 정답과 풀이는 문항별로 펼쳐 볼 수 있습니다."}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

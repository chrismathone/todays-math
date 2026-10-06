"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { newRequestId } from "@/lib/textbook/client";
import type { QuickCreateApi } from "@/lib/textbook/quickCreateClient";
import {
  RECOMMENDED_QUICK_CREATE_COMPONENTS,
  minimumQuickCreateProblemCount,
  quickCreateSelectionInput,
  type QuickCreateCatalog,
  type QuickCreateComponents,
  type QuickCreateResult,
  type QuickCreateInput,
} from "@/contracts/textbookQuickCreate.contract";
import {
  TEXTBOOK_CHARACTERS,
  DEFAULT_TEXTBOOK_CAST,
} from "@/lib/textbook/characters";
import styles from "./AutoCreatePanel.module.css";

const GRADES = ["초3", "초4", "초5", "초6", "중1", "중2", "중3"];
type CatalogUnit = QuickCreateCatalog["units"][number] & {
  availability?: Record<
    QuickCreateInput["difficulty"],
    { total: number; written: number }
  >;
};
const DIFFICULTY_LABELS = {
  basic: "기초",
  standard: "표준",
  challenge: "심화",
};
const COMPONENTS: {
  key: keyof QuickCreateComponents;
  label: string;
  hint: string;
}[] = [
  { key: "cover", label: "표지", hint: "학년·학기와 교재 제목" },
  { key: "learningGuide", label: "학습 안내", hint: "이 교재로 공부하는 순서" },
  { key: "learningPlan", label: "학습 계획", hint: "범위별 학습과 복습 기록" },
  {
    key: "questionLog",
    label: "질문 기록",
    hint: "궁금한 점과 틀린 이유 기록",
  },
  { key: "preparation", label: "준비 학습", hint: "시작 전 필요한 개념 확인" },
  { key: "unitIntro", label: "단원 도입", hint: "배울 내용과 준비할 개념" },
  {
    key: "dialogue",
    label: "개념 대화",
    hint: "선생님과 학생이 질문하며 배우기",
  },
  { key: "concepts", label: "개념 정리", hint: "정의·성질·예제 정리" },
  {
    key: "termRecall",
    label: "개념 질문",
    hint: "물음을 읽고 개념과 이유 쓰기",
  },
  {
    key: "clozeRecall",
    label: "빈칸 개념 암기",
    hint: "핵심어를 빈칸으로 연습",
  },
  {
    key: "sentenceRecall",
    label: "책 없이 답 쓰기",
    hint: "같은 물음을 책 없이 다시 확인하기",
  },
  {
    key: "workedExamples",
    label: "대표예제와 풀이",
    hint: "풀이를 읽고 같은 방법으로 연습하기",
  },
  {
    key: "practice",
    label: "유형·실전 문제",
    hint: "선택한 난이도의 문제 자동 배치",
  },
  { key: "written", label: "서술형", hint: "풀이 과정을 쓰는 문제" },
  {
    key: "errorCheck",
    label: "오류 점검",
    hint: "틀리기 쉬운 생각을 바로잡기",
  },
  { key: "review", label: "복습 문제", hint: "선택한 범위 다시 연습하기" },
  { key: "assessment", label: "단원 확인", hint: "배운 내용 확인하기" },
  { key: "rest", label: "쉬어가기", hint: "수학 삽화와 짧은 이야기" },
  { key: "tableOfContents", label: "목차", hint: "선택한 활동과 실제 쪽수" },
  {
    key: "dialogueCheck",
    label: "대화 읽기 확인",
    hint: "읽은 수업의 핵심을 짚기",
  },
  {
    key: "conceptStudy",
    label: "개념 학습",
    hint: "같은 개념표로 읽고 반복 확인",
  },
  {
    key: "conceptBlankTest",
    label: "자유 개념 백지",
    hint: "기억한 개념을 스스로 정리",
  },
  {
    key: "basicCheck",
    label: "개념 기초 확인",
    hint: "배운 개념을 짧은 문제로 확인",
  },
  {
    key: "explainActivity",
    label: "설명 활동",
    hint: "개념을 말하고 이유를 쓰기",
  },
  {
    key: "conceptMap",
    label: "단원 개념 확인 모음",
    hint: "같은 단원의 질문을 묶어서 확인",
  },
  { key: "reasoning", label: "추론 활동", hint: "근거와 판단 과정을 설명" },
  {
    key: "conceptIndex",
    label: "개념 색인",
    hint: "개념 이름으로 해당 쪽 찾기",
  },
  { key: "typeIndex", label: "유형 색인", hint: "수록한 문제 유형으로 찾기" },
];
const RECOMMENDED_COMPONENTS: QuickCreateComponents =
  RECOMMENDED_QUICK_CREATE_COMPONENTS;

const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "교재를 만들지 못했습니다. 다시 시도해 주세요.";

export function AutoCreatePanel({
  api,
  onCreated,
}: {
  api: QuickCreateApi;
  onCreated: (result: QuickCreateResult) => Promise<void>;
}) {
  const [gradeLabel, setGradeLabel] = useState("중2");
  const [semester, setSemester] = useState<1 | 2>(1);
  const [catalog, setCatalog] = useState<QuickCreateCatalog | null>(null);
  const [startId, setStartId] = useState("");
  const [endId, setEndId] = useState("");
  const [difficulty, setDifficulty] = useState<
    "basic" | "standard" | "challenge"
  >("standard");
  const [count, setCount] = useState("8");
  const [title, setTitle] = useState("");
  const [components, setComponents] = useState<QuickCreateComponents>(
    RECOMMENDED_COMPONENTS,
  );
  const [cast, setCast] = useState({ ...DEFAULT_TEXTBOOK_CAST });
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const request = useRef<{ plan: string; id: string } | null>(null);
  const schoolLevel = gradeLabel.startsWith("초") ? "elementary" : "middle";
  const grade = Number(gradeLabel.slice(1));

  useEffect(() => {
    let cancelled = false;
    api
      .listUnits({ schoolLevel, grade, semester })
      .then((next) => {
        if (cancelled) return;
        setCatalog(next);
        setStartId(next.units[0]?.id ?? "");
        setEndId(next.units[0]?.id ?? "");
        setLoadError(null);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setCatalog(null);
          setLoadError(errorMessage(reason));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, schoolLevel, grade, semester, reload]);

  function changeScope(change: () => void) {
    setCatalog(null);
    setStartId("");
    setEndId("");
    setLoadError(null);
    setError(null);
    change();
  }
  const units: CatalogUnit[] = catalog?.units ?? [];
  const startIndex = units.findIndex((unit) => unit.id === startId);
  const endIndex = units.findIndex((unit) => unit.id === endId);
  const selected =
    startIndex >= 0 && endIndex >= startIndex
      ? units.slice(startIndex, endIndex + 1)
      : [];
  const enabled = Object.values(components).filter(Boolean).length;
  const contentEnabled = Object.entries(components).some(
    ([key, value]) => key !== "cover" && value,
  );
  const problemComponents = [
    components.practice,
    components.workedExamples,
    components.written,
    components.review,
    components.assessment,
    components.basicCheck,
    components.reasoning,
  ].filter(Boolean).length;
  const problemCount = Number(count);
  const minimumProblemCount = minimumQuickCreateProblemCount(components);
  const validCount =
    Number.isSafeInteger(problemCount) &&
    problemCount >= minimumProblemCount &&
    problemCount <= 30;
  const nonWrittenStages = COMPONENTS.filter(
    ({ key }) =>
      (key === "practice" ||
        key === "workedExamples" ||
        key === "review" ||
        key === "assessment" ||
        key === "basicCheck") &&
      components[key],
  ).map(({ label }) => label);
  const availability = selected.map((unit) => unit.availability?.[difficulty]);
  const knownAvailability = availability.flatMap((value) =>
    value ? [value] : [],
  );
  const availabilityComplete =
    selected.length > 0 && knownAvailability.length === selected.length;
  const availableTotal = knownAvailability.reduce(
    (total, value) => total + value.total,
    0,
  );
  const availableWritten = knownAvailability.reduce(
    (total, value) => total + value.written,
    0,
  );
  const shortageUnits =
    availabilityComplete && validCount
      ? knownAvailability.filter(
          (value) =>
            (nonWrittenStages.length ? value.total : value.written) <
            problemCount,
        ).length
      : 0;
  const noAvailableQuestions =
    availabilityComplete &&
    (nonWrittenStages.length ? availableTotal : availableWritten) === 0;
  const learningContentEnabled =
    quickCreateSelectionInput(components).includeConcepts;
  const noQuestionContent =
    problemComponents > 0 && noAvailableQuestions && !learningContentEnabled;
  const ready =
    catalog?.writerReady !== false &&
    selected.length > 0 &&
    contentEnabled &&
    (!problemComponents || validCount) &&
    !noQuestionContent;
  const suggestedTitle = `${gradeLabel} ${semester}학기 · ${selected[0]?.section ?? "범위를 선택하세요"}${selected.length > 1 ? ` ~ ${selected.at(-1)?.section}` : ""}`;

  return (
    <section className={styles.creator} aria-label="간편 교재 만들기">
      <div className={styles.intro}>
        <p className={styles.eyebrow}>범위만 고르면, 한 권으로</p>
        <h2>어떤 교재를 만들까요?</h2>
        <p>
          문제와 준비된 개념 원고를 자동으로 담습니다. 필요한 구성은 켜고, 필요
          없는 구성은 꺼 주세요.
        </p>
        <p>개념 원고: 초3–중3 준비됨 · 어휘와 수업 흐름은 전체 편집 검수 전</p>
      </div>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!ready || busy) return;
          const plan: Omit<QuickCreateInput, "requestId"> = {
            schoolLevel,
            grade,
            semester,
            startUnitId: startId,
            endUnitId: endId,
            difficulty,
            problemCountPerUnit: problemComponents ? problemCount : 8,
            ...quickCreateSelectionInput(components),
            cast,
            ...(title.trim() ? { title: title.trim() } : {}),
          };
          const serialized = JSON.stringify(plan);
          if (request.current?.plan !== serialized)
            request.current = { plan: serialized, id: newRequestId() };
          setBusy(true);
          setError(null);
          try {
            const result = await api.create({
              ...plan,
              requestId: request.current.id,
            });
            await onCreated(result);
            request.current = null;
          } catch (reason) {
            setError(errorMessage(reason));
          } finally {
            setBusy(false);
          }
        }}
      >
        {catalog?.writerReady === false && (
          <p role="status">
            교재 제작 기능을 업데이트하고 있습니다. 잠시 후 다시 시도해 주세요.
          </p>
        )}
        <fieldset disabled={busy} className={styles.fields}>
          <legend className={styles.step}>1. 학년과 학기</legend>
          <div className={styles.scope}>
            <label>
              학년
              <select
                value={gradeLabel}
                onChange={(event) =>
                  changeScope(() => setGradeLabel(event.target.value))
                }
              >
                {GRADES.map((label) => (
                  <option key={label}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              학기
              <select
                value={semester}
                onChange={(event) =>
                  changeScope(() =>
                    setSemester(event.target.value === "2" ? 2 : 1),
                  )
                }
              >
                <option value="1">1학기</option>
                <option value="2">2학기</option>
              </select>
            </label>
          </div>
          <h3 className={styles.step}>2. 여기서부터 여기까지</h3>
          {loadError ? (
            <div role="alert" className={styles.error}>
              {loadError}{" "}
              <button
                type="button"
                onClick={() => {
                  setLoadError(null);
                  setReload((value) => value + 1);
                }}
              >
                범위 다시 불러오기
              </button>
            </div>
          ) : !catalog ? (
            <p role="status">선택한 학기의 범위를 불러오는 중입니다.</p>
          ) : units.length === 0 ? (
            <p className={styles.error}>
              이 학기의 문제 범위가 아직 준비되지 않았습니다.
            </p>
          ) : null}
          <div className={styles.scope}>
            <label>
              시작 범위
              <select
                value={startId}
                disabled={!units.length}
                onChange={(event) => {
                  const id = event.target.value;
                  setStartId(id);
                  if (units.findIndex((unit) => unit.id === id) > endIndex)
                    setEndId(id);
                }}
              >
                {units.map((unit) => (
                  <option value={unit.id} key={unit.id}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </label>
            <span className={styles.rangeArrow} aria-hidden="true">
              →
            </span>
            <label>
              끝 범위
              <select
                value={endId}
                disabled={!units.length}
                onChange={(event) => setEndId(event.target.value)}
              >
                {units
                  .filter((_, index) => index >= startIndex)
                  .map((unit) => (
                    <option value={unit.id} key={unit.id}>
                      {unit.label}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <h3 className={styles.step}>3. 난이도와 구성</h3>
          <div className={styles.scope}>
            <label>
              난이도
              <select
                value={difficulty}
                onChange={(event) =>
                  setDifficulty(event.target.value as typeof difficulty)
                }
              >
                <option value="basic">기초 · 연산과 기본</option>
                <option value="standard">표준 · 기본과 응용</option>
                <option value="challenge">심화 · 응용과 심화</option>
              </select>
            </label>
            <label>
              소단원당 최대 문제 수
              <input
                type="number"
                min={minimumProblemCount}
                max="30"
                value={count}
                disabled={!problemComponents}
                aria-describedby="quick-create-availability"
                onChange={(event) => setCount(event.target.value)}
              />
            </label>
          </div>
          <details className={styles.details}>
            <summary>교재 구성 선택</summary>
            <p>
              {COMPONENTS.length}가지 구성을 켜고 끌 수 있습니다. 기본은
              표지·단원 도입·개념·문제로 시작합니다.
            </p>
            <p>
              <button
                type="button"
                onClick={() => setComponents(RECOMMENDED_COMPONENTS)}
              >
                추천 구성
              </button>{" "}
              <button
                type="button"
                onClick={() =>
                  setComponents(
                    Object.fromEntries(
                      COMPONENTS.map(({ key }) => [key, true]),
                    ) as QuickCreateComponents,
                  )
                }
              >
                모두 켜기
              </button>{" "}
              <button
                type="button"
                onClick={() =>
                  setComponents(
                    Object.fromEntries(
                      COMPONENTS.map(({ key }) => [key, false]),
                    ) as QuickCreateComponents,
                  )
                }
              >
                모두 끄기
              </button>
            </p>
            <div className={styles.toggleGrid}>
              {COMPONENTS.map(({ key, label, hint }) => (
                <button
                  key={key}
                  type="button"
                  role="switch"
                  aria-checked={components[key]}
                  className={styles.toggle}
                  onClick={() =>
                    setComponents((current) => ({
                      ...current,
                      [key]: !current[key],
                    }))
                  }
                >
                  <span>
                    <strong>{label}</strong>
                    <small>{hint}</small>
                  </span>
                  <span className={styles.switchTrack} aria-hidden="true">
                    <span />
                  </span>
                </button>
              ))}
            </div>
          </details>
          <details className={styles.details}>
            <summary>등장인물 선택</summary>
            <p>
              선생님 10종·학생 10종 중 선택하세요. 각 인물에는 4가지 표정이
              준비되어 있습니다.
            </p>
            {(
              [
                ["teacherId", "선생님", "teacher"],
                ["student1Id", "첫 번째 학생", "student"],
                ["student2Id", "두 번째 학생", "student"],
              ] as const
            ).map(([key, label, role]) => (
              <fieldset className={styles.castGroup} key={key}>
                <legend>{label}</legend>
                <div className={styles.characters}>
                  {TEXTBOOK_CHARACTERS.filter(
                    (character) => character.role === role,
                  ).map((character) => (
                    <button
                      type="button"
                      className={styles.character}
                      key={character.id}
                      aria-label={`${label} ${character.name}`}
                      aria-pressed={cast[key] === character.id}
                      onClick={() =>
                        setCast((current) => ({
                          ...current,
                          [key]: character.id,
                        }))
                      }
                    >
                      <span className={styles.face}>
                        <Image
                          src={character.src}
                          width={128}
                          height={128}
                          alt=""
                          unoptimized
                        />
                      </span>
                      <span>{character.name}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
          </details>
          <details className={styles.details}>
            <summary>교재 제목 직접 정하기</summary>
            <label>
              교재 제목
              <input
                value={title}
                maxLength={120}
                placeholder={suggestedTitle}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
          </details>
          <div className={styles.summary} aria-live="polite">
            <strong>
              {selected.length
                ? `${gradeLabel} ${semester}학기 · ${selected.length}개 소단원`
                : "학습 범위를 선택하세요"}
            </strong>
            <span>
              {enabled}가지 구성
              {problemComponents && validCount
                ? ` · 최대 ${selected.length * problemCount}문제`
                : ""}
              {components.dialogue ? " · 개념 원고 자동 첨부" : ""}
            </span>
          </div>
          {selected.length > 0 && problemComponents > 0 ? (
            <div
              id="quick-create-availability"
              className={styles.availability}
              aria-live="polite"
            >
              <strong>
                {availabilityComplete
                  ? `${DIFFICULTY_LABELS[difficulty]} 난이도 사용 가능 ${availableTotal}문제 · 서술형 ${availableWritten}문제 포함`
                  : "선택한 난이도의 사용 가능한 문제 수는 만들 때 확인합니다."}
              </strong>
              <p>
                선택한 난이도의 문제만 소단원당 목표 최대 수까지 담습니다.
                문제가 부족하면 준비된 만큼 담고, 빈 문제 구성은 생략합니다.
              </p>
              {noQuestionContent ? (
                <p role="alert" className={styles.error}>
                  사용 가능한 문제가 없습니다. 범위나 난이도를 바꾸거나 개념
                  구성을 켜 주세요.
                </p>
              ) : noAvailableQuestions ? (
                <p className={styles.adjustment}>
                  사용 가능한 문제가 없어 문제 구성은 생략합니다. 켜 둔 개념과
                  다른 구성은 그대로 담습니다.
                </p>
              ) : shortageUnits > 0 ? (
                <p className={styles.adjustment}>
                  문제가 부족한 {shortageUnits}개 소단원은 목표 최대 수보다 적게
                  담습니다.
                </p>
              ) : null}
              {components.written ? (
                <p className={styles.adjustment}>
                  {nonWrittenStages.length
                    ? `서술형이 부족하면 부족한 수만큼 켜 둔 ${nonWrittenStages.join("·")}에 자동 배분합니다.`
                    : "서술형이 부족하면 준비된 서술형만 담고, 서술형이 없는 소단원은 해당 구성을 생략합니다."}
                </p>
              ) : null}
            </div>
          ) : null}
          {!contentEnabled ? (
            <p className={styles.error}>
              표지 외에 구성을 하나 이상 켜 주세요.
            </p>
          ) : null}
          {problemComponents > 0 && !validCount ? (
            <p className={styles.error}>
              문제 수는 {minimumProblemCount}~30 사이의 정수로 입력해 주세요.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className={styles.create}
            disabled={!ready || busy}
          >
            {busy ? "문제와 개념을 담고 있습니다…" : "이 범위로 교재 만들기"}
          </button>
          <p className={styles.footnote}>
            완성한 뒤 미리보고, 내용을 수정하거나 PDF로 만들 수 있습니다.
          </p>
        </fieldset>
      </form>
    </section>
  );
}

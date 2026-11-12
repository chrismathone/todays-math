"use client";

import { useId, useMemo, useState, type RefObject } from "react";
import { PickerDialog } from "@/components/picker-dialog/PickerDialog";
import { BlankSentence, KeySentence, PaperText } from "./paper/PaperParts";
import {
  CONCEPT_BLANK_LEVELS,
  CONCEPT_BLANK_FORM_LABELS,
  type ConceptBlankBank,
  type ConceptBlankForm,
  type ConceptBlankLevel,
  type ConceptBlankPick,
  type LevelCounts,
} from "@/contracts/conceptBlank.contract";
import {
  fillPicks,
  pickCounts,
  pickKey,
  pickPool,
  pickRow,
  samePick,
  PICK_COUNT_CAP,
  type PickRow,
} from "@/lib/concept-blank/manualPick";
import {
  clozeSentence,
  termAnswer,
  termPrompt,
} from "@/lib/concept-blank/questions";
import { getBlankSection, sectionTitleTex } from "@/lib/concept-blank/sections";
import s from "./question-picker.module.css";

export type FillTargets = Record<PickRow, LevelCounts>;
const LETTER = { recall: "A", term: "B", cloze: "C", map: "D", figure: "E" };
const KINDS: Record<ConceptBlankForm, [string, string?]> = {
  recall: ["개념"],
  term: ["질문", "○×"],
  cloze: ["문장", "적용"],
  map: ["개념"],
  figure: ["그림"],
};
const sectionTitle = (key: string) =>
  sectionTitleTex(getBlankSection(key)?.title ?? key).replace(/ 알아보기$/, "");

export default function ConceptBlankQuestionPicker({
  bank,
  sections,
  form,
  picks,
  targets,
  returnFocus,
  onCancel,
  onApply,
}: {
  bank: ConceptBlankBank;
  sections: string[];
  form: ConceptBlankForm;
  picks: ConceptBlankPick[];
  targets: FillTargets;
  returnFocus: RefObject<HTMLButtonElement | null>;
  onCancel: () => void;
  onApply: (picks: ConceptBlankPick[], targets: FillTargets) => void;
}) {
  const promptId = useId();
  const pools = useMemo(
    () => ({
      main: pickPool(bank, sections, form, "main"),
      extra: pickPool(bank, sections, form, "extra"),
    }),
    [bank, sections, form],
  );
  const all = useMemo(() => [...pools.main, ...pools.extra], [pools]);
  const [chosen, setChosen] = useState(() => {
    const current = new Map(all.map((pick) => [pickKey(pick), pick]));
    return picks.filter((pick) => {
      if (!sections.includes(pick.blankSectionKey)) return false;
      const candidate = current.get(pickKey(pick));
      return candidate && samePick(pick, candidate);
    });
  });
  const [fill, setFill] = useState(targets);
  const [row, setRow] = useState<PickRow>(pools.main.length ? "main" : "extra");
  const [section, setSection] = useState("all");
  const [level, setLevel] = useState<ConceptBlankLevel | "all">("all");
  const [onlyChosen, setOnlyChosen] = useState(false);
  const [shown, setShown] = useState<Set<string>>(() => new Set());
  const [limitHit, setLimitHit] = useState(false);
  const chosenKeys = new Set(chosen.map(pickKey));
  const currentCounts = pickCounts(chosen, row);
  const kind = KINDS[form][row === "main" ? 0 : 1];
  const visible = pools[row].filter(
    (pick) =>
      (section === "all" || pick.blankSectionKey === section) &&
      (level === "all" || pick.level === level) &&
      (!onlyChosen || chosenKeys.has(pickKey(pick))),
  );
  const content = useMemo(() => {
    const concepts = new Map(bank.concepts.map((entry) => [entry.id, entry]));
    const ox = new Map(bank.ox.map((entry) => [entry.id, entry]));
    const apply = new Map(bank.apply.map((entry) => [entry.id, entry]));
    const figures = new Map(bank.figures.map((entry) => [entry.id, entry]));
    return new Map(
      all.map((pick) => {
        let prompt: string,
          answer: string,
          cloze = false;
        if (pick.entryKind === "concept") {
          const entry = concepts.get(pick.entryId)!;
          cloze = form === "cloze";
          prompt = cloze
            ? clozeSentence(entry)
            : form === "recall"
              ? entry.term
              : termPrompt(entry);
          answer = cloze
            ? clozeSentence(entry)
            : form === "recall"
              ? entry.definition
              : termAnswer(entry);
        } else if (pick.entryKind === "ox") {
          const entry = ox.get(pick.entryId)!;
          prompt = entry.statement;
          answer = `${entry.answer ? "○" : "×"} — ${entry.why}`;
        } else if (pick.entryKind === "apply") {
          const entry = apply.get(pick.entryId)!;
          prompt = entry.prompt;
          answer = entry.answer;
        } else {
          const entry = figures.get(pick.entryId)!;
          prompt = entry.prompt;
          answer = [
            ...entry.tags.map((tag) => tag.answer),
            ...entry.lines.map((line) => `${line.label}: ${line.answer}`),
          ].join(" · ");
        }
        return [pickKey(pick), { prompt, answer, cloze }];
      }),
    );
  }, [all, bank, form]);

  const remove = (pick: ConceptBlankPick) => {
    setChosen((current) => current.filter((p) => pickKey(p) !== pickKey(pick)));
    setLimitHit(false);
  };
  const add = (items: ConceptBlankPick[]) => {
    const next = [...chosen],
      keys = new Set(chosenKeys),
      counts = { ...currentCounts };
    let hit = false;
    for (const pick of items) {
      if (keys.has(pickKey(pick))) continue;
      if (counts[pick.level] >= PICK_COUNT_CAP) {
        hit = true;
        continue;
      }
      next.push(pick);
      keys.add(pickKey(pick));
      counts[pick.level]++;
    }
    setChosen(next);
    setLimitHit(hit);
  };
  const showPrompt = (pick: ConceptBlankPick) => {
    const value = content.get(pickKey(pick))!;
    return value.cloze ? (
      <BlankSentence sentence={value.prompt} />
    ) : (
      <PaperText text={value.prompt} />
    );
  };
  const sectionCount = (key: string) => {
    const entries = pools[row].filter(
      (pick) => key === "all" || pick.blankSectionKey === key,
    );
    return (
      <span className={s.count}>
        <b>{entries.filter((pick) => chosenKeys.has(pickKey(pick))).length}</b>{" "}
        / {entries.length}
      </span>
    );
  };

  return (
    <PickerDialog
      title={`${LETTER[form]} ${CONCEPT_BLANK_FORM_LABELS[form]} — 문항 고르기`}
      titleAside={<span className={s.total}>고름 {chosen.length}</span>}
      width="wide"
      doneLabel="적용"
      cancelLabel="취소"
      returnFocus={returnFocus}
      onCancel={onCancel}
      onClose={() => onApply(chosen, fill)}
      footer={
        <div className={s.fillBar}>
          <span>자동으로 채울 수 · {kind}</span>
          <div className={s.fillCounts}>
            {CONCEPT_BLANK_LEVELS.map((value) => (
              <label key={value}>
                {value}
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={PICK_COUNT_CAP}
                  value={fill[row][value]}
                  aria-label={`채울 수 ${value}`}
                  onChange={(event) => {
                    const number = Number(event.target.value);
                    setFill((current) => ({
                      ...current,
                      [row]: {
                        ...current[row],
                        [value]: Number.isFinite(number)
                          ? Math.min(
                              PICK_COUNT_CAP,
                              Math.max(0, Math.floor(number)),
                            )
                          : 0,
                      },
                    }));
                  }}
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setChosen(fillPicks(pools[row], chosen, fill[row], "missing"));
              setLimitHit(false);
            }}
          >
            빈 칸만 자동으로
          </button>
          <button
            type="button"
            className={s.quiet}
            onClick={() => {
              setChosen(fillPicks(pools[row], chosen, fill[row], "replace"));
              setLimitHit(false);
            }}
          >
            모두 비우고 자동으로
          </button>
        </div>
      }
    >
      <div className={s.columns}>
        <aside className={s.filters} aria-label="문항 거르기">
          <div>
            <h3>소단원</h3>
            <div className={s.sections}>
              <button
                type="button"
                aria-pressed={section === "all"}
                onClick={() => setSection("all")}
              >
                전체{sectionCount("all")}
              </button>
              {sections.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={section === key}
                  onClick={() => setSection(key)}
                >
                  <span>
                    <PaperText text={sectionTitle(key)} />
                  </span>
                  {sectionCount(key)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3>난이도</h3>
            <div className={s.pills} role="group" aria-label="난이도">
              {(["all", ...CONCEPT_BLANK_LEVELS] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={level === value}
                  onClick={() => setLevel(value)}
                >
                  {value === "all" ? "전체" : value}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3>종류</h3>
            <div className={s.pills} role="group" aria-label="종류">
              {KINDS[form].map((label, index) => (
                <button
                  key={label}
                  type="button"
                  aria-label={label}
                  aria-pressed={row === (index ? "extra" : "main")}
                  onClick={() => setRow(index ? "extra" : "main")}
                >
                  {label}{" "}
                  <span aria-hidden="true">
                    {chosen.filter(
                      (pick) => pickRow(pick) === (index ? "extra" : "main"),
                    ).length || ""}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3>보기</h3>
            <div className={s.pills}>
              <button
                type="button"
                aria-pressed={onlyChosen}
                onClick={() => setOnlyChosen(!onlyChosen)}
              >
                고른 것만
              </button>
            </div>
          </div>
        </aside>
        <section className={s.main} aria-label="고를 문항">
          <div className={s.listHead}>
            <strong>
              {section === "all" ? (
                "전체 소단원"
              ) : (
                <PaperText text={sectionTitle(section)} />
              )}
            </strong>
            <span>
              {kind} {visible.length}문항
            </span>
            <div className={s.bulk}>
              <button type="button" onClick={() => add(visible)}>
                보이는 것 모두 고르기
              </button>
              <button
                type="button"
                onClick={() => {
                  const keys = new Set(visible.map(pickKey));
                  setChosen(chosen.filter((pick) => !keys.has(pickKey(pick))));
                  setLimitHit(false);
                }}
              >
                보이는 것 모두 풀기
              </button>
            </div>
          </div>
          {(limitHit ||
            CONCEPT_BLANK_LEVELS.some(
              (value) => currentCounts[value] >= PICK_COUNT_CAP,
            )) && (
            <p role="status" className={s.limit}>
              종류별로 각 난이도에서 {PICK_COUNT_CAP}문항까지 고를 수 있습니다.
            </p>
          )}
          <ul className={s.items}>
            {visible.map((pick) => {
              const key = pickKey(pick),
                selected = chosenKeys.has(key),
                value = content.get(key)!;
              return (
                <li key={key} data-selected={selected}>
                  <input
                    type="checkbox"
                    aria-label={`${pools[row].indexOf(pick) + 1}번 문항 고르기`}
                    aria-describedby={`${promptId}-${key}`}
                    checked={selected}
                    disabled={
                      !selected && currentCounts[pick.level] >= PICK_COUNT_CAP
                    }
                    onChange={() => (selected ? remove(pick) : add([pick]))}
                  />
                  <div className={s.text}>
                    <span id={`${promptId}-${key}`} data-pick-prompt="">
                      {showPrompt(pick)}
                    </span>{" "}
                    {shown.has(key) ? (
                      <div className={s.answer}>
                        <b>답</b> <KeySentence sentence={value.answer} />
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={s.answerButton}
                        onClick={() =>
                          setShown((current) => new Set(current).add(key))
                        }
                      >
                        답 보기
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {!visible.length && (
            <p className={s.empty}>조건에 맞는 문항이 없습니다.</p>
          )}
        </section>
        <aside className={s.tray} aria-label="고른 문항">
          <h3>
            고른 문항 <span className={s.total}>{chosen.length}</span>
          </h3>
          {CONCEPT_BLANK_LEVELS.map((value) => {
            const entries = all.filter(
              (pick) => pick.level === value && chosenKeys.has(pickKey(pick)),
            );
            return (
              <section key={value}>
                <h4>
                  <span className={s.level} data-level={value}>
                    {value}
                  </span>
                  <span>{entries.length}문항</span>
                </h4>
                {entries.map((pick) => (
                  <div key={pickKey(pick)} className={s.trayItem}>
                    <div>
                      {showPrompt(pick)}
                      <small>
                        <PaperText text={sectionTitle(pick.blankSectionKey)} />{" "}
                        · {KINDS[form][pickRow(pick) === "main" ? 0 : 1]}
                      </small>
                    </div>
                    <button
                      type="button"
                      aria-label={`${pools[pickRow(pick)].findIndex((p) => pickKey(p) === pickKey(pick)) + 1}번 ${KINDS[form][pickRow(pick) === "main" ? 0 : 1]} 빼기`}
                      onClick={() => remove(pick)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </section>
            );
          })}
        </aside>
      </div>
    </PickerDialog>
  );
}

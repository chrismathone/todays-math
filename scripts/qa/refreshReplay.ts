/**
 * **계획 폴더 밖에서 승인된 행을 되만든다** — `refresh-engine-content.ts --replay <목록.json>` (D-164 3회차 ④⑤).
 *
 * 갱신 도구는 `scripts/import/plans/` 의 계획만 되만든다. 그런데 2026-10-18 보강 · 보충 묶음은 승인 기록(매니페스트)에
 * 계획을 두고 넣었고, 오래된 계획의 행 가운데에는 뒤에 변형 고르기가 바뀌어 지금 계획이 더는 고르지 않는 씨앗이 있다.
 * 그 행들은 «못 맞댐»으로 빠져 고칠 길도 · 같은 문제인지 볼 길도 없었다.
 *
 * 두 길이 있다 — 둘 다 **적재기와 같은 함수**로 만든다(옮겨 적지 않는다):
 *   - `plan`   승인된 계획(`seedBase` · 대상 · `perTier`)을 `buildTargetRows` 로 그대로 돌려 승인된 `selectedExternalIds` 만 고른다.
 *              🔴 씨앗마다 `perTier: 1` 로 돌리지 않는다 — 객관식 보기 섞기의 변형 번호(`choiceSeed`)가 바뀌어 보기 · 정답 번호가 달라진다.
 *   - `pinned` 씨앗과 그 문항류 안의 변형 번호를 승인 원장에서 되살린 행 하나. 발문은 `generateElementaryForm`, 형식은 `expandFamily` 와 같은
 *              파생(`asShortAnswer` · `asMultipleChoice(choiceSeed(문항류, 번호))`)이다 — 시험이 `buildElemRows` 출력과 글자까지 견준다.
 * 되만든 행은 보통 행과 같은 문지기 · 쓰는 순간 대조를 지나고, 객관식은 **보기 다섯의 수와 글까지** 같아야 한다(`choicesRisk`).
 */
import { readFileSync } from "node:fs";

import {
  buildElemRows,
  buildTargetRows,
  type Target,
} from "../import/load-engine-problems";
import {
  elemProblemType,
  elementaryUnits,
  generateElementaryForm,
  listedForms,
} from "../../src/lib/elementary/generate";
import { createRng } from "../../src/lib/elementary/rng";
import { asMultipleChoice, asShortAnswer } from "../../src/lib/engine/deriveFormats";
import { choiceSeed } from "../../src/lib/engine/expandEngine";
import { hasChoices } from "../../src/lib/problem/choiceCountRule";
import { answerIsChoiceNumber } from "../../src/lib/problem/provenance";

export type ReplayMade = ReturnType<typeof buildElemRows>[number];

export type ReplayEntry =
  | {
      kind: "plan";
      /** 승인 기록의 자리 — 보고에 그대로 적는다 */
      source: string;
      plan: { seedBase: number; targets: Target[] };
      selectedExternalIds: string[];
    }
  | {
      kind: "pinned";
      source: string;
      externalId: string;
      /** 그 문항류 안의 변형 번호 — 파생 객관식의 보기 섞기 씨앗. 단답 · 처음부터 보기가 있는 문형은 쓰지 않는다. */
      variant: number;
    };

export type ReplayManifest = { version: 1; label: string; entries: ReplayEntry[] };

export function readReplayManifest(file: string): ReplayManifest {
  const m = JSON.parse(readFileSync(file, "utf8")) as ReplayManifest;
  if (m.version !== 1 || !Array.isArray(m.entries)) throw new Error(`되만들기 목록 형식이 아니다: ${file}`);
  return m;
}

const ELEM_ID = /^engine-elem:([^|]+)\|([^|]+)\|([^|]+)\|f([^|]+)\|(단답형|객관식)\|s(-?\d+)$/;

/** 씨앗 · 변형 번호를 고정한 초등 문형 행 하나 — `buildElemRows` 가 같은 씨앗 · 같은 번호에서 내는 행과 같다. */
export function pinnedElemRow(externalId: string, variant: number): ReplayMade {
  const m = ELEM_ID.exec(externalId);
  if (!m) throw new Error(`초등 문형 열쇠가 아니다: ${externalId}`);
  const [, grade, chapter, section, formId, questionType, rawSeed] = m;
  const unit = elementaryUnits().find((u) => u.grade === grade && u.chapter === chapter && u.section === section);
  if (!unit) throw new Error(`단원이 없다: ${externalId}`);
  const form = listedForms(unit).find((f) => f.id === formId);
  if (!form) throw new Error(`문형이 없다: ${externalId}`);
  const seed = Number(rawSeed);
  const familyKey = `elem:${unit.grade}|${unit.section}|${form.id}`;
  const p = generateElementaryForm(unit, seed, form.id);
  const stem = {
    content: p.content,
    answer: p.answer,
    solution: p.solution,
    familyKey,
    problemType: elemProblemType(form.tier),
    figureSpec: p.figureSpec,
    seed,
  };
  const native = hasChoices(stem.content) && answerIsChoiceNumber(stem.answer);
  let derived;
  if (native) {
    if (questionType !== "객관식") throw new Error(`처음부터 객관식인 문형에 단답 열쇠: ${externalId}`);
    derived = { ...stem, questionType: "객관식" as const };
  } else if (questionType === "단답형") derived = asShortAnswer(stem);
  else {
    if (form.allowMultipleChoice === false) throw new Error(`객관식을 내지 않는 문형: ${externalId}`);
    derived = asMultipleChoice(stem, createRng(choiceSeed(familyKey, variant)));
  }
  return {
    externalId,
    variantKey: `elem:${unit.grade}|${unit.section}|f${form.id}|s${seed}`,
    familyKey,
    unitKey: `${unit.grade} / ${unit.chapter} / ${unit.section}`,
    grade: unit.grade,
    chapter: unit.chapter,
    section: unit.section,
    content: derived.content,
    answer: derived.answer,
    solution: derived.solution,
    difficulty: form.tier,
    problemType: stem.problemType,
    questionType: derived.questionType,
    figureSpec: stem.figureSpec,
    origin: `초등 문형 ${form.id}(${form.tier})`,
  } as ReplayMade;
}

/** 목록이 되만들라고 한 열쇠 전부(되만들었든 못 했든). */
export function replayRequestedIds(manifest: ReplayManifest): string[] {
  return manifest.entries.flatMap((e) => (e.kind === "plan" ? e.selectedExternalIds : [e.externalId]));
}

/** 목록 → 되만든 행 · 되만들지 못한 승인 열쇠(그 까닭과 함께). */
export function replayRows(manifest: ReplayManifest): {
  made: Map<string, ReplayMade & { replaySource: string }>;
  missing: { externalId: string; source: string; reason: string }[];
} {
  const made = new Map<string, ReplayMade & { replaySource: string }>();
  const missing: { externalId: string; source: string; reason: string }[] = [];
  const put = (r: ReplayMade, source: string) => {
    if (made.has(r.externalId)) throw new Error(`되만들기 목록에 같은 열쇠가 둘: ${r.externalId}`);
    made.set(r.externalId, { ...r, replaySource: source });
  };
  for (const e of manifest.entries) {
    if (e.kind === "plan") {
      const quiet = console.log;
      console.log = () => {};
      let rows: ReplayMade[];
      try {
        rows = e.plan.targets.flatMap((t) => buildTargetRows(t, e.plan.seedBase) as ReplayMade[]);
      } finally {
        console.log = quiet;
      }
      const byId = new Map(rows.map((r) => [r.externalId, r]));
      for (const id of e.selectedExternalIds) {
        const r = byId.get(id);
        if (r) put(r, e.source);
        else missing.push({ externalId: id, source: e.source, reason: "승인된 계획을 지금 엔진으로 돌리면 이 열쇠가 안 나온다" });
      }
    } else {
      let row: ReplayMade;
      try {
        row = pinnedElemRow(e.externalId, e.variant);
      } catch (err) {
        missing.push({ externalId: e.externalId, source: e.source, reason: err instanceof Error ? err.message : String(err) });
        continue;
      }
      put(row, e.source);
    }
  }
  return { made, missing };
}

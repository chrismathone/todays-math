/**
 * 기출 **한 편**의 설정 — 편마다 다른 것은 전부 여기 있고, 스크립트에는 없다 (2026-09-12).
 *
 * 첫 편(정화중 25-2-중간)은 학교·편 id·소단원 표·손 고침이 **스크립트 안에 박혀** 있었다.
 * 둘째 편을 넣으려 하니 그 넷을 전부 고쳐 써야 했고, 그 작업폴더(되돌리기 원장 포함)는
 * **다른 컴퓨터에만** 있어 이 저장소에서 사라졌다. 그래서 편마다 폴더 하나
 * (`exams/<examId>/`)에 이 설정과 산출물을 두고 **커밋한다**.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** 소단원·문항류 — 사람이 원문과 원본 그림을 보고 정한다(D-120). **원장님 검토 대상.** */
export interface UnitAssignment {
  section: string;
  why: string;
  family: string;
  note?: string;
}

/** 규칙으로 못 고치는 한 자리 — `from` 이 그 행에 **정확히 하나** 있어야 한다. */
export interface HandFix {
  id: string;
  why: string;
  from: string;
  to: string;
}

export interface ExamConfig {
  /** `Problem.examId`. 학교를 로마자로 담는다 — 그림 경로에는 이것의 **해시**만 쓴다. */
  examId: string;
  school: string;
  /** 단원 트리의 학년 표기(`중3`). */
  grade: string;
  subject: string;
  /**
   * 표가 든 문항. 원본 지면에서 표를 **오려** 그림으로 붙이고(`figures/crop_tables.py`),
   * 발문에 한 줄에 한 칸씩 풀려 들어온 칸 줄은 걷는다(`build-exam-drafts.ts`).
   */
  tables?: number[];
  hand?: HandFix[];
  /** 문항 번호 → 소단원·문항류. 초안의 번호와 **한 개도 어긋나면 적재가 멈춘다.** */
  units: Record<string, UnitAssignment>;
}

export function loadExamConfig(dir: string): ExamConfig {
  const p = join(dir, "exam.json");
  if (!existsSync(p))
    throw new Error(`[중단] 편 설정이 없다: ${p} — 편마다 exam.json 을 둔다`);
  const c = JSON.parse(readFileSync(p, "utf-8")) as ExamConfig;
  for (const k of ["examId", "school", "grade", "subject"] as const)
    if (!c[k]) throw new Error(`[중단] exam.json 에 ${k} 가 없다`);
  if (!c.units || Object.keys(c.units).length === 0)
    throw new Error("[중단] exam.json 에 units(소단원·문항류 표)가 없다");
  for (const [n, u] of Object.entries(c.units))
    if (!u.section || !u.family || !u.why)
      throw new Error(
        `[중단] exam.json units.${n} 에 section·family·why 중 빈 것이 있다`,
      );
  return c;
}

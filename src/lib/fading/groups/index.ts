import type { FadingGroupTable } from "../concepts";
import { groups as e3 } from "./e3";
import { groups as e4 } from "./e4";
import { groups as e5 } from "./e5";
import { groups as e6 } from "./e6";
import { groups as m1 } from "./m1";
import { groups as m2 } from "./m2";
import { groups as m3 } from "./m3";

/**
 * 묶음 표 — 학년 파일 일곱(개념 백지 은행의 학년 파일과 짝이다). 은행의 보강 파일(`*-plus`)의 문장은 그 학년의 표에 같이 든다.
 * 표가 은행과 맞는지(모든 문장이 한 번씩 · 묶음마다 한 소단원 · 한 난이도 · 다섯 이하)는 `fadingGroups.test.ts` 가 잠근다.
 */
export const FADING_GROUP_PARTS: Readonly<Record<string, FadingGroupTable>> = {
  e3,
  e4,
  e5,
  e6,
  m1,
  m2,
  m3,
};

/** 전 학년의 묶음 표 — 학년 차례, 그 안은 표에 적힌 차례. */
export const FADING_GROUPS: FadingGroupTable = Object.assign(
  {},
  ...Object.values(FADING_GROUP_PARTS),
);

# 중1 난이도 «높이» 조사 — 매쓰홀릭 벤치마킹

작성 2026-08-31 · 워크트리 `bench-m1` · 브랜치 `BIGSHOL/bench-m1`

> ⏳ **작성 중** — 한 걸음 끝낼 때마다 흘려 쓴다(브리프 §0 ㉣).

---

## 0. 보는 자리 · 다시 재는 법

(채워 넣는 중)

---

## 1. 물음 ② — 모집단이 둘인가

**답: 중등은 하나다.** 초등이 물린 자리(갈래 경로 vs 문형 경로)가 중등에는 **없다.**

| 무엇 | 어디 | 부르는 함수 |
|------|------|------------|
| 적재기 | `scripts/import/load-engine-problems.ts:256` (`buildMiddleRows`) | `generateMiddleProblem(entry.key, seedBase, v)` |
| 4단 판정기 | `scripts/qa/probe-middle-tier-4dan.ts` | `generateMiddleProblem` |
| 이 조사의 계량기 | `scripts/qa/census-tier-frames-m1.ts` | `generateMiddleProblem` |

초등은 `generateElementaryForm`(문형, 적재기)과 `generateElementaryProblem`(갈래, 판정기)이
**다른 함수**였다. 중등은 유형 등록부(`registeredTypes()`)가 유일한 입구이고
`generateMiddleProblem` 하나만 있다 — **적재기와 판정기가 같은 것을 본다.**


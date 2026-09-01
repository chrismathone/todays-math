/**
 * 🔴 **판정기 그물의 소속 규칙 — 여기 한 곳뿐이다.**
 *
 * ## 왜 모듈로 뺐나 (2026-09-01)
 *
 * 규칙이 **두 벌**이었다. 눈금 시험(`elemProbeGauges.test.ts` ⑷)은 «성질»로 보고
 * (`probe-elem|middle-` 로 시작하거나 `--selftest` 를 가졌으면 판정기다), 실데이터
 * 쓸기(`sweep-elem-probes.mjs`)는 제 손으로 정규식을 하나 더 갖고 있었다:
 *
 *     ^probe-(elem|middle)-[a-z-]+\.(ts|py)$      ← 🔴 **숫자가 없다**
 *
 * 그래서 **이름에 숫자가 든 판정기는 쓸기에서 조용히 빠졌다.** 실측 일곱이었다 —
 * `probe-elem-tier-4dan` · `probe-middle-tier-4dan` · `probe-middle-top-m1` ·
 * `probe-middle-top-m3` · `probe-elem-g4w4-shortcuts`(숫자) 와
 * `probe-figure-dependent` · `probe-wordy-operators`(접두사가 다르다).
 * 쓸기가 「판정기 29개 전부 깨끗」이라 찍고 있었는데 그 29 는 «판정기 전부»가 아니라
 * **«이름에 숫자가 없는 판정기»** 였다. 그리고 그중 `probe-middle-tier-4dan` 은
 * **실제로 빨갰다**(미검토 2유형) — 아무도 안 돌리고 있었으니 아무도 몰랐다.
 *
 * 이 저장소가 여러 번 적은 그 자리다: 「목록을 손으로 쓰면 세는 쪽과 고치는 쪽이
 * 같이 눈이 먼다」(2026-08-18). 이번엔 목록이 아니라 **정규식**이었을 뿐이다.
 * 그리고 「0 은 «깨끗»과 «못 셈»을 안 가른다」 — 여기서는 «29» 가 그랬다.
 *
 * ## ⚠️ 이 규칙을 고칠 때
 *
 * 넓히기만 해라. 좁히면 **그 순간 빠지는 판정기가 아무 말 없이 사라진다.**
 * `elemProbeGauges.test.ts` ⑷ 가 「표에 없는 판정기」와 「파일이 없는 항목」을 양쪽으로
 * 잡으므로, 넓히면 표를 채우라고 빨개진다(그게 맞다). 좁히면 **초록인 채로 준다.**
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/** `.ts` 판정기 — 확장자 없는 이름으로 돌려준다. */
export function probeNetTs(dir) {
  return readdirSync(dir)
    .filter((f) => f.startsWith("probe-") && f.endsWith(".ts"))
    .filter(
      (f) =>
        /^probe-(elem|middle)-/.test(f) ||
        readFileSync(path.join(dir, f), "utf-8").includes("--selftest"),
    )
    .map((f) => f.slice(0, -3))
    .sort();
}

/**
 * `.py` 판정기 — **확장자를 붙인 채로** 돌려준다(쓸기가 파이썬으로 부를지 tsx 로
 * 부를지를 이름으로 가른다. 어느 쪽인지 목록을 따로 두면 그 목록이 또 샌다).
 *
 * 🔴 파이썬 쪽은 `--selftest` 성질을 안 본다 — 그 규약이 `.ts` 쪽 것이라 지금은
 * 접두사로만 고른다. 새 파이썬 판정기가 다른 이름으로 생기면 여기가 눈이 먼다.
 */
export function probeNetPy(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".py") && /^probe-(elem|middle)-/.test(f))
    .sort();
}

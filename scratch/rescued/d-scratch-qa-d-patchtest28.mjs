import { readFileSync, writeFileSync } from "node:fs";

const LF = "\n";
const CR = "\r\n";
const target = "src/__tests__/unit/middleM2Geo.test.ts";
const raw = readFileSync(target, "utf8");
const wasCrlf = raw.includes(CR);
let src = raw.split(CR).join(LF);

let n = 0;
function swap(from, to) {
  if (!src.includes(from)) {
    console.error("MELT — 앵커 없음:\n" + from.slice(0, 140));
    process.exit(1);
  }
  src = src.replace(from, () => to);
  n += 1;
}

/* ⑴ VERIFY 28~30 */
swap(
  `  // 27 — 대각선 위의 점 $P$ 를 세워 **각을 직접 잰다.** 합동 논증을 옮기지 않는다.`,
  `  // ── 등변사다리꼴, 여러 가지 사각형 28~30 ───────────────────────
  // 28 — $\\overline{AD}:\\overline{BC}=p:q$ 인 등변사다리꼴을 세우고 두 대각선을
  //      **직접 만나게** 해서 $O$ 를 구한다. 「$\\overline{OB}=\\overline{OC}$」가 바로
  //      이 유형이 쓰는 성질이라 그것을 가정하면 검산이 동어반복이 된다.
  "여러 가지 사각형|28": (f) => {
    const ad = f.p!;
    const bc = f.q!;
    const H = 2.3;
    const A: P2 = [(bc - ad) / 2, H];
    const B: P2 = [0, 0];
    const C: P2 = [bc, 0];
    const D: P2 = [(bc + ad) / 2, H];
    const O = lineInter(A, C, B, D);
    if (!near(dist(A, C), dist(B, D), 1e-8)) return false;
    const u = f.p! / dist(A, O);
    if (!near(dist(B, O) * u, f.q!, 1e-8)) return false;
    return f.mode === 0
      ? near(dist(A, C) * u, f.x!, 1e-8)
      : near(dist(B, D) * u, f.c!, 1e-8) && near(dist(O, C) * u, f.x!, 1e-8);
  },

  // 29 — 네 변을 실제로 재서 더한다(«등변»이라는 조건도 여기서 확인한다).
  "여러 가지 사각형|29": (f) => {
    const gap = (f.b! - f.a!) / 2;
    const H = Math.sqrt(f.c! * f.c! - gap * gap);
    const A: P2 = [gap, H];
    const B: P2 = [0, 0];
    const C: P2 = [f.b!, 0];
    const D: P2 = [gap + f.a!, H];
    return (
      near(dist(A, B), f.c!, 1e-8) &&
      near(dist(D, C), f.c!, 1e-8) &&
      near(dist(A, D), f.a!, 1e-8) &&
      near(dist(A, B) + dist(B, C) + dist(C, D) + dist(D, A), f.peri!, 1e-8) &&
      f.x! === (f.mode === 0 ? f.peri! : f.c!)
    );
  },

  // 30 — 점 $E$ 를 «$\\overline{DC}$ 와 나란한 방향»으로 직접 잡는다.
  //      $\\overline{BE}=\\overline{BC}-\\overline{AD}$ 를 옮겨 적지 않는다.
  "여러 가지 사각형|30": (f) => {
    const gap = (f.b! - f.a!) / 2;
    const H = Math.sqrt(f.c! * f.c! - gap * gap);
    const A: P2 = [gap, H];
    const B: P2 = [0, 0];
    const C: P2 = [f.b!, 0];
    const D: P2 = [gap + f.a!, H];
    const E: P2 = [A[0] + (C[0] - D[0]), A[1] + (C[1] - D[1])];
    if (!near(E[1], 0, 1e-8)) return false;
    if (!near(dist(B, E), f.be!, 1e-8)) return false;
    return f.mode === 0
      ? f.x! === f.be!
      : near(dist(A, B) + dist(B, E) + dist(E, A), f.x!, 1e-8);
  },

  // 27 — 대각선 위의 점 $P$ 를 세워 **각을 직접 잰다.** 합동 논증을 옮기지 않는다.`,
);

/* ⑵ ANSWER_KEY */
swap(
  `  "여러 가지 사각형|27": "x",`,
  `  "여러 가지 사각형|27": "x",
  // ── 등변사다리꼴, 여러 가지 사각형 28~30 ───────────────────────
  "여러 가지 사각형|28": "x",
  "여러 가지 사각형|29": "x",
  "여러 가지 사각형|30": "x",`,
);

/* ⑶ FIGURE_KEYS */
swap(
  `  "여러 가지 사각형|27",
]);`,
  `  "여러 가지 사각형|27",
  // ── 등변사다리꼴, 여러 가지 사각형 28~30 ───────────────────────
  "여러 가지 사각형|28",
  "여러 가지 사각형|29",
  "여러 가지 사각형|30",
]);`,
);

/* ⑷ 명부 */
swap(
  `describe("중2 기하 65유형 (RPM 2-2 색인 55 + 우리가 더한 18~27)", () => {`,
  `describe("중2 기하 68유형 (RPM 2-2 색인 55 + 우리가 더한 18~30)", () => {`,
);
swap(
  `    // «여러 가지 사각형»만 색인 최댓값 17 뒤에 18~27 이 더 있다 — 소단원
    // 「평행선과 삼각형의 넓이」(18~23)와 「직사각형, 마름모, 정사각형」(24~27)을
    // 각각 10유형으로 채우려고 우리가 지은 번호다.`,
  `    // «여러 가지 사각형»만 색인 최댓값 17 뒤에 18~30 이 더 있다 — 소단원 셋
    // 「평행선과 삼각형의 넓이」(18~23) · 「직사각형, 마름모, 정사각형」(24~27) ·
    // 「등변사다리꼴, 여러 가지 사각형」(28~30)을 각각 10유형으로 채우려고
    // 우리가 지은 번호다. 이 중단원은 이제 세 소단원이 모두 10유형이다.`,
);
swap(`    expect(GEO.length).toBe(65);`, `    expect(GEO.length).toBe(68);`);
swap(
  `    expect(byMinor.get("여러 가지 사각형")!.sort()).toEqual(seq(27));`,
  `    expect(byMinor.get("여러 가지 사각형")!.sort()).toEqual(seq(30));`,
);
swap(
  `        ["등변사다리꼴, 여러 가지 사각형", 7],`,
  `        ["등변사다리꼴, 여러 가지 사각형", 10],`,
);
swap(
  ` * 중2 기하 65유형 (RPM 2-2 삼각형의 성질·여러 가지 사각형·도형의 닮음·평행선 비)`,
  ` * 중2 기하 68유형 (RPM 2-2 삼각형의 성질·여러 가지 사각형·도형의 닮음·평행선 비)`,
);
swap(
  ` * 갈래 D 가 «여러 가지 사각형» 색인 뒤에 18~27 을 더했다(소단원 10유형 채우기).`,
  ` * 갈래 D 가 «여러 가지 사각형» 색인 뒤에 18~30 을 더했다(소단원 10유형 채우기).`,
);

writeFileSync(target, wasCrlf ? src.split(LF).join(CR) : src);
console.log("ok — 바꾼 자리", n);

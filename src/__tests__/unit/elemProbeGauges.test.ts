/**
 * **판정기의 눈금을 자동으로 부른다** — 판정기가 저장소에 있는데 아무도 안 부르면
 * 그것은 가드가 아니라 **문서**다 (2026-08-23, elem-figures 가 같은 문장으로 먼저 풀었다).
 *
 * ## 왜 이 시험이 필요한가 — **가드를 지키는 것이 눈금뿐인 자리가 있다**
 *
 * 그날 조사 판정기의 「스코프로 푼다」 수리를 되돌리는 변이를 걸었더니 **전 학년 쓸기가
 * 그대로 초록**이었다. 그 자리를 가르는 입력이 **트리에서 사라졌기** 때문이다
 * (g6 이 `${thing}가` 를 `josa()` 로 바꿔 두었다). 같은 변이를 `--selftest` 에 대자
 * **정확히 그 두 눈금이 빨개졌다.**
 *
 * 즉 **실데이터는 그 수리를 안 지킨다.** 지키는 것은 눈금이고, 그 눈금을 손으로만
 * 돌리면 다음 사람이 수리를 되돌려도 **아무도 모른다.**
 *
 * ## 무엇을 재나
 *
 * ⑴ 각 판정기의 `--selftest` 를 **실제로 돌린다**(exit ≠ 0 이면 빨강).
 *    판정기가 **죽어도** 0 이 아니다 — 「깨끗함」과 「판정 못 함」이 안 갈리면 안 된다.
 * ⑵ **눈금 건수를 «정확히»** 박는다 — **하한이 아니다.**
 *    하한이면 「74 이상」이 「107 이 74 로 줄어도 초록」과 같은 말이라 **여유가 곧
 *    사각지대**가 된다. 「늘렸으면 하한도 올린다」는 **사람이 기억할 일**이고, 그 사람이
 *    잊는 날 여유가 다시 생긴다. 그래서 **늘려도 빨개지게** 한다 — 한 줄 고치는 대가로
 *    눈금이 조용히 마르는 일이 **구조적으로** 사라진다 (2026-08-23 리드 판단).
 * ⑶ 요약이 말하는 수를 **그냥 믿지 않는다** — 실제로 찍힌 판정 줄(`✅`/`❌`)을 세어
 *    요약 수보다 적지 않은지 본다. 요약 수를 손으로 적어 두면 눈금을 늘려도 그 숫자가
 *    그대로라 거짓말이 된다(실제로 이 저장소에서 8 → 10 일 때 라벨이 「양성 2·음성 6」
 *    으로 남아 있었다).
 * ⑷ **판정기 목록을 손으로 두지 않는다** — `scripts/qa/probe-{elem,middle}-*.ts` 를 훑어
 *    아래 두 표에 **없는 파일이 있으면 빨강**이다. 손 목록은 새 판정기를 조용히 뺀다.
 *
 * ## 울타리에 안 걸린다
 *
 * `--selftest` 는 픽스처 문자열만 보고 `src/lib/elementary/` 를 **안 읽는다**(중등 판정기도
 * 눈금은 문자열만 본다). (그 경로는
 * 울타리를 열기 **전에** `process.exit` 한다). 그래서 남의 변이 하네스가 도는 중에도
 * 이 시험은 빨개지지 않는다 — **거짓 경보가 가드를 끄는 것**을 막으려면 이 성질이 필요하다.
 * 쓸기(`초3` 같은 인자)는 여기서 **부르지 않는다.**
 */
import { execFile } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { beforeAll, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

const QA_DIR = path.join(process.cwd(), "scripts", "qa");

/**
 * 판정기와 **그 눈금 수 — «정확히»**. 실측(2026-08-23)으로 박았다.
 *
 * ⚠️ **판정기는 각각 다른 세션 소유다.** 그래서 이 시험은 **남의 차분에서도**
 * 빨개진다. 그건 결함이 아니라 이 시험이 하는 일이다 — 실패 문구를
 * 「너의 변경이 잘못됐다」가 아니라 **「수를 갱신하라」**로 쓴 까닭이 그것이다.
 * **거짓 경보로 읽히면 그 시험이 꺼진다.**
 */
const GAUGED: [name: string, gauges: number][] = [
  ["probe-elem-combos", 7],
  ["probe-elem-josa-source", 10],
  ["probe-elem-rules", 42],
  ["probe-elem-section-conditions", 119],
  ["probe-elem-equations", 25],
  ["probe-elem-arithmetic", 44],
  ["probe-elem-routing", 4],
  ["probe-elem-tier-ladder", 14],
  // 2026-08-25 — 「심화가 4단 모양인가」(D-72, 원장님 지적). 표지0 8 · 표지있음 8.
  ["probe-elem-tier-4dan", 16],
  ["probe-elem-unit-josa", 12],
  // 2026-08-26 — 227곳 문형 10개의 **끝나는 지점**(원장님 확정 안 3 최고안).
  // 눈금은 문자열 픽스처로 `sameQuestion`·`isBinaryChoice` 를 직접 댄다
  // (양성 5 · 음성 6). 음성에 「셈이 같아도 막지 않는다」가 들어 있다 —
  // 한 번 그렇게 막았다가 초3 19곳을 헛되이 걸어서 되돌렸다(9cb5dedf).
  // 양자택일 눈금 넷(42551fff)을 넣을 때 이 수가 7로 남아 있었다.
  ["probe-elem-forms", 11],
  // 2026-08-30 — 축을 여섯으로 넓히며(D-113) 새 갈래 둘을 **선택**으로 두었다.
  // 선택이면 안 채워도 아무것도 빨개지지 않아 확대가 조용히 멈춘 채 끝난 것처럼
  // 보인다. 그래서 **남은 수를 센다.** 눈금은 지어낸 표로 세는 함수를 직접 댄다
  // (음성 2 · 양성 4 · 분모 2 · **문형 2** · 실물 3). 음성이 없으면 「시트마다
  // 하나쯤 찍는」 판정자도 만점이 된다(2026-08-20).
  // 🔴 문형 축이 따로 있는 까닭: 적재기는 «갈래»가 아니라 «문형»을 돈다 —
  //    갈래만 채우면 이 자가 「다 찼다」고 하는데 지면에는 한 건도 안 나간다.
  ["probe-elem-extending-tiers", 13],
  // 2026-08-30 — D-113 의 **되짚기 축** 반증문 ④·⑥ 을 기계로 잰다.
  // 눈금은 문자열 픽스처로 `forwardReachable`·`pageNumbers` 를 직접 댄다
  // (양성 5 · 음성 3 · 지면 읽기 2). 🔴 **음성에 「`$1$` 을 곱해 만든 뺄셈」이 있다** —
  // 「$1$보다 작은 소수」의 `$1$` 은 낱말이지 자료가 아닌데 그걸 곱셈에 쓰면
  // `a×1±b` 가 `a±b` 로 둔갑해 **아무 뺄셈이나 «순방향»**이 된다. 그 판이
  // 거짓 경보 46건을 냈다. 양성에 「$c−a×b$」·「두 곱의 합」이 있는 까닭도 같다 —
  // 그 둘을 놓쳤더니 멀쩡한 응용이 「이미 되짚기다」로 찍혀, 반증 ④ 가
  // **멀쩡한 소단원 셋을 비우라**고 할 뻔했다. 놓침이 곧 잘못된 «비움»이다.
  // 2026-08-31 — ④ 의 **자격**을 재는 눈금 5 + 거짓 이름이던 눈금의 짝 1 을 더했다.
  //   ④ 는 「연산·기본·응용이 안 닿으면 이 소단원을 비워라」인데, **연산 갈래가
  //   정의상 순방향**이므로 그것이 «안 닿는다»고 나오면 눈먼 쪽은 자다. 안 가르니
  //   ④ 가 걸던 140소단원 중 **113개(81%)가 근거 없는 것**이었다.
  ["probe-elem-tier-backsolve", 20],
  // 2026-08-31 — D-115 의 **약한 자리**를 재는 축. 적대 검토가 초3 2-1-4 «심화중» 의
  //   해설이 후보 넷을 다 곱해 견주는 것을 짚었다 — 그건 심화상의 길이다.
  //   재 보니 갈린다: 심화하 1.7% · 심화중 17.4% · **심화상 81.0%**.
  //   눈금은 **실물 해설 문자열**로 두 쪽을 직접 댄다(양성 1 · 음성 3 · 분리 1 · 회귀 1).
  ["probe-elem-tier-enumeration", 6],
  // ── 중등 (2026-08-24, 미분류 133건을 읽다 나온 결함에서 태어났다) ──
  ["probe-middle-uniqueness", 3],
  ["probe-middle-page-smells", 9],
  ["probe-middle-duplicate-statements", 9],
  // 2026-08-25 — 대수 결합형 훑기(D-109). 눈금이 **말뭉치 없이** 돈다: 픽스처
  // 문자열로 `judge()` 를 직접 댄다(양성 1 · 음성 4 · 회귀 1 · 핵심어 5).
  ["probe-middle-algebra-combo", 12],
  // 중등은 축이 다르다 — 「지시 한 줄 + 식」인 심화를 사람 앞에 세운다(양성 3 · 음성 5).
  ["probe-middle-tier-4dan", 8],
  // 2026-08-27 — 중등 「130곳이 시험지를 낼 수 있나」. 초등에 있던 자리가
  // 중등에는 비어 있었다. 눈금은 문자열 픽스처로 두 판정을 직접 댄다
  // (양성 2 · 음성 5). 음성에 「물음 줄이 서술이고 보기는 세는 대상」이
  // 들어 있다 — 그걸 막았다가 거짓 경보를 냈다.
  ["probe-middle-forms", 7],
  // 2026-08-27 — TS 템플릿 리터럴이 `\angle` 의 역슬래시를 **먹어서** 지면에
  // `angle C=90^circ` 가 나가던 부류. tsc·vitest·KaTeX·값 검산이 **전부 초록**이라
  // 결함이 스스로 신고하지 않는다. 세 갈래가 따로 밟았다(A 22유형 · B 448자리 ·
  // main 16문항). 눈금은 문자열 픽스처로 판정 함수를 직접 댄다 —
  // 음성에 「명령의 인자」(`\begin{cases}` 의 cases · `\mathrm{cm}` 의 cm)가 있다.
  // 그걸 안 걸렀다가 연립방정식 17유형이 거짓으로 걸렸다.
  // 2026-08-27 저녁 — **적재본 축**을 더했다(원장님 확정). 같은 뿌리의 더 조용한
  //   얼굴이 있다: `	imes` 는 글자가 사라지는 게 아니라 **탭**이 된다.
  //   `bareCommands` 는 남은 조각(`imes`)이 명령 이름이 아니라 **구조적으로 못 본다.**
  //   그래서 제어문자 축을 따로 세웠다(양성 4 · 음성 2 추가 = 15건).
  ["probe-middle-raw-latex", 15],
  // 2026-08-28 — 원장님 지적 「지금 각이 70도인데 전혀 70도처럼 안생김. 지 멋대로
  // 그려놓고 70도라고 우기고 있음」. 그림이 **제 라벨과 다른 각**을 그리던 부류다.
  // 값 검산은 이걸 구조적으로 못 본다(값은 맞다) — 축이 아예 없었다.
  // 눈금은 스펙 픽스처로 판정 함수를 직접 댄다(양성 5 · 음성 13). 축이 둘이다 —
  // 라벨이 **기호**(`a`)면 첫 축이 구조적으로 못 본다(값이 발문에 있다).
  // 음성에 「미지수 라벨」·「길이 라벨」·「좌표 없는 점」이 있다 — 그것들까지
  // 잡으면 거짓 경보가 쏟아지고, **거짓 경보는 가드를 끈다.**
  ["probe-middle-figure-angles", 18],
  // 2026-08-28 — 원장님 지적 「라벨 위치가 희한하네」. 꼭짓점 이름표가 도형
  // **안쪽**으로 들어가던 부류다(가장 단순한 삼각형에서도 셋 중 둘). 겹침
  // 판정기는 이걸 **구조적으로 못 본다** — 도형 안쪽은 비어 있어 아무것도 안 밟는다.
  // 바깥의 정의는 RPM 정본 13,591 라벨에서 뽑았다(외각 이등분선).
  // 눈금은 픽스처 SVG 로 판정 함수를 직접 댄다(양성 5 · 음성 7). 음성에
  // 「각 크기」·「치수」가 있다 — 그것들은 안쪽이 제자리라 잡으면 거짓 경보다.
  ["probe-middle-label-outward", 12],
];

/**
 * 눈금이 **없는 것이 옳은** 것들 — 판정기가 아니라 **쓸기·덤프**다.
 * 여기 적어 두지 않으면 ⑷ 가 빨개진다. 판정기로 바뀌면 위 표로 옮길 것.
 */
const UNGAUGED: [name: string, why: string][] = [
  ["probe-elem-charts", "그래프 스펙 전수 덤프 — 판정하지 않는다"],
  ["probe-elem-figure-demand", "그림 요구 전수 쓸기 — 판정하지 않는다"],
  ["probe-elem-throw", "전수 throw 쓸기 — 던지는 씨앗을 찾는다"],
  [
    "probe-middle-combo",
    "873유형 결합형 분류 — 저장소 밖(C:/tmp) 말뭉치를 읽는다. 없으면 울타리(2)로 끝난다",
  ],
];

type Result = { status: number; text: string };

/**
 * ⚠️ **일곱을 동시에 돌린다.** 하나씩 부르면 `npx tsx` 기동만 일곱 번이라 160초가 걸렸고,
 * **느린 시험은 사람이 안 돌린다** — 그러면 자동으로 부르게 만든 뜻이 없어진다.
 * `beforeAll` 에서 한 번에 띄우고 각 시험은 그 결과만 본다(실패한 판정기 이름은 그대로 남는다).
 *
 * ⚠️ `npx` 를 거치지 않고 **node 로 tsx 를 직접** 부른다. 윈도우에서 `execFile` 은
 * `.cmd`(=`npx.cmd`)를 못 띄워 **EINVAL** 로 죽는다(Node 20+ 보안 변경). `shell: true` 로
 * 우회할 수는 있지만 「인자가 이스케이프되지 않는다」는 경고가 붙으므로 그 층을 없앤다.
 */
const TSX_CLI = path.join(
  process.cwd(),
  "node_modules",
  "tsx",
  "dist",
  "cli.mjs",
);

async function runSelftest(name: string): Promise<Result> {
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [TSX_CLI, `scripts/qa/${name}.ts`, "--selftest"],
      { encoding: "utf-8", maxBuffer: 8 * 1024 * 1024 },
    );
    return { status: 0, text: `${stdout}${stderr}` };
  } catch (e) {
    const err = e as { code?: number; stdout?: string; stderr?: string };
    // 판정기가 **죽어도** 0 이 아니어야 한다 — 여기서 코드를 잃으면 안 된다.
    return {
      status: err.code ?? 1,
      text: `${err.stdout ?? ""}${err.stderr ?? ""}`,
    };
  }
}

const results = new Map<string, Result>();

describe("[초등·중등 판정기] 눈금이 자동으로 돈다", () => {
  beforeAll(async () => {
    const done = await Promise.all(
      GAUGED.map(async ([name]) => [name, await runSelftest(name)] as const),
    );
    for (const [name, r] of done) results.set(name, r);
  }, 180_000);

  it("판정기 목록이 새지 않는다 — 디렉터리에 있는 것이 두 표에 다 있다", () => {
    const onDisk = readdirSync(QA_DIR)
      .filter((f) => /^probe-(elem|middle)-.*\.ts$/.test(f))
      .map((f) => f.replace(/\.ts$/, ""))
      .sort();
    const known = [
      ...GAUGED.map((g) => g[0]),
      ...UNGAUGED.map((u) => u[0]),
    ].sort();
    // 새 판정기가 생겼는데 눈금이 안 도는 채로 남는 것을 막는다.
    expect(
      onDisk.filter((f) => !known.includes(f)),
      "표에 없는 판정기",
    ).toEqual([]);
    // 반대로 표에만 있고 파일이 사라진 것도 잡는다 — 「없는 축은 못 잰다」.
    expect(
      known.filter((f) => !onDisk.includes(f)),
      "파일이 없는 항목",
    ).toEqual([]);
    expect(onDisk.length, "판정기를 하나도 못 찾았다").toBeGreaterThan(5);
  });

  for (const [name, gauges] of GAUGED) {
    it(`${name} — 눈금이 통과하고 건수가 정확히 ${gauges} 다`, () => {
      const out = results.get(name);
      expect(out, `${name} 를 못 돌렸다 — 결과가 없다`).toBeDefined();
      if (!out) return;
      // 판정기가 **죽어도** 0 이 아니다.
      expect(out.status, out.text.slice(0, 2000)).toBe(0);

      const m = /눈금 (\d+)건/.exec(out.text);
      expect(
        m,
        `「눈금 N건」을 못 읽었다:\n${out.text.slice(0, 800)}`,
      ).not.toBeNull();
      const reported = Number(m![1]);
      expect(
        reported,
        `${name} 눈금이 ${gauges} → ${reported} 다.
` +
          `   늘린 것이 맞으면 elemProbeGauges 의 이 수를 ${reported} 로 고쳐라.
` +
          `   줄인 것이면 왜 줄였는지부터 보라 — 눈금은 재현율의 분모다.`,
      ).toBe(gauges);

      // 요약이 말하는 수를 **그냥 믿지 않는다** — 실제 판정 줄을 센다.
      const verdicts = out.text
        .split("\n")
        .filter((l) => /^\s*[✅❌]/.test(l)).length;
      expect(
        verdicts,
        `요약은 ${reported}건이라는데 판정 줄은 ${verdicts}줄뿐이다 — 요약 수가 손으로 적혔을 수 있다`,
      ).toBeGreaterThanOrEqual(reported);
    }, 90_000);
  }

  it("눈금 없는 것은 **쓸기·덤프**라서 그렇다 — 까닭이 적혀 있다", () => {
    for (const [name, why] of UNGAUGED)
      expect(why.length, `${name} 의 까닭이 비었다`).toBeGreaterThan(5);
  });
});

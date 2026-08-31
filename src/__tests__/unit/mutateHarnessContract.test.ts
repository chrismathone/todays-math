/**
 * 변이 하네스와 **낱개 판**이 같은 것을 재는가 — 계약 시험.
 *
 * `scripts/qa/mutate-one.py` 는 `mutate-elem-tiers.py` 를 **모듈째 불러** 변이 목록·
 * 타깃·프로브 문자열·**시험 실행기**를 그대로 쓴다. 그래야 두 도구가 같은 씨앗으로
 * 재고, 같은 리포터로 읽고, 판정이 서로 어긋나지 않는다.
 *
 * 이 파일이 잠그는 것은 하나다 — **한 벌인가.** 같은 규칙이 두 곳에 있으면 한쪽만
 * 고쳐도 아무도 모르고, 그 갈라짐은 «거짓 판정»으로 나온다. 2026-08-23 하루에만
 * 세 번 났다: 씨앗 두 벌 · 리포터 이름(없어진 `basic`) · 「`test` 가 목록일 때
 * 펴는 규칙」. 셋 다 아래에 못 박혀 있다.
 *
 * ⚠️ 왜 이 시험이 있는가 — 낱개 판이 처음엔 프로브 문자열을 **복사**해 두었다.
 *    변이 목록은 한 벌이었지만 **씨앗은 두 벌**이었고 곧 갈라졌다. 하네스가
 *    「밟기 어려운 가지」를 밟으려고 넣은 씨앗(`4`·`79`·`23`·`68`)이 낱개 판에는
 *    없어서, **하필 그 변이에서만** 「산출물이 그대로다」라는 **거짓 판정 거부**가 났다.
 *    그러면 다음 사람은 「내 가드가 장식인가」로 읽고 **멀쩡한 가드를 고치러 간다** —
 *    도구가 없는 것보다 나쁘다(2026-08-23 g6 적발, 초6 2-2-4 「낱말 거짓말」 변이는
 *    그 자리가 800 씨앗 중 4개뿐이라 `68` 없이는 구조적으로 안 밟힌다).
 *
 * 그래서 잠그는 것은 **「낱개 판이 자기 씨앗을 갖지 않는다」** 다 — 한쪽만 늘어나는
 * 일 자체가 불가능해야 한다. (「두 목록이 같다」로 잠그면 **두 벌인 채로 같기만 하면**
 * 통과해서 다시 갈라질 수 있다.)
 *
 * ⚠️ **이 시험이 못 보는 것**: 텍스트 가드라 씨앗이 «배열이 아닌 꼴»로 들어오면
 *    (예: 변수로 만들어 프로브에 끼워 넣기) `for (const seed of [...])` 정규식에
 *    안 걸려 **조용히 통과한다.** 지금은 그럴 이유가 없어 그대로 두지만, 프로브를
 *    손보는 사람이 그 길로 가면 이 시험은 눈이 먼다 — 그때는 여기도 같이 고칠 것.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { G3_TIERS } from "@/lib/elementary/g3";
import { G4_TIERS } from "@/lib/elementary/g4";
import { G5_TIERS } from "@/lib/elementary/g5";
import { G6_TIERS } from "@/lib/elementary/g6";

const QA = path.join(process.cwd(), "scripts", "qa");
const harness = readFileSync(path.join(QA, "mutate-elem-tiers.py"), "utf8");
const oneShot = readFileSync(path.join(QA, "mutate-one.py"), "utf8");

/** `for (const seed of [ … ])` 안의 씨앗 목록. 없으면 null. */
function seedsOf(src: string): string[] | null {
  const m = /for \(const seed of \[([^\]]*)\]\)/.exec(src);
  return m ? m[1]!.split(",").map((t) => t.trim()) : null;
}

describe("[변이 하네스] 전량 판과 낱개 판이 같은 것을 잰다", () => {
  it("씨앗은 하네스에만 있다 — 낱개 판은 자기 씨앗을 갖지 않는다", () => {
    const harnessSeeds = seedsOf(harness);
    expect(harnessSeeds, "하네스에 씨앗 배열이 없다").not.toBeNull();
    expect(
      harnessSeeds!.length,
      "하네스 씨앗이 너무 적다 — 밟기 어려운 가지를 못 본다",
    ).toBeGreaterThanOrEqual(6);

    // 낱개 판이 **자기 씨앗 배열을 가지면** 두 벌이 되어 곧 갈라진다.
    expect(
      seedsOf(oneShot),
      `낱개 판이 자기 씨앗을 갖고 있다 — 하네스에서 읽어야 한다\n` +
        `  하네스: ${harnessSeeds!.join(", ")}\n` +
        `  낱개판: ${seedsOf(oneShot)?.join(", ")}`,
    ).toBeNull();
  });

  it("낱개 판은 하네스를 **모듈째** 불러 쓴다 (씨앗·프로브·타깃·실행기 한 벌)", () => {
    for (const needed of [
      "mutate-elem-tiers.py",
      "spec.loader.exec_module",
      "mod.PROBE_TS",
      "mod.TARGETS",
      "mod.failed_tests(",
    ]) {
      expect(oneShot, `낱개 판이 «${needed}» 를 안 쓴다`).toContain(needed);
    }
  });

  it("두 도구 모두 임시 프로브 파일에 PID 를 붙인다 (동시 실행 경합)", () => {
    // 고정 이름이면 두 세션이 동시에 돌 때 한쪽이 지운 파일을 다른 쪽이 못 연다 —
    // 그러면 「산출물을 못 얻었다」로 떨어지고, 원인을 변이 쪽에서 찾게 된다.
    for (const [name, src] of [
      ["전량 판", harness],
      ["낱개 판", oneShot],
    ] as const) {
      expect(src, `${name} 의 프로브 경로에 PID 가 없다`).toMatch(
        /probe\.\{?os\.getpid\(\)\}?/,
      );
    }
  });

  /* ── 판정자에게 음성 대조군이 있는가 ─────────────────────────────────────────
   *
   * ⚠️ 두 도구의 판정은 「시험의 종료 코드 ≠ 0 이면 RED」다. 그러니 **기준이 이미
   *    빨갛거나 러너가 아예 못 뜨면 모든 변이가 빨강**으로 찍힌다 — 답이 진실에
   *    따라 안 변하는 판정자는 판정자가 아니라 도장이다.
   *
   *    실제로 그랬다: 낱개 판이 `--reporter=basic` 을 썼는데 **vitest 4 에서 없어진
   *    이름**이라(2026-08-19 설치) 기동 단계에서 죽고 종료 코드가 1 이었다. 가드가
   *    아닌 변이도, 치환이 헛돈 변이도 전부 「RED (가드가 문다)」였다. 징후는
   *    「빨간데 `↳` 실패 목록이 늘 비어 있다」였고 판정 줄만 읽어 놓쳤다
   *    (2026-08-23 발견 — 이 저장소가 여러 번 적은 「판정자를 눈금 맞출 때 음성
   *    대조군을 대라」가 **우리 도구 자신**에게 적용된 자리다).
   */

  it("시험을 부르는 자리는 **전량 판 한 곳**뿐이다 — 리포터도 목록 펴기도 거기 산다", () => {
    // ⑴ 전량 판은 살아 있는 리포터를 쓴다. `basic` 은 vitest 4 에서 제거됐고,
    //    실패 이름을 구조적으로 읽으려면 어차피 json 이어야 한다.
    const reporters = [...harness.matchAll(/--reporter=([a-z]+)/g)].map(
      (m) => m[1]!,
    );
    expect(reporters.length, "전량 판이 리포터를 안 지정한다").toBeGreaterThan(
      0,
    );
    for (const r of reporters)
      expect(r, `전량 판이 «${r}» 리포터를 쓴다 — json 이어야 한다`).toBe(
        "json",
      );

    // ⑵ 낱개 판은 **자기 명령줄을 안 만든다.** 만드는 순간 리포터 이름과
    //    「`test` 가 목록일 때 펴는 규칙」이 두 벌이 된다 — 둘 다 실제로 났다
    //    (`basic` 으로 전부 빨강 · `str + list` 로 초3 에서 즉사, 2026-08-23).
    expect(
      /--reporter=/.test(oneShot),
      "낱개 판이 자기 리포터를 지정한다 — 전량 판에 위임해야 한다",
    ).toBe(false);
    expect(
      /npx vitest/.test(oneShot),
      "낱개 판이 vitest 명령줄을 직접 만든다 — 전량 판에 위임해야 한다",
    ).toBe(false);

    // ⑶ 그 한 곳이 **문자열과 목록을 둘 다** 받는다. 초3 은 파일럿 판과 확대 판이
    //    따로라 `test` 가 목록이다 — 문자열만 가정하면 그 학년에서만 죽는다.
    const body = harness.slice(
      harness.indexOf("def failed_tests("),
      harness.indexOf("def main("),
    );
    expect(
      body.length,
      "전량 판에서 failed_tests 를 못 찾았다",
    ).toBeGreaterThan(0);
    expect(
      body,
      "failed_tests 가 «문자열 하나»만 가정한다 — 목록인 학년에서 죽는다",
    ).toContain("isinstance(test_paths, str)");
  });

  it("변이를 **넣기 전에** 시험을 한 번 돌린다 (음성 대조가 먼저다)", () => {
    // 낱말이 있나가 아니라 **순서**를 잰다 — 「기준 시험 실행」이 「변이 쓰기」보다
    // 앞에 있어야 한다. 낱말만 세면 파일 어딘가에 그 낱말이 있기만 해도 통과한다
    // (CLAUDE.md 2026-08-18 「LOOP 가 있나」로 재시도를 지킨 그 자리).
    for (const [name, src, runCall, writeMut] of [
      ["전량 판", harness, "failed_tests(target[", "src.replace(before, after"],
      ["낱개 판", oneShot, "run_tests(mod, t[", "text.replace(old, new"],
    ] as const) {
      const firstRun = src.indexOf(runCall);
      const firstWrite = src.indexOf(writeMut);
      expect(firstRun, `${name}: «${runCall}» 를 못 찾았다`).toBeGreaterThan(
        -1,
      );
      expect(firstWrite, `${name}: «${writeMut}» 를 못 찾았다`).toBeGreaterThan(
        -1,
      );
      expect(
        firstRun,
        `${name}: 변이를 넣고 나서야 시험을 돈다 — 기준이 빨간지 알 수 없다`,
      ).toBeLessThan(firstWrite);
    }
  });

  it("임시 프로브 파일이 .gitignore 에 걸린다 — 두 도구 모두", () => {
    const ignore = readFileSync(path.join(process.cwd(), ".gitignore"), "utf8");
    for (const pat of [
      "scripts/qa/.mutate-elem-tiers.probe.*.ts",
      "scripts/qa/.mutate-one.probe.*.ts",
    ]) {
      expect(ignore, `.gitignore 에 «${pat}» 가 없다`).toContain(pat);
    }
  });

  /* ── `sections` 가 실재하는 소단원만 가리키나 ──────────────────────────────
   *
   * ⚠️ **왜 이 좁은 형태인가.** 리드가 처음 제안한 것은 「각 학년의 `sections` 가
   *    그 학년 `G*_TIERS` 에 등록된 소단원을 **전부** 덮는다」였다. 재 보니
   *    **거짓 경보가 89건**이다:
   *        g3 등록 51 · sections 16 (빠짐 35)
   *        g4 등록 59 · sections 16 (빠짐 43)
   *        g5 등록 56 · sections 48 (빠짐  8)
   *        g6 등록 52 · sections 49 (빠짐  3)
   *    `sections` 는 **변이가 닿는 자리를 훑는 범위**지 등록 목록이 아니다. 변이가
   *    없는 소단원까지 훑으면 느려지기만 한다. 그 규칙을 넣었으면 89건이 늘 빨갛고,
   *    **늘 우는 가드는 꺼진다**(CLAUDE.md 2026-08-20 「거짓 경보는 가드를 끈다」).
   *
   *    그래서 **반대 방향**만 잠근다 — 「`sections` 에 있는 것은 전부 실재한다」.
   *    실측 결과 네 학년 모두 «남음 0» 이라 오늘 초록이고, 오타나 이름이 바뀐
   *    소단원이 생기면 내일 빨개진다. 이건 **거짓 경보가 날 수 없는 형태**다.
   *
   * ⚠️ **이것이 g4 의 그 결함을 잡지는 못한다.** 「2-4-3 이 `sections` 에 **없다**」는
   *    여기 안 걸린다(없는 것은 «남는» 것이 아니다). 그쪽은 하네스가 실행 중에
   *    ⑵ 「산출물이 그대로다」로 **이미 시끄럽게** 잡는다 — 다만 그 메시지가
   *    「변이가 뜻을 안 바꿨다」와 뭉개져 있어서, 2026-08-24 에 **두 원인을 갈라
   *    찍도록** 고쳤다(`mutate-elem-tiers.py` 의 `??` 갈래). 잡는 자리가 여기가
   *    아니라 거기다.
   */
  it("`sections` 는 실재하는 소단원만 가리킨다 (오타·이름 바뀜)", () => {
    const registered: Record<string, Set<string>> = {
      g3: new Set(Object.keys(G3_TIERS).map((k) => k.split("|")[1]!)),
      g4: new Set(Object.keys(G4_TIERS).map((k) => k.split("|")[1]!)),
      g5: new Set(Object.keys(G5_TIERS).map((k) => k.split("|")[1]!)),
      g6: new Set(Object.keys(G6_TIERS).map((k) => k.split("|")[1]!)),
    };

    const bad: string[] = [];
    for (const [which, want] of Object.entries(registered)) {
      // ⚠️ 정규식을 **템플릿 리터럴로 짓지 않는다.** 템플릿은 `\s`·`\[` 를 escape 로
      //    먹어 버려 `s`·`[` 가 된 정규식이 조용히 다른 것을 찾는다(2026-08-24 실제로
      //    걸렸다). 자리 찾기는 문자열 검색으로 하고, 정규식은 **리터럴**만 쓴다.
      const start = harness.indexOf(`"${which}": {`);
      expect(start, `${which}: TARGETS 에 그 대상이 없다`).toBeGreaterThan(-1);
      const key = harness.indexOf(`"sections": [`, start);
      expect(
        key,
        `${which}: TARGETS 에서 sections 를 못 찾았다`,
      ).toBeGreaterThan(-1);
      const body = harness.slice(key, harness.indexOf("]", key));
      const codes = [...body.matchAll(/"([^"]+)"/g)]
        .map((m) => m[1]!)
        .filter((c) => c !== "sections");
      expect(codes.length, `${which}: sections 가 비었다`).toBeGreaterThan(0);
      for (const c of codes)
        if (!want.has(c))
          bad.push(`${which}: "${c}" 는 등록된 소단원이 아니다`);
    }
    expect(bad).toEqual([]);
  });

  // ── 🔴 「시험 목록이 새는 것」을 재는 축 자체를 잠근다 ──────────────────────
  //
  // 2026-08-31 적대 검토: `unlisted_tests` 가 `elemTiers{G6}*.test.ts` 라는 **이름 모양
  // 글로브**로 훑어, 이름이 그 꼴이 아닌 가드(`elemFigureReference` 등)를 통째로 못 봤다.
  // 변이 둘로 **거짓 초록이 실증**됐고, 리드 재현으로 무는 파일이 **그 하나**임을 확인했다.
  //
  // ⚠️ 그때 「글로브를 좁혀도 아무것도 안 빨개진다」는 것이 더 나쁜 자리였다 —
  //    **재는 축을 지키는 시험이 없었다.** 그래서 여기 둘을 못 박는다.
  it("🔴 목록 누수를 재는 축이 «이름 모양»이 아니라 «엔진을 부르는가»다", () => {
    const start = harness.indexOf("def engine_test_files");
    expect(start, "engine_test_files 가 없다").toBeGreaterThan(-1);
    const body = harness.slice(start, harness.indexOf("\ndef ", start + 5));

    // ㉠ 이름 모양 글로브로 되돌아가면 빨개진다.
    expect(body, "이름 모양 글로브로 되돌아갔다").not.toContain("elemTiers%s");
    // ㉡ 엔진 함수 이름으로 훑어야 한다.
    expect(body).toContain("generateElementaryProblem");
    // ㉢ `.test.ts` 전부를 훑어야 한다 — 한 디렉터리만 보면 또 샌다.
    expect(body).toContain("os.walk");
  });

  it("🔴 GREEN 은 **목록 밖까지 다시 돌린 뒤에만** 찍힌다", () => {
    // 좁은 목록으로 초록이 나면 그대로 「시험이 못 잡는다」로 찍던 자리다.
    // 이제는 `engine_test_files()` 를 합쳐 한 번 더 돌리고, 거기서 빨개지면 RED 다.
    //
    // ⚠️ **범위를 `judge_tests` 본문 안으로 좁힌다.** 처음엔 「GREEN 을 찍기 전 어딘가에
    //    `failed_tests(` 가 있나」로 썼는데, 그 범위에 **다른 호출**(음성 대조)이 들어와
    //    넓은 재실행을 통째로 지워도 **초록**이었다 — 2026-08-18 「LOOP 가 있나」와 같은
    //    자리다. 낱말이 파일 안 다른 곳에도 있으면 그 검사는 구조적으로 못 갈라낸다.
    const start = harness.indexOf("def judge_tests");
    expect(start, "judge_tests 가 없다").toBeGreaterThan(-1);
    const body = harness.slice(start, harness.indexOf("\ndef ", start + 5));

    expect(body, "넓은 목록을 안 만든다").toContain("engine_test_files()");
    // 만들기만 하고 **돌리지 않으면** 아무것도 안 지킨다.
    expect(body, "넓은 목록을 만들기만 하고 돌리지 않는다").toContain(
      "failed_tests(wide)",
    );
    // 그리고 그 결과가 실제로 판정을 가른다.
    expect(body).toContain('return ("RED_WIDE"');
    expect(body).toContain('return ("GREEN"');

    // 두 판이 **같은** 판정을 쓴다 — 낱개 판이 자기 판정을 다시 적으면 갈린다.
    expect(oneShot, "낱개 판이 judge_tests 를 안 부른다").toContain(
      "mod.judge_tests(",
    );
    expect(
      oneShot.includes("RED_WIDE"),
      "낱개 판이 «목록 밖» 판정을 안 다룬다",
    ).toBe(true);
  });
});

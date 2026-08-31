/**
 * 🔴 **울타리가 거짓이 되는 날, pre-push 는 아무 말 없이 통과한다.**
 *
 * `scripts/` 의 68개 파일이 맨몸 `main()` 대신
 * `if (isDirectScript(import.meta.url)) main();` 을 쓴다. 그 울타리가 있어야
 * 남이 그 파일에서 순수 함수를 `import` 할 때 공유 DB 질의가 안 나간다
 * (2026-08-31 에 `checkUnloadedTypes.ts` 가 실제로 그랬다 —
 * 「13,302 초록, 종료 코드 1」).
 *
 * 그런데 그 울타리가 **거짓**이 되면 스크립트는 **출력 한 줄 없이 종료 코드 0** 으로
 * 끝난다. `.husky/pre-push` ⑴⑵⑶ 은 전부 `if ! npx tsx …` — **종료 코드만** 본다.
 * 검사가 죽어도 훅은 초록이다. 이 저장소가 여러 번 적은 그 자리다 —
 * **0 은 «깨끗»과 «못 셈»을 안 가른다**(2026-08-21). 이번엔 관문이 아니라 훅이다.
 *
 * 그리고 `isDirectScript` 를 무는 시험이 저장소에 **하나도 없었다**(2026-08-31
 * 적대 검토). 68개가 이 함수 하나에 매달려 있는데도.
 *
 * ## 이 시험이 지키는 것 둘
 *
 * ㉠ **함수** — pre-push·npm·사람이 실제로 부르는 모양에서 참이고, 남이 `import`
 *    하는 모양에서는 거짓이어야 한다(음성 대조가 있어야 울타리다).
 * ㉡ **배선** — pre-push 가 부르는 그 명령이 정말 `main()` 에 닿는가.
 *    ㉠ 만 두면 「함수는 맞는데 그 파일이 그것을 안 부른다」를 구조적으로 못 본다.
 *    닿는 것은 **관측 가능**하다: DB 접속 정보를 지우고 부르면 Prisma 가 던져
 *    **종료 코드가 0이 아니다.** 울타리가 거짓이면 **조용히 0** 이다.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

import { isDirectScript } from "../../../scripts/import/isDirectScript";

const REPO = path.resolve(__dirname, "../../..");

/** `process.argv[1]` 을 갈아 끼우고 판정한다 — 실제 부름을 흉내 내는 유일한 축이다. */
function askAs(argv1: string, metaUrl: string): boolean {
  const saved = process.argv[1];
  try {
    process.argv[1] = argv1;
    return isDirectScript(metaUrl);
  } finally {
    process.argv[1] = saved;
  }
}

/** pre-push 가 부르는 그 스크립트. 이 시험의 배선 축이 겨누는 과녁이다. */
const PRE_PUSH_SCRIPT = "scripts/qa/checkUnloadedTypes.ts";

describe("isDirectScript — 68개 스크립트가 매달린 울타리", () => {
  const target = path.join(REPO, PRE_PUSH_SCRIPT);
  const metaUrl = pathToFileURL(target).href;

  it("㉠ pre-push·npm·사람이 부르는 네 모양에서 전부 «직접 실행»이다", () => {
    // pre-push 는 저장소 뿌리에서 상대 경로로 부른다.
    const relative = PRE_PUSH_SCRIPT;
    // 사람은 절대 경로로도 부른다.
    const absolute = target;
    // 셸·도구에 따라 `./` 가 붙는다.
    const dotted = "./" + PRE_PUSH_SCRIPT;

    for (const argv1 of [relative, absolute, dotted]) {
      expect(
        askAs(argv1, metaUrl),
        `이 모양에서 «직접 실행»이 아니라고 한다 → 스크립트가 조용히 종료 코드 0: ${argv1}`,
      ).toBe(true);
    }
  });

  // ⚠️ **여기에 「드라이브 글자 대소문자」 축을 두지 마라 — 거짓 경보다.**
  //    실측(2026-08-31): `tsx` 는 `process.argv[1]` 에 들어온 표기를 그대로
  //    `import.meta.url` 에도 싣는다. `c:/…` 로 불러도 둘 다 `file:///c:/…` 이고,
  //    소문자 cwd 에서 상대 경로로 불러도 `path.resolve` 가 둘을 같이 `C:` 로
  //    올린다. **한 회차 안에서 둘이 갈리는 모양이 없다.**
  //    `metaUrl` 만 고정하고 `argv[1]` 의 대소문자를 바꾸면 빨개지지만, 그 모양은
  //    실행 중에 생기지 않는다. 늘 우는 가드는 꺼진다(2026-08-20).

  it("㉠-3 남이 import 하는 모양에서는 «직접 실행»이 아니다 (음성 대조)", () => {
    // 이 축이 늘 true 만 내면 울타리가 아니라 장식이다.
    expect(askAs(path.join(REPO, "scripts/qa/somethingElse.ts"), metaUrl)).toBe(
      false,
    );
    // vitest 워커가 부르는 모양 — 여기서 true 가 나오면 import 만으로 main 이 돈다.
    expect(
      askAs(path.join(REPO, "node_modules/vitest/vitest.mjs"), metaUrl),
    ).toBe(false);
  });

  it("㉠-4 `process.argv[1]` 이 없으면 «직접 실행»이 아니다", () => {
    const saved = process.argv[1];
    try {
      // @ts-expect-error — 런타임에 비는 경우를 흉내 낸다
      process.argv[1] = undefined;
      expect(isDirectScript(metaUrl)).toBe(false);
    } finally {
      process.argv[1] = saved;
    }
  });

  it("㉡ pre-push 가 부르는 그 명령이 정말 main() 에 닿는다 (조용한 0 이 아니다)", () => {
    // 🔴 이 축이 ㉠ 과 다른 것을 본다. ㉠ 은 «함수가 맞나», 이것은 «그 파일이 그
    //    함수를 실제로 불러 main 까지 가나» 다. 울타리를 잘못 쓰면 ㉠ 은 초록인 채
    //    이것만 빨개진다.
    //
    // 참은 **바깥**에서 온다 — DB 접속 정보를 지우면 Prisma 가 던지므로,
    // main 에 닿았다는 것이 **종료 코드 ≠ 0** 으로 관측된다.
    // 울타리가 거짓이면 아무것도 안 하고 **0** 이다.
    expect(fs.existsSync(path.join(REPO, PRE_PUSH_SCRIPT))).toBe(true);

    let code = 0;
    let out = "";
    try {
      out = execFileSync("npx", ["tsx", PRE_PUSH_SCRIPT], {
        cwd: REPO,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        shell: process.platform === "win32",
        timeout: 120_000,
        env: {
          ...process.env,
          DATABASE_URL: "",
          DIRECT_URL: "",
          // 워커가 물려준 vitest 환경이 tsx 실행에 섞이지 않게 한다.
          VITEST: "",
          NODE_ENV: "development",
        },
      });
    } catch (e) {
      const err = e as { status?: number; stdout?: string; stderr?: string };
      code = err.status ?? 1;
      out = (err.stdout ?? "") + (err.stderr ?? "");
    }

    expect(
      code,
      "🔴 `npx tsx " +
        PRE_PUSH_SCRIPT +
        "` 이 **조용히 0** 으로 끝났다.\n" +
        "   울타리(`isDirectScript`)가 거짓이라 main() 에 안 닿는다는 뜻이다.\n" +
        "   pre-push ⑶ 은 종료 코드만 보므로 **이대로면 훅이 초록인 채 검사가 죽는다.**\n" +
        "   출력: " +
        (out.slice(0, 400) || "(한 줄도 없다 — 이것이 바로 그 증상이다)"),
    ).not.toBe(0);
  }, 150_000);
});

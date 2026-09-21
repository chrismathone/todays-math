import { expect, test, type Page } from "@playwright/test";

/**
 * 담은 문항 시안(Wire) 네 안을 **재는** 시험(트랙 41). D-07 이라 구현은 안 한다 —
 * 시안을 그려 1516px·1280px 에서 «자리가 되는가»와 «몇 번 눌러 빼고 되돌리는가»를 재고,
 * 스크린샷을 남긴다. 잰 값은 `[잰 값]` 줄과 첨부로 남는다.
 *
 * 시안의 틀은 제품 CSS 모듈로 그렸다(`wire.tsx` 머리 주석). 그 폭이 트랙 41 의 «현행» 화면과 맞는지는
 * 그때 잰 값(바닥 막대 1212/976, 검수 카드 머리 604/474)과 견준다 — 어긋나면 이 시험이 문다.
 *
 * ⚠️ 이 값은 트랙 41 의 **대역 둘레**(`frame.css` — 메뉴 248 · 여백 28)에서 잰 것이다. 트랙 44 부터
 *    `current.tsx` 는 진짜 `UnifiedWorkspace` 를 띄우는데, 진짜 둘레(메뉴 240 · 여백 20)에서는 작업실이
 *    24px 넓다 — 바닥 막대 1236/1000, 검수 카드 머리 617/487. 그래서 진짜 1280 에서는 작업실이 980 을
 *    넘어 바닥 «M문항 담음» 줄이 **숨지 않는다**. 시안끼리 견주는 이 시험은 대역 둘레 그대로 둔다.
 */

type Plan = "A" | "B" | "C" | "D";
const PLANS: Plan[] = ["A", "B", "C", "D"];
/** 트랙 41 의 current.spec.ts 가 대역 둘레 안의 진짜 작업실에서 잰 폭(2026-09-21). */
const REAL = {
  1516: { 바닥막대: 1212, 카드머리: 604 },
  1280: { 바닥막대: 976, 카드머리: 474 },
} as const;

const picked = async (page: Page) =>
  JSON.parse(
    (await page.getByLabel("담은 목록").textContent()) ?? "[]",
  ) as string[];

/** 칸의 폭과 줄 수(자식 세로 중심의 가짓수). */
const lineBox = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((element) => {
      const children = [...element.children]
        .map((child) => child.getBoundingClientRect())
        .filter((rect) => rect.width && rect.height);
      return {
        폭: Math.round(element.getBoundingClientRect().width),
        높이: Math.round(element.getBoundingClientRect().height),
        줄수: new Set(
          children.map((rect) => Math.round(rect.top + rect.height / 2)),
        ).size,
      };
    });

test("네 안 — 1516·1280 에서 자리가 되는가", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const 잰값: Record<string, unknown> = {};
  // 안 A·D 는 새 것을 카드 머리(기본)와 바닥 줄 끝(«A@foot»·«D@foot») 두 자리에서 잰다.
  const variants = [...PLANS, "A@foot", "D@foot"];
  for (const variant of variants) {
    const [plan, at] = variant.split("@");
    for (const width of [1516, 1280] as const) {
      await page.setViewportSize({ width, height: 940 });
      await page.goto(
        `/wire.html?plan=${plan}${plan === "A" ? "" : "&open=1"}${at ? `&at=${at}` : ""}`,
      );
      const footer = await lineBox(
        page,
        'footer[aria-label="문제 제작 주요 작업"]',
      );
      const heading = await lineBox(
        page,
        'article[aria-label="문제 01 인식 결과"] [class*="cardHeading"]',
      );
      // 시안 틀이 진짜 작업실과 같은 폭인가 — 아니면 아래 줄 수가 거짓이다.
      expect(footer.폭).toBe(REAL[width].바닥막대);
      expect(Math.abs(heading.폭 - REAL[width].카드머리)).toBeLessThanOrEqual(
        1,
      );
      const row: Record<string, unknown> = {
        바닥막대: footer,
        바닥상태줄_보임: await page
          .locator('footer[aria-label="문제 제작 주요 작업"] strong')
          .first()
          .isVisible(),
        카드머리: heading,
        카드바닥: await lineBox(
          page,
          'article[aria-label="문제 01 인식 결과"] [class*="cardFooter"]',
        ),
      };
      const panel = page.locator(
        'section[aria-label="담은 문항 목록"], section[aria-label="문제 순서 서랍"]',
      );
      if (await panel.count()) {
        const box = (await panel.boundingBox())!;
        const body = (await page.locator(".wireBody").boundingBox())!;
        const results = (await page
          .getByLabel("인식 결과", { exact: true })
          .boundingBox())!;
        row.펼친칸 = {
          폭: Math.round(box.width),
          높이: Math.round(box.height),
          틀안에_들어감:
            box.y >= body.y - 1 &&
            box.y + box.height <= body.y + body.height + 1,
          // 결과 칸을 얼마나 가리나 — 검수하던 카드가 덮이면 보며 뺄 수 없다.
          결과칸_가림_비율: Number(
            (
              Math.max(
                0,
                Math.min(box.x + box.width, results.x + results.width) -
                  Math.max(box.x, results.x),
              ) / results.width
            ).toFixed(2),
          ),
          줄_높이: await panel
            .locator("li")
            .first()
            .evaluate((element) =>
              Math.round(element.getBoundingClientRect().height),
            ),
        };
      }
      잰값[`${variant}_${width}`] = row;
      await page.screenshot({
        path: testInfo.outputPath(
          `안${variant.replace("@", "-")}-${width}.png`,
        ),
      });
      // 안 D 의 카드 표시는 목록을 펴면 가려진다 — 접은 모습도 남긴다.
      if (plan === "D") {
        await page.getByRole("button", { name: /담은 문항/ }).click();
        await page.screenshot({
          path: testInfo.outputPath(
            `안${variant.replace("@", "-")}-${width}-접음.png`,
          ),
        });
      }
    }
  }
  console.log(`[잰 값] ${JSON.stringify(잰값)}`);
  await testInfo.attach("잰 값", {
    body: JSON.stringify(잰값, null, 2),
    contentType: "application/json",
  });
  expect(errors).toEqual([]);
});

test("네 안 — 문제 02 를 빼고 되돌리는 데 몇 번 누르나, 제자리로 돌아오나", async ({
  page,
}, testInfo) => {
  const 누른수: Record<string, { 빼기: number; 되돌리기: number }> = {};
  for (const plan of PLANS) {
    await page.setViewportSize({ width: 1280, height: 940 });
    await page.goto(`/wire.html?plan=${plan}`);
    const start = await picked(page);
    expect(start.indexOf("c2")).toBe(1);
    let clicks = 0;
    const press = async (name: string) => {
      await page.getByRole("button", { name, exact: true }).click();
      clicks += 1;
    };
    if (plan === "A") await press("문제 02 담기 취소");
    else {
      await page
        .getByRole("button", { name: plan === "C" ? /문제 순서/ : /담은 문항/ })
        .click();
      clicks += 1;
      await press("문제 02 빼기");
    }
    expect(await picked(page)).not.toContain("c2");
    const removed = clicks;
    // 한꺼번에 담기가 뺀 것을 도로 넣지 않는다(시안의 규칙 — 여쭐 것 ②).
    await expect(
      page.getByRole("button", { name: /문항 담기|모두 담았습니다/ }),
    ).toHaveText(/4문항 담기/);
    if (plan !== "A") {
      await page.screenshot({
        path: testInfo.outputPath(`안${plan}-뺀뒤.png`),
      });
    }
    clicks = 0;
    await press(plan === "A" ? "문제 02 담기" : "문제 02 다시 담기");
    expect(await picked(page)).toEqual(start);
    누른수[plan] = { 빼기: removed, 되돌리기: clicks };
  }
  console.log(`[잰 값] ${JSON.stringify(누른수)}`);
  await testInfo.attach("누른 수", {
    body: JSON.stringify(누른수, null, 2),
    contentType: "application/json",
  });
});

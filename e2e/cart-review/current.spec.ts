import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 담은 문항 — **고친 뒤의 모습**을 진짜 작업실에서 재는 시험(트랙 44).
 * 원장님 2026-09-21 «담은걸 확인하거나 빼거나 어떤걸 담았는지 체크할 수 있는기능이 없는듯» →
 * 트랙 41 안 D 확정(«추천대로»).
 *
 * 🔴 트랙 41 의 이 시험은 **어긋남을 단정했다**(④ 에서 빼도 작업실은 «담음»·«모두 담았습니다»로 잠김,
 *    새 시험지에도 옛 «담음», 검수 완료만 눌러도 «담음»이 풀림). 장부를 시험지 목록 하나로 합치면서
 *    그 단정을 **뒤집었다** — 이제 이 시험이 초록이면 어긋남이 **없다**는 뜻이다. 옛 단정으로 되돌리지 말 것.
 *
 * 화면은 **진짜 `UnifiedWorkspace`**(`current.tsx`) — 작업실·④ 시험지 구성·문제은행·새 시험지가 다 진짜다.
 * 유료 AI 는 부르지 않는다 — POST 는 막는다.
 *
 * 트랙 47(원장님 2026-09-21 확정 «추천대로») — 뺀 것만 남으면 «담을 문항 없음», 카드 표시는 «반영 전»
 * (긴 뜻은 읽는 이름·title), 뺀 기억은 시험지와 같이 저장돼 새로 고쳐도 남는다.
 */

/** step-header.spec.ts 와 같은 다섯 쪽 PDF. 거기 것을 내보내지 않아 여기 다시 둔다. */
function examPdf(pages: number) {
  const fontId = 3 + pages * 2;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Count ${pages} /Kids [${Array.from({ length: pages }, (_, i) => `${3 + i * 2} 0 R`).join(" ")}] >>`,
  ];
  for (let i = 0; i < pages; i++) {
    const stream = `BT /F1 24 Tf 40 500 Td (EXAM PAGE ${i + 1}) Tj ET`;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 600] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${4 + i * 2} 0 R >>`,
    );
    objects.push(
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
  }
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const start = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join(
      "",
    )}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return Buffer.from(pdf);
}

const FILE_NAME = "[경신중][2][25-2-중간][미래엔][1학기 전범위].pdf";

async function stubNetwork(page: Page) {
  await page.route("**/api/studio/pdf-worker?*", (route) =>
    route.fulfill({
      body: readFileSync(
        resolve("node_modules/pdfjs-dist/build/pdf.worker.min.mjs"),
      ),
      contentType: "text/javascript",
    }),
  );
  await page.route("**/api/studio/pdf-assets/**", (route) => {
    const parts = new URL(route.request().url()).pathname.split("/").slice(-2);
    return route.fulfill({
      body: readFileSync(resolve("node_modules/pdfjs-dist", ...parts)),
      contentType: parts[1].endsWith(".wasm")
        ? "application/wasm"
        : "application/octet-stream",
    });
  });
  await page.route("**/api/dev/unified/ai", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 500,
          json: { error: "시험은 AI 를 안 부른다" },
        })
      : route.fulfill({
          json: {
            enabled: true,
            mode: "subscription-cli",
            defaultProvider: "codex",
            providers: [
              {
                id: "codex",
                label: "Codex",
                status: "ready",
                detail: "사용 가능",
                image: true,
              },
            ],
          },
        }),
  );
}

const stepTab = (page: Page, name: RegExp) =>
  page
    .getByRole("navigation", { name: "제작 단계 이동" })
    .getByRole("button", { name });
const menu = (page: Page, name: string) =>
  page.getByRole("navigation", { name: "작업실 메뉴" }).getByRole("button", {
    name,
  });
/** 시험지 화면으로 — 옆 메뉴에 «시험지 · 내보내기» 줄이 없다(원장님 2026-10-01). 옆 «현재 시험지 · 편집 이어가기». */
const openWorksheet = (page: Page) =>
  page.getByRole("button", { name: /편집 이어가기/ }).click();
const footer = (page: Page) =>
  page.locator('footer[aria-label="문제 제작 주요 작업"]');
const addButton = (page: Page) =>
  footer(page).getByRole("button", {
    name: /문항 담기|모두 담았습니다|담을 문항 없음|시험지에 담기/,
  });
const cartToggle = (page: Page) =>
  footer(page).getByRole("button", { name: /^담은 문항/ });
const panel = (page: Page) =>
  page.getByRole("region", { name: "담은 문항 목록" });
const card = (page: Page, n: number) =>
  page.getByRole("article", { name: `문제 ${n} 인식 결과` });
/** 검수 카드의 «담음» 표시 — 카드 바닥 줄 끝(D@foot). */
const chips = (page: Page) =>
  page.getByLabel("원본과 인식 결과 비교").locator("[data-studio-cart-chip]");
const topBadge = (page: Page) =>
  page.getByRole("button", { name: /^담은 문제 \d+$/ });

/** 지금 시험지(localStorage 의 활성 초안)의 담은 문항 — 제품 저장소를 그대로 읽는다. */
const savedWorksheet = (page: Page) =>
  page.evaluate(() => {
    const envelope = JSON.parse(
      localStorage.getItem("today-math-workspace-drafts-v1") ?? "null",
    ) as {
      activeId: string;
      drafts: {
        id: string;
        problems: {
          id: string;
          studioCrop?: {
            revision?: number;
            reviewed?: boolean;
            ocr?: { topic?: string };
          };
        }[];
      }[];
    } | null;
    const draft = envelope?.drafts.find(
      (item) => item.id === envelope.activeId,
    );
    return (draft?.problems ?? []).map((problem) => ({
      id: problem.id,
      revision: problem.studioCrop?.revision ?? 0,
      reviewed: problem.studioCrop?.reviewed ?? false,
      topic: problem.studioCrop?.ocr?.topic ?? null,
    }));
  });

/** 지금 시험지의 뺀 기억(트랙 47 — 시험지와 같이 저장한다). */
const savedRemoved = (page: Page) =>
  page.evaluate(() => {
    const envelope = JSON.parse(
      localStorage.getItem("today-math-workspace-drafts-v1") ?? "null",
    ) as {
      activeId: string;
      drafts: {
        id: string;
        removed?: { problem: { id: string }; index: number }[];
      }[];
    } | null;
    const draft = envelope?.drafts.find(
      (item) => item.id === envelope.activeId,
    );
    return (draft?.removed ?? []).map((item) => ({
      id: item.problem.id,
      index: item.index,
    }));
  });

/** 글자의 줄 수 — 글자 조각(텍스트 노드) 윗변의 가짓수. 넘쳐 잘렸는지도 같이. */
const textLines = (locator: Locator) =>
  locator.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const tops = new Set<number>();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects())
        if (rect.width && rect.height) tops.add(Math.round(rect.top));
    }
    return {
      줄수: tops.size,
      넘침: element.scrollWidth > element.clientWidth + 1,
      폭: Math.round(element.getBoundingClientRect().width),
    };
  });

/** 칸의 폭·높이와 줄 수(자식 세로 중심의 가짓수 — 한 줄이면 1). */
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

/**
 * 카드 바닥 줄의 짜임 — 담은 문항 표시(+ 고친 뒤면 «반영»)가 어디 섰나.
 * 확정: 둘은 한 덩어리로 줄 오른쪽 끝, 모자라면 같이 둘째 줄 오른쪽(안 A — 원장님 2026-09-21 «추천대로 가», D-135 ⑼).
 *
 * 줄 수는 겹침으로 센다 — 칸을 윗변 차례로 놓고, 앞 줄의 아랫변 아래에서 시작하면 새 줄.
 * 🔴 칸 세로 중심을 반올림해 세면(`lineBox`) 높이가 다른 칸(출력 44 · 단추 34 · 표시 21px)의 소수점
 *    차이로 한 줄을 둘로 센다(트랙 47 에서 실제로 그랬다). 그래서 겹침으로 센다.
 * 덩어리(`data-studio-cart-slot`)는 풀어서 표시·«반영»을 따로 센다 — 트랙 47 이 잰 수(요소 합 528)와 같은
 * 셈이고, 덩어리를 `display: contents` 로 풀어 옛 모양을 만들어도 같은 자로 잰다(자가 눈 멀지 않았나 확인).
 * `모자람` — 칸 폭과 간격을 다 더한 것이 줄 폭보다 얼마나 넘치나(0 이하면 한 줄에 들어간다).
 */
const footerLayout = (page: Page, n: number) =>
  card(page, n)
    .locator('[class*="cardFooter"]')
    .evaluate((footer) => {
      const slot = footer.querySelector("[data-studio-cart-slot]");
      const chip = footer.querySelector("[data-studio-cart-chip]");
      const reflect = [...footer.querySelectorAll("button")].find(
        (button) => button.textContent === "반영",
      );
      const items = [...footer.children]
        .flatMap((child) => (child === slot ? [...child.children] : [child]))
        .map((child) => ({ child, rect: child.getBoundingClientRect() }))
        .filter(({ rect }) => rect.width && rect.height);
      const rects = items.map(({ rect }) => rect).sort((a, b) => a.top - b.top);
      let rows = 0;
      let bottom = -Infinity;
      for (const rect of rects) {
        if (rect.top >= bottom - 1) {
          rows += 1;
          bottom = rect.bottom;
        } else bottom = Math.max(bottom, rect.bottom);
      }
      const gap = parseFloat(getComputedStyle(footer).columnGap) || 0;
      const box = footer.getBoundingClientRect();
      const need =
        rects.reduce((sum, rect) => sum + rect.width, 0) +
        gap * (rects.length - 1);
      const a = chip?.getBoundingClientRect();
      const b = reflect?.getBoundingClientRect();
      const last = b ?? a;
      const others = items
        .filter(({ child }) => child !== chip && child !== reflect)
        .map(({ rect }) => rect);
      return {
        줄수: rows,
        폭: Math.round(box.width),
        모자람: Math.round(need - box.width),
        표시폭: a ? Math.round(a.width) : null,
        같은줄: !a || !b || (a.top < b.bottom && b.top < a.bottom),
        반영이_오른쪽: !a || !b || b.left >= a.right,
        /** 덩어리의 오른쪽 끝(«반영», 없으면 표시)이 바닥 줄 오른쪽 끝에 붙었나. */
        오른쪽끝: !!last && Math.abs(box.right - last.right) <= 1,
        /**
         * 표시와 같은 줄의 칸들이 «출력» 칸 다음부터 빈틈 없이 붙었나 — 단추(해설 생성·검수 완료)가
         * 빈 자리 가운데로 뜨지 않고 표시 곁 오른쪽에 모인다(원장님 2026-09-21 «권장안대로»).
         */
        단추_붙음: (() => {
          if (!a) return true;
          const label = footer.querySelector(":scope > label");
          const row = items
            .filter(({ child }) => child !== label)
            .map(({ rect }) => rect)
            .filter((rect) => rect.top < a.bottom && a.top < rect.bottom)
            .sort((x, y) => x.left - y.left);
          return row.every(
            (rect, i) => i === 0 || rect.left - row[i - 1].right <= gap + 1,
          );
        })(),
        /** 표시 아래 줄에서 시작하는 칸이 없다 — 꺾이면 덩어리가 마지막 줄로 간다. */
        마지막줄: !!a && others.every((rect) => rect.top < a.bottom),
        /** 짜임 — 표시와 «반영»이 한 덩어리이고, 그 덩어리가 바닥 줄의 맨 끝 칸. */
        바닥줄_맨끝칸:
          !!slot &&
          slot.parentElement === footer &&
          footer.lastElementChild === slot &&
          chip?.parentElement === slot &&
          (!reflect || reflect.parentElement === slot),
      };
    });

/** 덩어리를 `display: contents` 로 풀어(= 안 A 전의 모양) 같은 자로 잰 뒤 되돌린다. */
async function footerLayoutUnwrapped(page: Page, n: number) {
  const slot = card(page, n).locator("[data-studio-cart-slot]");
  await slot.evaluate((element: HTMLElement) => {
    element.style.display = "contents";
  });
  const loose = await footerLayout(page, n);
  await slot.evaluate((element: HTMLElement) => {
    element.style.display = "";
  });
  return loose;
}

/** 한 칸 높이 0.18 — 세 칸(0.05·0.30·0.55)이 서로 겹치지 않는다. */
async function dragBox(page: Page, top: number) {
  const area = page.getByRole("group", { name: "문제 자르기 영역" });
  await expect(area).toBeVisible();
  const rect = (await area.boundingBox())!;
  await page.mouse.move(rect.x + rect.width * 0.1, rect.y + rect.height * top);
  await page.mouse.down();
  await page.mouse.move(
    rect.x + rect.width * 0.85,
    rect.y + rect.height * (top + 0.18),
    { steps: 6 },
  );
  await page.mouse.up();
}

/** 원본을 올리고 세 문제를 잘라 ③ OCR · 디지털화로 간다(AI 없이 — 단계 탭은 단계만 바꾼다). */
async function toReview(page: Page) {
  await stubNetwork(page);
  await page.setViewportSize({ width: 1516, height: 940 });
  await page.goto("/#studio");
  await page.getByLabel("PDF 또는 이미지 파일 가져오기").setInputFiles({
    name: FILE_NAME,
    mimeType: "application/pdf",
    buffer: examPdf(5),
  });
  // 지면이 다 그려진 뒤에 끈다 — 먼저 끌면 첫 칸이 조용히 안 잘린다.
  await expect(
    page.getByRole("button", { name: "키보드로 영역 지정" }),
  ).toBeEnabled();
  for (const top of [0.05, 0.3, 0.55]) await dragBox(page, top);
  await stepTab(page, /OCR · 디지털화/).click();
  await expect(page.getByLabel("문항 검수 이동")).toBeVisible();
  // 끌기 셋이 늘 셋을 자르지는 않는다(자른 뒤 도구가 바뀐다) — 몇 개인지는 탭 배지로 읽는다.
  const count = Number(
    (await stepTab(page, /OCR · 디지털화/)
      .locator("b")
      .textContent()) ?? 0,
  );
  expect(count).toBeGreaterThanOrEqual(2);
  return count;
}

test("③ 에서 담으면 카드마다 «담음» · 목록으로 보고 뺀다 — ④·문제은행·새 시험지와 한 장부", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const n = await toReview(page);

  // 담기 전: «N문항 담기», 표시 없음, 목록 단추는 흐림(담은 것도 뺀 것도 없다).
  await expect(addButton(page)).toHaveText(`${n}문항 담기`);
  await expect(chips(page)).toHaveCount(0);
  await expect(cartToggle(page)).toBeDisabled();
  const 잰값: Record<string, unknown> = { 자른문항: n };
  const 머리_담기전: Record<number, unknown> = {};
  for (const width of [1516, 1280]) {
    await page.setViewportSize({ width, height: 940 });
    머리_담기전[width] = await lineBox(
      page,
      'article[aria-label="문제 1 인식 결과"] [class*="cardHeading"]',
    );
  }

  // 담는다.
  await page.setViewportSize({ width: 1516, height: 940 });
  await addButton(page).click();
  await expect(addButton(page)).toHaveText(/모두 담았습니다/);
  await expect(addButton(page)).toBeDisabled();
  await expect(chips(page)).toHaveCount(n);
  await expect(chips(page)).toHaveText(Array(n).fill("담음"));
  await expect(cartToggle(page)).toHaveText(new RegExp(`담은 문항\\s*${n}`));
  await expect(stepTab(page, /시험지 구성/)).toHaveText(
    new RegExp(`시험지 구성\\s*${n}$`),
  );
  await expect(topBadge(page)).toHaveAccessibleName(`담은 문제 ${n}`);

  // D@foot — 표시가 카드 바닥 줄 끝에 서서 1280 에서도 카드 머리가 한 줄 그대로다.
  const 머리_담은뒤: Record<number, { 줄수: number; 높이: number }> = {};
  for (const width of [1516, 1280]) {
    await page.setViewportSize({ width, height: 940 });
    머리_담은뒤[width] = await lineBox(
      page,
      'article[aria-label="문제 1 인식 결과"] [class*="cardHeading"]',
    );
    expect(머리_담은뒤[width].줄수).toBe(1);
    expect(머리_담은뒤[width]).toEqual(머리_담기전[width]);
    // «담음»도 «반영 전 · 반영»과 같은 덩어리 자리 — 바닥 줄 오른쪽 끝(안 A, D-135 ⑼).
    // 표시 자리가 상태마다 바뀌지 않는다.
    expect(await footerLayout(page, 1)).toMatchObject({
      오른쪽끝: true,
      마지막줄: true,
      바닥줄_맨끝칸: true,
      단추_붙음: true,
    });
    await page.screenshot({
      path: testInfo.outputPath(`담은뒤-3단계-${width}.png`),
    });
    await cartToggle(page).click();
    await expect(panel(page)).toBeVisible();
    await expect(panel(page).getByRole("listitem")).toHaveCount(n);
    await page.screenshot({
      path: testInfo.outputPath(`목록-펼침-${width}.png`),
    });
    잰값[`목록_${width}`] = await panel(page).evaluate((element) => {
      const box = element.getBoundingClientRect();
      const results = document
        .querySelector('[aria-label="문자·도형 인식 결과"]')!
        .getBoundingClientRect();
      return {
        폭: Math.round(box.width),
        높이: Math.round(box.height),
        결과칸_가림_비율: Number(
          (
            Math.max(
              0,
              Math.min(box.right, results.right) -
                Math.max(box.left, results.left),
            ) / results.width
          ).toFixed(2),
        ),
      };
    });
    await cartToggle(page).click();
    await expect(panel(page)).toHaveCount(0);
  }
  잰값.카드머리 = { 담기전: 머리_담기전, 담은뒤: 머리_담은뒤 };

  // ④ 에서 첫 문제를 뺀다 → 작업실도 안다(어긋남 1 이 사라졌다).
  await page.setViewportSize({ width: 1516, height: 940 });
  await openWorksheet(page);
  await page.getByRole("tab", { name: /문제 순서/ }).click();
  const order = page.getByRole("tabpanel", { name: /문제 순서/ });
  await expect(order.getByRole("listitem")).toHaveCount(n);
  const firstRow = await order.getByRole("listitem").first().textContent();
  await page.getByRole("button", { name: "1번 문제 빼기" }).click();
  await expect(order.getByRole("listitem")).toHaveCount(n - 1);
  await menu(page, "문제 추출").click();
  await expect(card(page, 1).locator("[data-studio-cart-chip]")).toHaveText(
    "뺌",
  );
  await expect(chips(page).filter({ hasText: /^담음$/ })).toHaveCount(n - 1);
  // 뺀 것은 한꺼번에 담기가 건너뛴다(확정 «안 넣는다») — 잠김이 아니라 «다시 담기»가 따로 있다.
  // 일부러 건너뛴 것이 있으니 «모두»가 아니다 — «담을 문항 없음»(원장님 2026-09-21 확정, 트랙 47).
  await expect(addButton(page)).toHaveText(/담을 문항 없음/);
  await expect(addButton(page)).toBeDisabled();
  // «담을 문항 없음»이 두 폭에서 한 줄 — 바닥 단추 셋도 한 줄.
  const 담을문항없음: Record<number, unknown> = {};
  for (const width of [1516, 1280]) {
    await page.setViewportSize({ width, height: 940 });
    const lines = await textLines(addButton(page));
    const row = await lineBox(page, '[class*="outputActions"]');
    expect(lines).toMatchObject({ 줄수: 1, 넘침: false });
    expect(row.줄수).toBe(1);
    // «뺌» 표시도 같은 덩어리 자리 — 바닥 줄 오른쪽 끝(안 A, D-135 ⑼).
    expect(await footerLayout(page, 1)).toMatchObject({
      오른쪽끝: true,
      마지막줄: true,
      바닥줄_맨끝칸: true,
    });
    담을문항없음[width] = { 단추: lines, 바닥줄: row };
    await page.screenshot({
      path: testInfo.outputPath(`담을문항없음-${width}.png`),
    });
  }
  잰값.담을문항없음 = 담을문항없음;
  await page.setViewportSize({ width: 1516, height: 940 });
  await expect(cartToggle(page)).toHaveText(
    new RegExp(`담은 문항\\s*${n - 1}`),
  );
  await cartToggle(page).click();
  const removedRow = panel(page).locator('li[data-removed="true"]');
  await expect(removedRow).toHaveCount(1);
  await expect(removedRow).toContainText("뺐습니다");
  await page.screenshot({
    path: testInfo.outputPath("4단계에서-뺀뒤-작업실-목록.png"),
  });
  await removedRow.getByRole("button", { name: "문제 01 다시 담기" }).click();
  await expect(card(page, 1).locator("[data-studio-cart-chip]")).toHaveText(
    "담음",
  );
  await expect(addButton(page)).toHaveText(/모두 담았습니다/);
  await expect(topBadge(page)).toHaveAccessibleName(`담은 문제 ${n}`);
  await openWorksheet(page);
  await page.getByRole("tab", { name: /문제 순서/ }).click();
  // 뺀 자리(첫째)로 돌아왔다.
  await expect(order.getByRole("listitem").first()).toHaveText(firstRow!);

  // 문제은행에서 하나 더 담는다 → 작업실 목록은 시험지 전체(출처 «문제은행»).
  await menu(page, "문제은행").click();
  await page
    .getByRole("button", { name: /번 문제 담기$/ })
    .first()
    .click();
  await expect(
    page.getByRole("status", { name: `담은 문제 ${n + 1}문항` }),
  ).toBeAttached();
  await menu(page, "문제 추출").click();
  await expect(cartToggle(page)).toHaveText(
    new RegExp(`담은 문항\\s*${n + 1}`),
  );
  await cartToggle(page).click();
  await expect(panel(page).getByRole("listitem")).toHaveCount(n + 1);
  await expect(panel(page).getByRole("listitem").last()).toContainText(
    "문제은행",
  );
  await expect(panel(page)).toContainText(`이 원본 ${n} · 다른 곳 1`);
  // 모든 화면 일치 — 작업실 «담음» 수 · 목록 · 탭 배지 · 위 띠 · 옆 «현재 시험지» 칸이 같은 장부
  // (옆 메뉴의 «시험지 · 내보내기» 줄과 그 배지는 2026-10-01 에 뺐다).
  await expect(chips(page).filter({ hasText: /^담음$/ })).toHaveCount(n);
  await expect(stepTab(page, /시험지 구성/)).toHaveText(
    new RegExp(`시험지 구성\\s*${n + 1}$`),
  );
  await expect(topBadge(page)).toHaveAccessibleName(`담은 문제 ${n + 1}`);
  await expect(page.getByText(`${n + 1}문항`, { exact: true })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("목록-문제은행-포함.png"),
  });
  await cartToggle(page).click();

  // 새 시험지 → 옛 «담음»이 풀리고 다시 담을 수 있다(어긋남 2 가 사라졌다).
  // 옆 메뉴의 «새 시험지 만들기»는 걷었다(2026-10-17) — «내 시험지»의 «새 시험지»로 연다.
  await page
    .getByRole("navigation", { name: "작업실 메뉴" })
    .getByRole("button", { name: "내 시험지" })
    .click();
  await page
    .getByRole("button", { name: "새 시험지", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: /내 자료로 만들기/ }).click();
  await expect(topBadge(page)).toHaveAccessibleName("담은 문제 0");
  await expect(chips(page)).toHaveCount(0);
  await expect(addButton(page)).toHaveText(`${n}문항 담기`);
  await expect(addButton(page)).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath("새시험지-3단계.png") });
  await addButton(page).click();
  await expect(chips(page)).toHaveText(Array(n).fill("담음"));
  await expect(topBadge(page)).toHaveAccessibleName(`담은 문제 ${n}`);

  console.log(`[잰 값] ${JSON.stringify(잰값)}`);
  await testInfo.attach("잰 값", {
    body: JSON.stringify(잰값, null, 2),
    contentType: "application/json",
  });
  expect(errors).toEqual([]);
});

test("검수 완료만 눌러도 «담음» 그대로 — 고치면 «반영 전», «반영»이 같은 자리에 넣는다", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const n = await toReview(page);
  await addButton(page).click();
  await expect(addButton(page)).toHaveText(/모두 담았습니다/);
  await expect.poll(() => savedWorksheet(page)).toHaveLength(n);
  const before = await savedWorksheet(page);

  // 검수 완료 — 상태라 판이 그대로, «담음» 그대로(어긋남 3 이 사라졌다).
  await card(page, 1)
    .getByRole("button", { name: "이 문제 검수 완료" })
    .click();
  await expect(card(page, 1).locator("[data-studio-cart-chip]")).toHaveText(
    "담음",
  );
  await expect(addButton(page)).toHaveText(/모두 담았습니다/);
  await expect(addButton(page)).toBeDisabled();
  // 시험지 판은 같은 자리·같은 판에 상태만 따라온다.
  await expect
    .poll(async () => (await savedWorksheet(page))[0])
    .toEqual({
      ...before[0],
      reviewed: true,
    });
  expect((await savedWorksheet(page)).map((row) => row.id)).toEqual(
    before.map((row) => row.id),
  );
  await page.screenshot({
    path: testInfo.outputPath("검수완료뒤-3단계.png"),
  });

  // 내용을 고친다(토픽) → «반영 전» + «반영».
  await card(page, 1).getByRole("button", { name: "검수 완료 취소" }).click();
  await card(page, 1).getByRole("button", { name: "내용 수정" }).click();
  await card(page, 1).getByLabel("토픽").fill("일차방정식");
  await card(page, 1).getByRole("button", { name: "저장" }).click();
  // 원장님 2026-09-21 확정(트랙 47) — 보이는 글자는 «반영 전», 긴 뜻은 읽는 이름(숨은 글자)·title.
  const staleChip = card(page, 1).locator("[data-studio-cart-chip]");
  await expect(staleChip.locator('[aria-hidden="true"]')).toHaveText("반영 전");
  await expect(staleChip).toHaveAttribute("title", "담음 · 고친 내용 반영 전");
  await expect(staleChip.locator(":scope > :not([aria-hidden])")).toHaveText(
    "담음 · 고친 내용 반영 전",
  );
  // 고친 것은 한꺼번에 담기의 일이 아니다 — «N문항 담기»에 안 잡힌다.
  await expect(addButton(page)).toHaveText(/모두 담았습니다/);
  expect((await savedWorksheet(page))[0].topic).toBeNull();
  await page.screenshot({
    path: testInfo.outputPath("고친뒤-반영전-3단계.png"),
  });
  /**
   * 안 A(원장님 2026-09-21 «추천대로 가», D-135 ⑼) — «반영 전»과 «반영»은 한 덩어리로 바닥 줄 오른쪽 끝.
   * 1280(왼쪽 메뉴 편 채)은 카드 폭 487 에 바닥 줄 요소 합이 528 이라 한 줄에 못 들어간다(트랙 47) —
   * 그때는 둘이 **같이** 둘째 줄 오른쪽으로 간다. 고친 뒤 «검수 완료»까지 누른 카드는 잠금 안내 글 때문에
   * 1516 에서도 두 줄이다. 네 경우(1516·1280 × 잠금 안/잠금) 모두 같은 줄 · 오른쪽 끝 · 마지막 줄.
   */
  const 반영전: Record<string, Record<string, unknown>> = {};
  const measureStale = async (잠금: boolean) => {
    for (const width of [1516, 1280]) {
      await page.setViewportSize({ width, height: 940 });
      expect(
        (
          await lineBox(
            page,
            'article[aria-label="문제 1 인식 결과"] [class*="cardHeading"]',
          )
        ).줄수,
      ).toBe(1);
      const now = await footerLayout(page, 1);
      const name = `${잠금 ? "잠금-" : ""}${width}`;
      await page.screenshot({
        path: testInfo.outputPath(`고친뒤-반영전-${name}.png`),
      });
      await card(page, 1)
        .locator('[class*="cardFooter"]')
        .screenshot({
          path: testInfo.outputPath(`카드바닥-반영전-${name}.png`),
        });
      expect(now).toMatchObject({
        같은줄: true,
        반영이_오른쪽: true,
        오른쪽끝: true,
        마지막줄: true,
        바닥줄_맨끝칸: true,
        단추_붙음: true,
      });
      // 자가 눈이 멀지 않았는지 ① — 덩어리를 풀면(안 A 전 모양) 같은 자가 떨어짐을 잰다.
      // 오른쪽 끝은 이제 바닥 줄의 justify-content 가 만든다(D-135 ⑽) — 덩어리가 지키는 것은 «같은 줄» 하나다.
      // 그것이 갈리는 자리는 1280 잠금 안: 풀면 «반영 전»은 첫 줄 끝에 남고 «반영»만 둘째 줄로 떨어진다.
      // 잠긴 카드는 풀어도 둘이 같이 둘째 줄로 가고, 1516 잠금 안은 한 줄이라 둘 다 풀어도 같다(2026-09-21 실측).
      const loose = await footerLayoutUnwrapped(page, 1);
      if (!잠금 && width === 1280) expect(loose.같은줄).toBe(false);
      expect(await footerLayout(page, 1)).toEqual(now);
      const row: Record<string, unknown> = { 지금: now, 풀면: loose };
      // 자가 눈이 멀지 않았는지 ② — 옛 긴 글자를 그 자리에 넣으면 같은 자가 꺾임을 잰다.
      if (!잠금) {
        const saved = await staleChip.evaluate((element) => {
          const html = element.innerHTML;
          element.textContent = "담음 · 고친 내용 반영 전";
          return html;
        });
        const old = await footerLayout(page, 1);
        await staleChip.evaluate((element, html) => {
          element.innerHTML = html;
        }, saved);
        expect(await footerLayout(page, 1)).toEqual(now);
        expect(old.줄수).toBeGreaterThan(1);
        row.옛글자 = old;
      }
      반영전[`${잠금 ? "잠금_" : ""}${width}`] = row;
    }
    await page.setViewportSize({ width: 1516, height: 940 });
  };
  await measureStale(false);
  // 1516 — 출력·해설·검수 완료·«반영 전»·«반영»이 한 줄(트랙 44 는 «반영»이 둘째 줄로 꺾였다).
  expect(반영전["1516"].지금).toMatchObject({ 줄수: 1 });
  // 고친 뒤 «검수 완료»까지 — 가장 흔한 흐름(고치고 → 검수 완료 → 반영). 상태라 «반영 전» 그대로.
  await card(page, 1)
    .getByRole("button", { name: "이 문제 검수 완료" })
    .click();
  await expect(staleChip.locator('[aria-hidden="true"]')).toHaveText("반영 전");
  await measureStale(true);
  await card(page, 1).getByRole("button", { name: "검수 완료 취소" }).click();

  // ② 자른 문제 목록 배지도 같은 표시(모든 화면 일치) — 두 폭에서 한 줄.
  await stepTab(page, /잘라내기/).click();
  const listItem = page
    .getByLabel("자른 문제 목록")
    .getByRole("button", { name: /문제 01/ });
  await expect(listItem).toHaveAccessibleName(/담음 · 고친 내용 반영 전/);
  await expect(
    listItem.locator('[data-studio-cart-chip] [aria-hidden="true"]'),
  ).toHaveText("반영 전");
  for (const width of [1516, 1280]) {
    await page.setViewportSize({ width, height: 940 });
    const visible = await textLines(
      listItem.locator('[data-studio-cart-chip] [aria-hidden="true"]'),
    );
    const box = await listItem.evaluate((item) => {
      const chip = item
        .querySelector("[data-studio-cart-chip]")!
        .getBoundingClientRect();
      const row = item.getBoundingClientRect();
      return {
        표시폭: Math.round(chip.width),
        표시높이: Math.round(chip.height),
        목록폭: Math.round(row.width),
        안에_있음: chip.right <= row.right + 0.5 && chip.left >= row.left,
      };
    });
    expect(visible.줄수).toBe(1);
    expect(box.안에_있음).toBe(true);
    반영전[`목록_${width}`] = { ...box, 글자줄수: visible.줄수 };
    await page.screenshot({
      path: testInfo.outputPath(`2단계-목록-반영전-${width}.png`),
    });
  }
  await page.setViewportSize({ width: 1516, height: 940 });
  await stepTab(page, /OCR · 디지털화/).click();
  console.log(`[잰 값 반영 전] ${JSON.stringify(반영전)}`);
  await testInfo.attach("잰 값 반영 전", {
    body: JSON.stringify(반영전, null, 2),
    contentType: "application/json",
  });
  await card(page, 1)
    .getByRole("button", { name: "문제 1 고친 내용 반영" })
    .click();
  await expect(card(page, 1).locator("[data-studio-cart-chip]")).toHaveText(
    "담음",
  );
  await expect
    .poll(async () => (await savedWorksheet(page))[0].topic)
    .toBe("일차방정식");
  const after = await savedWorksheet(page);
  expect(after.map((row) => row.id)).toEqual(before.map((row) => row.id));
  expect(after[0].revision).toBeGreaterThan(before[0].revision);
  expect(errors).toEqual([]);
});

test("편집창 확대 중 — 목록에서 빼고 되돌리고, 뺀 것은 «담고 내보내기»가 안 되넣는다", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const n = await toReview(page);
  await addButton(page).click();
  await page.getByRole("button", { name: "편집창 확대" }).click();
  await cartToggle(page).click();
  await panel(page).getByRole("button", { name: "문제 02 빼기" }).click();
  await expect(card(page, 2).locator("[data-studio-cart-chip]")).toHaveText(
    "뺌",
  );
  // 위 알림 줄의 «되돌리기»는 확대 중 inert 에 덮인다 — 되돌리기는 목록 안에 있다(공통 ③).
  const topUndo = page.getByRole("button", { name: "되돌리기" });
  if (await topUndo.count())
    expect(
      await topUndo.evaluate((element) => Boolean(element.closest("[inert]"))),
    ).toBe(true);
  const restore = panel(page).getByRole("button", {
    name: "문제 02 다시 담기",
  });
  expect(
    await restore.evaluate((element) => Boolean(element.closest("[inert]"))),
  ).toBe(false);
  await expect(restore).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath("확대중-목록-뺀뒤.png"),
  });
  await restore.click();
  await expect(card(page, 2).locator("[data-studio-cart-chip]")).toHaveText(
    "담음",
  );
  // 다시 빼고, 확대를 풀고, 새 문제를 하나 더 잘라 «담고 내보내기» — 뺀 02 는 안 들어간다.
  await panel(page).getByRole("button", { name: "문제 02 빼기" }).click();
  await page.keyboard.press("Escape");
  await expect(panel(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "편집창 축소" })).toBeVisible();
  await page.getByRole("button", { name: "편집창 축소" }).click();
  await stepTab(page, /잘라내기/).click();
  // 키보드 영역 지정 + Enter — 끌기보다 확실하게 한 칸을 더 자른다.
  await page.getByRole("button", { name: "키보드로 영역 지정" }).click();
  await page.getByRole("group", { name: "문제 자르기 영역" }).press("Enter");
  await expect(stepTab(page, /OCR · 디지털화/).locator("b")).toHaveText(
    String(n + 1),
  );
  await stepTab(page, /OCR · 디지털화/).click();
  await expect(addButton(page)).toHaveText(/1문항 담기/);
  await footer(page)
    .getByRole("button", { name: /담고 내보내기/ })
    .click();
  const order = page.getByRole("tabpanel", { name: /문제 순서/ });
  await page.getByRole("tab", { name: /문제 순서/ }).click();
  await expect(order.getByRole("listitem")).toHaveCount(n);
  // 저장소에도 n — 뺀 02 는 없고 새로 자른 것이 있다(자동 저장은 조금 늦게 쓴다).
  await expect.poll(async () => (await savedWorksheet(page)).length).toBe(n);
  await expect(topBadge(page)).toHaveAccessibleName(`담은 문제 ${n}`);
  expect(errors).toEqual([]);
});

test("빼고 → 새로 고침 → 담기 단추가 뺀 것을 안 넣는다 — 뺀 기억은 시험지와 같이 저장된다", async ({
  page,
}, testInfo) => {
  // 원장님 2026-09-21 확정(트랙 44 여쭐 것 3 → 트랙 47). 전에는 뺀 기억이 화면 상태라 새로 고치면 사라져
  // ④ 에서 뺀 작업실 문항이 «N문항 담기»·«담고 내보내기»에 다시 잡혔다.
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const n = await toReview(page);
  await addButton(page).click();
  await expect.poll(() => savedWorksheet(page)).toHaveLength(n);
  const ids = (await savedWorksheet(page)).map((row) => row.id);

  // 목록 × 로 둘째를 뺀다.
  await cartToggle(page).click();
  await panel(page).getByRole("button", { name: "문제 02 빼기" }).click();
  await page.keyboard.press("Escape");
  await expect(card(page, 2).locator("[data-studio-cart-chip]")).toHaveText(
    "뺌",
  );
  await expect(addButton(page)).toHaveText(/담을 문항 없음/);
  // 자동 저장이 담은 목록과 뺀 기억을 같이 쓴다.
  await expect
    .poll(() => savedRemoved(page))
    .toEqual([{ id: ids[1], index: 1 }]);
  expect((await savedWorksheet(page)).map((row) => row.id)).toEqual(
    ids.filter((id) => id !== ids[1]),
  );

  await page.reload();
  await expect(page.getByLabel("문항 검수 이동")).toBeVisible();
  await expect(chips(page)).toHaveCount(n);
  // 새로 고친 뒤에도 «뺌» — «N문항 담기»에 안 잡힌다.
  await expect(card(page, 2).locator("[data-studio-cart-chip]")).toHaveText(
    "뺌",
  );
  await expect(addButton(page)).toHaveText(/담을 문항 없음/);
  await expect(addButton(page)).toBeDisabled();
  await page.screenshot({
    path: testInfo.outputPath("새로고침뒤-뺀것-3단계.png"),
  });
  // 목록에도 흐린 줄 «다시 담기»가 그대로.
  await cartToggle(page).click();
  const removedRow = panel(page).locator('li[data-removed="true"]');
  await expect(removedRow).toHaveCount(1);
  await expect(
    removedRow.getByRole("button", { name: "문제 02 다시 담기" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("새로고침뒤-목록.png"),
  });
  await page.keyboard.press("Escape");

  // 파란 «내보내기»(담을 것이 없으니 «담고»가 빠진다)도 뺀 것을 되넣지 않는다.
  await footer(page)
    .getByRole("button", { name: /^(담고 )?내보내기/ })
    .click();
  const order = page.getByRole("tabpanel", { name: /문제 순서/ });
  await page.getByRole("tab", { name: /문제 순서/ }).click();
  await expect(order.getByRole("listitem")).toHaveCount(n - 1);
  expect((await savedWorksheet(page)).map((row) => row.id)).not.toContain(
    ids[1],
  );
  await expect(topBadge(page)).toHaveAccessibleName(`담은 문제 ${n - 1}`);

  // 다시 담기는 새로 고친 뒤에도 뺀 자리(둘째)로.
  await menu(page, "문제 추출").click();
  await cartToggle(page).click();
  await panel(page).getByRole("button", { name: "문제 02 다시 담기" }).click();
  await expect(card(page, 2).locator("[data-studio-cart-chip]")).toHaveText(
    "담음",
  );
  await expect.poll(() => savedRemoved(page)).toEqual([]);
  await expect
    .poll(async () => (await savedWorksheet(page)).map((row) => row.id))
    .toEqual(ids);
  expect(errors).toEqual([]);
});

test("시안 안 D 와 같은 모양 — 목록·카드 표시의 계산된 값", async ({
  page,
}) => {
  const n = await toReview(page);
  await addButton(page).click();
  await card(page, 1)
    .getByRole("button", { name: "이 문제 검수 완료" })
    .click();
  const measure = () =>
    page.evaluate(() => {
      const style = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const s = getComputedStyle(element);
        return {
          background: s.backgroundColor,
          color: s.color,
          fontSize: s.fontSize,
          fontWeight: s.fontWeight,
          padding: s.padding,
          borderRadius: s.borderRadius,
        };
      };
      const panel = document.querySelector(
        'section[aria-label="담은 문항 목록"]',
      )!;
      const ps = getComputedStyle(panel);
      const row = panel.querySelector("li")!;
      return {
        panel: {
          width: Math.round(panel.getBoundingClientRect().width),
          borderRadius: ps.borderRadius,
          boxShadow: ps.boxShadow,
          borderColor: ps.borderTopColor,
        },
        rowGrid: getComputedStyle(row).gridTemplateColumns.split(" ")[0],
        rowMinHeight: getComputedStyle(row).minHeight,
        heading: style('section[aria-label="담은 문항 목록"] h3'),
      };
    });
  await cartToggle(page).click();
  const product = await measure();
  const productChip = await card(page, 1)
    .locator("[data-studio-cart-chip]")
    .evaluate((element) => {
      const s = getComputedStyle(element);
      return {
        background: s.backgroundColor,
        color: s.color,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        padding: s.padding,
        borderRadius: s.borderRadius,
      };
    });
  const productSource = await panel(page)
    .locator("li")
    .first()
    .locator("span")
    .nth(1)
    .evaluate((element) => getComputedStyle(element).fontSize);

  await page.goto("/wire.html?plan=D&open=1&at=foot");
  const wire = await measure();
  const wireChip = await page
    .locator(".wireChip")
    .first()
    .evaluate((element) => {
      const s = getComputedStyle(element);
      return {
        background: s.backgroundColor,
        color: s.color,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        padding: s.padding,
        borderRadius: s.borderRadius,
      };
    });
  console.log(
    `[잰 값] ${JSON.stringify({ 자른문항: n, product, wire, productChip, wireChip, productSource })}`,
  );
  expect(product.panel).toEqual(wire.panel);
  expect(product.rowGrid).toBe(wire.rowGrid);
  expect(product.rowMinHeight).toBe(wire.rowMinHeight);
  expect(product.heading).toEqual(wire.heading);
  expect(productChip).toEqual(wireChip);
  // 하나만 다르다 — 출처 딱지는 작업실 글자 바닥(12px)으로 올렸다(시안 11px).
  expect(productSource).toBe("12px");
});

import { expect, test, type Page, type TestInfo } from "@playwright/test";

const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("requestfailed", (request) =>
    errors.push(`${request.url()}: ${request.failure()?.errorText}`),
  );
});
test.afterEach(async ({ page }) => {
  expect(
    browserErrors.get(page),
    "browser exceptions, console errors and failed resources",
  ).toEqual([]);
  await expect(
    page.locator("vite-error-overlay, [data-nextjs-dialog]"),
  ).toHaveCount(0);
});

async function capture(page: Page, info: TestInfo, name: string) {
  await expect
    .poll(
      () =>
        page.evaluate(() => ({
          document: document.documentElement.scrollWidth <= innerWidth,
          body: document.body.scrollWidth <= innerWidth,
        })),
      "no horizontal overflow",
    )
    .toEqual({ document: true, body: true });
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  await info.attach(name, { path, contentType: "image/png" });
  console.log(`SCREENSHOT ${path}`);
}

async function assertRealPlayback(page: Page) {
  const audio = page.locator("audio");
  await expect(audio).toHaveCount(1);
  await expect
    .poll(() =>
      audio.evaluate(
        (element: HTMLAudioElement) =>
          !element.paused &&
          element.currentTime > 0.15 &&
          element.readyState >= 2 &&
          element.error === null,
      ),
    )
    .toBe(true);
}

function assertLockedPayload(value: unknown) {
  if (Array.isArray(value)) {
    value.forEach(assertLockedPayload);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    expect([
      "answerChoiceId",
      "explanation",
      "transcript",
      "spokenText",
      "evidence",
      "sha256",
      "rights",
      "ownerId",
    ]).not.toContain(key);
    assertLockedPayload(child);
  }
}

async function inspect(page: Page) {
  const id = await page
    .locator("main[data-session-id]")
    .getAttribute("data-session-id");
  const response = await page.request.get(`/__harness/student/${id}/inspect`);
  return (await response.json()).data as {
    requests: { kind: string; request: Record<string, unknown> }[];
    attempt: { revision: number; status: string; answers: unknown[] };
    receiptCount: number;
  };
}

async function answer(page: Page, choice: string) {
  await page.getByRole("radio", { name: choice }).check();
  await page.getByRole("button", { name: "답 확정", exact: true }).click();
}

test("teacher selection, actual playback and explicit review toggle", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(page.getByText("개발 검증용 · 저장/인증은 대역")).toBeVisible();
  await expect(page.getByText("듣기 자료를 선택하세요.")).toBeVisible();
  await page.getByRole("button", { name: /^짧은 대화와 안내 중/ }).click();
  await expect(
    page.getByRole("heading", { name: "짧은 대화와 안내", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "교사용 대본" })).toHaveCount(
    0,
  );
  await expect(page.getByText("At nine이라고 답한다.")).toHaveCount(0);
  await capture(page, info, "teacher-selected");

  await page.getByRole("button", { name: "재생", exact: true }).click();
  await assertRealPlayback(page);
  await page.getByRole("button", { name: "일시정지", exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator("audio")
        .evaluate((element: HTMLAudioElement) => element.paused),
    )
    .toBe(true);
  await page.getByRole("slider", { name: "재생 위치" }).fill("6");
  await expect
    .poll(() =>
      page
        .locator("audio")
        .evaluate((element: HTMLAudioElement) => element.currentTime),
    )
    .toBeGreaterThanOrEqual(5.9);
  await page.getByRole("button", { name: "처음부터 재생" }).click();
  await assertRealPlayback(page);
  const retired = await page.locator("audio").elementHandle();
  await page.getByRole("button", { name: "묶음 2 · 1문항" }).click();
  expect(
    await retired!.evaluate(
      (element: HTMLAudioElement) => element.paused && !element.isConnected,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("heading", { name: "3. 안내에 따라 기다릴 곳은?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "대본과 정답 보기" }).click();
  await expect(page.getByRole("region", { name: "교사용 대본" })).toContainText(
    "The bus to Green Park",
  );
  await expect(page.getByText("정답 1 · 정문", { exact: true })).toBeVisible();
  await capture(page, info, "teacher-review");
  await page.getByRole("button", { name: "대본과 정답 닫기" }).click();
  await expect(page.getByRole("region", { name: "교사용 대본" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "대본과 정답 보기" }).click();
  await page
    .getByRole("button", { name: /짧은 대화와 안내 · 다시 듣기 중/ })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "짧은 대화와 안내 · 다시 듣기",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "교사용 대본" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "묶음 1 · 2문항" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("student sound check, one-question flow, frozen retry, server release and submission", async ({
  page,
}, info) => {
  const modules: string[] = [];
  page.on("request", (request) => modules.push(request.url()));
  const initialResponse = page.waitForResponse((response) =>
    response.url().endsWith("/__harness/student"),
  );
  await page.goto("/student.html");
  assertLockedPayload(await (await initialResponse).json());
  await expect(
    page.getByRole("button", { name: "학습 시작", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "소리가 들립니다" }),
  ).toHaveCount(0);
  await expect(page.getByRole("region", { name: /^\d번 문항$/ })).toHaveCount(
    1,
  );
  await expect(
    page.getByText("두 사람이 만날 요일은?", { exact: true }),
  ).toHaveCount(0);
  await capture(page, info, "student-ready");
  await page.getByRole("button", { name: "소리 확인", exact: true }).click();
  await assertRealPlayback(page);
  await page.getByRole("button", { name: "소리가 들립니다" }).click();
  await page.getByRole("button", { name: "학습 시작", exact: true }).click();
  await expect(page.getByText("진행 중", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "재생", exact: true }).click();
  await assertRealPlayback(page);
  await page.getByRole("button", { name: "일시정지", exact: true }).click();
  await capture(page, info, "student-question");

  await answer(page, "1 9시");
  await expect(page.getByRole("alert")).toContainText(
    "답 저장을 확인하지 못했습니다.",
  );
  await expect(page.getByText("0 / 3 답 저장", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "다음 문항" })).toBeDisabled();
  await expect(page.getByRole("radio", { name: "2 10시" })).toBeDisabled();
  const failed = await inspect(page);
  expect(failed.attempt.answers).toHaveLength(1); // Lost acknowledgement after server commit.
  await capture(page, info, "student-answer-retry");
  await page.getByRole("button", { name: "답 저장 다시 시도" }).click();
  await expect(page.getByText("1 / 3 답 저장", { exact: true })).toBeVisible();
  const retried = await inspect(page);
  const answerRequests = retried.requests.filter(
    ({ kind }) => kind === "answer",
  );
  expect(answerRequests).toHaveLength(2);
  expect(answerRequests[1].request).toEqual(answerRequests[0].request);
  expect(retried.attempt.revision).toBe(failed.attempt.revision);
  expect(retried.receiptCount).toBe(failed.receiptCount);
  expect(retried.attempt.answers).toHaveLength(1);
  await expect(page.getByRole("region", { name: "대본과 해설" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "서버 공개 상태 새로 확인" }).click();
  await expect(page.getByRole("region", { name: "대본과 해설" })).toHaveCount(
    0,
  ); // One answer does not release a two-question unit.

  await page.getByRole("button", { name: "다음 문항" }).click();
  await expect(page.getByRole("region", { name: /^\d번 문항$/ })).toHaveCount(
    1,
  );
  await expect(
    page.getByText("도서관이 여는 시각은?", { exact: true }),
  ).toHaveCount(0);
  await answer(page, "2 토요일");
  await expect(page.getByText("2 / 3 답 저장", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "대본과 해설" })).toHaveCount(
    0,
  );
  // Browser time and acknowledged answers cannot manufacture a released DTO.
  await page.clock.setFixedTime(new Date("2030-01-01T00:00:00Z"));
  await expect(page.getByRole("region", { name: "대본과 해설" })).toHaveCount(
    0,
  );
  const released = page.waitForResponse((response) =>
    response.url().endsWith("/view"),
  );
  await page.getByRole("button", { name: "서버 공개 상태 새로 확인" }).click();
  expect((await (await released).json()).data.groups[0].state).toBe("review");
  await expect(page.getByRole("region", { name: "대본과 해설" })).toContainText(
    "Saturday",
  );
  await capture(page, info, "student-server-review");

  await page.getByRole("button", { name: "다음 문항" }).click();
  await expect(page.getByRole("region", { name: "대본과 해설" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "답안 제출" })).toBeDisabled();
  await answer(page, "1 정문");
  await expect(page.getByText("3 / 3 답 저장", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "답안 제출" }).click();
  await expect(page.getByText("제출 완료", { exact: true })).toBeVisible();
  expect((await inspect(page)).attempt.status).toBe("submitted");
  await expect(page.getByRole("button", { name: "답안 제출" })).toBeDisabled();
  await capture(page, info, "student-submitted");
  expect(
    modules.filter((url) =>
      /fixture-server|englishListeningFixture|ListeningTeacher|\/lib\/english\/listening\//.test(
        url,
      ),
    ),
  ).toEqual([]);
});

test("teacher_device never creates audio or fetches media, including after release", async ({
  page,
}, info) => {
  const mediaRequests: string[] = [];
  page.on("request", (request) => {
    if (
      request.resourceType() === "media" ||
      request.url().includes("/__harness/tone/")
    )
      mediaRequests.push(request.url());
  });
  const response = page.waitForResponse((item) =>
    item.url().endsWith("/__harness/student"),
  );
  await page.goto("/student.html?audio=teacher_device");
  const payload = (await (await response).json()).data;
  assertLockedPayload(payload);
  expect(payload).not.toHaveProperty("media");
  expect(
    payload.view.groups.every((group: object) => !("audio" in group)),
  ).toBe(true);
  await expect(page.locator("audio")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "소리 확인", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText(/교실 스피커에서 선생님이 재생합니다/),
  ).toBeVisible();
  await capture(page, info, "teacher-device-ready");
  await page.getByRole("button", { name: "학습 시작", exact: true }).click();
  await expect(page.getByText("진행 중", { exact: true })).toBeVisible();
  await answer(page, "1 9시");
  await page.getByRole("button", { name: "답 저장 다시 시도" }).click();
  await expect(page.getByText("1 / 3 답 저장", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "다음 문항" }).click();
  await answer(page, "2 토요일");
  await expect(page.getByText("2 / 3 답 저장", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "서버 공개 상태 새로 확인" }).click();
  await expect(page.getByRole("region", { name: "대본과 해설" })).toBeVisible();
  await expect(page.locator("audio, video")).toHaveCount(0);
  await expect(page.getByRole("slider", { name: "재생 위치" })).toHaveCount(0);
  await capture(page, info, "teacher-device-review");
  expect(mediaRequests).toEqual([]);
});

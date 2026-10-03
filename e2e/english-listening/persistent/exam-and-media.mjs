import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";
const artifactBase = pathToFileURL(
  path.resolve(".qa-artifacts/listening-postgres") + path.sep,
);
import { createHash } from "node:crypto";
import { chromium, expect as baseExpect } from "@playwright/test";
const expect = baseExpect.configure({ timeout: 20000 });
const origin = "http://127.0.0.1:4302";
const fixture = JSON.parse(
  readFileSync(new URL("./fixture.json", artifactBase), "utf8"),
);
const saved = JSON.parse(
  readFileSync(new URL("./browser-result.json", artifactBase), "utf8"),
);
const browser = await chromium.launch({ headless: true });
const tc = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
  }),
  sc = await browser.newContext({ viewport: { width: 390, height: 844 } });
const t = await tc.newPage(),
  s = await sc.newPage();
const errors = [];
for (const p of [t, s]) {
  p.setDefaultTimeout(20000);
  p.on("pageerror", (e) => errors.push(e.message));
}
async function login(p, user, password) {
  await p.goto(origin + "/login");
  await p.locator("[name=email]").fill(user);
  await p.locator("[name=password]").fill(password);
  await p.getByRole("button", { name: "로그인", exact: true }).click();
  await p.waitForURL((u) => u.pathname != "/login");
}
async function api(p, path, method = "GET", body) {
  return p.evaluate(
    async ({ path, method, body }) => {
      const r = await fetch(path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = await r.json();
      if (!r.ok)
        throw Error(`${method} ${path} ${r.status} ${JSON.stringify(result)}`);
      return result.data;
    },
    { path, method, body },
  );
}
const tb = "/api/english/listening",
  sb = "/api/english/learn/listening";
async function create(audioSource) {
  const open = Date.now() + 2000;
  const detail = await api(t, tb + "/assignments", "POST", {
    publicationId: saved.publicationId,
    classId: fixture.classId,
    targetStudentIds: [fixture.student.id],
    mode: "exam",
    audioSource,
    opensAt: new Date(open).toISOString(),
    closesAt: new Date(open + 3600000).toISOString(),
    timeLimitSeconds: 600,
    releasePolicy: { kind: "manual" },
  });
  await new Promise((r) => setTimeout(r, Math.max(0, open - Date.now() + 100)));
  return detail.assignment.id;
}
async function mutation(id, action, body = {}) {
  const d = await api(t, `${tb}/assignments/${id}`);
  return api(t, `${tb}/assignments/${id}/${action}`, "POST", {
    expectedRevision: d.assignment.revision,
    ...body,
  });
}
async function start(id) {
  await s.goto(`${origin}/learn/english-listening/${id}`);
  await s.getByRole("button", { name: "소리 확인", exact: true }).click();
  await s.getByRole("button", { name: "소리가 들립니다", exact: true }).click();
  await s.getByRole("button", { name: "평가 시작", exact: true }).click();
  await expect(s.getByText("남은 시간", { exact: false })).toBeVisible();
}
try {
  await login(t, fixture.teacher.email, fixture.teacher.password);
  await login(s, fixture.student.loginId, fixture.student.password);
  const id = await create("student_device");
  await start(id);
  let detail = await api(s, `${sb}/${id}`);
  const questions = detail.view.groups[0].questions;
  expect(JSON.stringify(detail).includes(saved.transcript)).toBe(false);
  await s.getByRole("radio").nth(0).check();
  await s.getByRole("button", { name: "답 저장", exact: true }).click();
  await expect(
    s.getByText("저장 완료 · 제출 전까지 바꿀 수 있습니다.", { exact: true }),
  ).toBeVisible();
  await s.getByRole("radio").nth(1).check();
  await s.getByRole("button", { name: "답 저장", exact: true }).click();
  await expect(
    s.getByText("저장 완료 · 제출 전까지 바꿀 수 있습니다.", { exact: true }),
  ).toBeVisible();
  detail = await api(s, `${sb}/${id}`);
  expect(detail.attempt.firstAnswers).toHaveLength(0);
  expect(detail.attempt.draftAnswers[0].choiceId).toBe(
    questions[0].choices[1].id,
  );
  await s.reload();
  await expect(s.getByRole("radio").nth(1)).toBeChecked();
  for (let i = 1; i < questions.length; i++) {
    await s.getByRole("button", { name: "다음 문항" }).click();
    await s.getByRole("radio").nth(0).check();
    await s.getByRole("button", { name: "답 저장", exact: true }).click();
    await expect(
      s.getByText("저장 완료 · 제출 전까지 바꿀 수 있습니다.", { exact: true }),
    ).toBeVisible();
  }
  await s.getByRole("button", { name: "답안 제출", exact: true }).click();
  await expect(s.getByText("제출 완료", { exact: true }).first()).toBeVisible();
  detail = await api(s, `${sb}/${id}`);
  expect(detail.attempt.firstAnswers).toHaveLength(3);
  expect(JSON.stringify(detail).includes(saved.transcript)).toBe(false);
  await mutation(id, "release");
  await s.reload();
  await expect(s.getByText(saved.transcript, { exact: true })).toBeVisible();
  await s.screenshot({
    path: ".qa-artifacts/listening-postgres/screens/student-exam-released.png",
    fullPage: true,
  });
  const offlineId = await create("student_device");
  await start(offlineId);
  await sc.setOffline(true);
  await expect(
    s.getByRole("alert").filter({ hasText: "연결이 끊겨" }),
  ).toContainText("연결이 끊겨");
  expect(await s.locator("audio").count()).toBe(0);
  await sc.setOffline(false);
  await expect
    .poll(async () => (await api(s, `${sb}/${offlineId}`)).attempt.status)
    .toBe("interrupted");
  const interrupted = await api(s, `${sb}/${offlineId}`);
  await mutation(offlineId, "retry", {
    studentId: fixture.student.id,
    previousAttemptId: interrupted.attempt.id,
    reason: "로컬 연결 중단 검증",
  });
  await s.reload();
  await expect(
    s.getByRole("button", { name: "소리 확인", exact: true }),
  ).toBeVisible();
  const broadcastId = await create("teacher_device");
  await s.goto(`${origin}/learn/english-listening/${broadcastId}`);
  await expect(s.getByText(/내 기기에는 재생 버튼이/)).toBeVisible();
  expect(await s.locator("audio").count()).toBe(0);
  await mutation(broadcastId, "broadcast", { action: "start" });
  await s.reload();
  await s.getByRole("button", { name: "평가 시작", exact: true }).click();
  await expect(s.getByText("남은 시간", { exact: false })).toBeVisible();
  const broadcast = await api(s, `${sb}/${broadcastId}`);
  expect(broadcast.attempt.status).toBe("in_progress");
  expect(broadcast.media).toBeUndefined();
  expect(await s.locator("audio").count()).toBe(0);
  await mutation(broadcastId, "broadcast", { action: "interrupt" });
  expect((await api(s, `${sb}/${broadcastId}`)).attempt.status).toBe(
    "interrupted",
  );
  // Decode a real MP3 through the actual Next route and verify protected PCM range transport.
  const bytes = readFileSync(
    "src/__tests__/fixtures/english-listening/tone.mp3",
  );
  const hash = createHash("sha256").update(bytes).digest("hex");
  let receipt = await api(t, `${tb}/sets/${saved.setId}/media`, "POST", {
    totalBytes: bytes.length,
    mimeType: "audio/mpeg",
    expectedSha256: hash,
  });
  const asset = `${tb}/sets/${saved.setId}/media/${receipt.assetId}`;
  receipt = await t.evaluate(
    async ({ path, bytes }) => {
      const r = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: new Uint8Array(bytes),
      });
      if (!r.ok) throw Error("chunk " + r.status);
      return (await r.json()).data;
    },
    {
      path: `${asset}/chunks?expectedRevision=${receipt.revision}&offset=0&byteLength=${bytes.length}&sha256=${hash}`,
      bytes: Array.from(bytes),
    },
  );
  const completion = await api(t, `${asset}/complete`, "POST", {
    expectedRevision: receipt.revision,
  });
  expect(completion.state).toBe("ready");
  expect(completion.sha256).not.toBe(hash);
  const range = await tc.request.get(origin + asset, {
    headers: { Range: "bytes=0-43" },
  });
  expect(range.status()).toBe(206);
  expect((await range.body()).subarray(0, 4).toString()).toBe("RIFF");
  const denied = await sc.request.get(
    `${origin}${sb}/${id}/media/${receipt.assetId}`,
    { headers: { Range: "bytes=0-43" } },
  );
  expect([403, 404]).toContain(denied.status());
  // Previously valid media must be denied on the next range after assignment cancellation.
  const media = Object.values(
    (await api(s, `${sb}/${id}`)).media.urlsByAssetId,
  )[0];
  await mutation(id, "cancel");
  expect([403, 404]).toContain(
    (
      await sc.request.get(origin + media, { headers: { Range: "bytes=0-43" } })
    ).status(),
  );
  for (const path of [
    `/api/students/${fixture.student.id}`,
    `/api/classes/${fixture.classId}`,
  ]) {
    const res = await tc.request.delete(origin + path, {
      headers: { Origin: origin },
    });
    expect(res.status()).toBe(409);
    expect((await res.json()).error.code).toBe("RECORDS_RETAINED");
  }
  expect(errors).toEqual([]);
  const result = {
    ok: true,
    checks: [
      "editable-exam-drafts-reload-submit",
      "manual-release",
      "offline-interruption-authorized-retry",
      "teacher-broadcast-no-student-audio",
      "real-next-mp3-decode-range",
      "unpublished-asset-denied",
      "revoked-next-range-denied",
      "retained-roster409",
    ],
    pageErrors: errors,
  };
  writeFileSync(
    new URL("./extra-result.json", artifactBase),
    JSON.stringify(result),
  );
  console.log(JSON.stringify(result));
} catch (e) {
  await s
    .screenshot({
      path: ".qa-artifacts/listening-postgres/screens/extra-failure.png",
      fullPage: true,
    })
    .catch(() => {});
  console.error(e.stack);
  process.exitCode = 1;
} finally {
  await browser.close();
}

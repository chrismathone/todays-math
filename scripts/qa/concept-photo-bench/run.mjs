import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { callCodex } from "./codex.mjs";

// Deliberately never interpolate expected labels or answer keys into model prompts.
export function photoPrompt(item) {
  return `당신의 작업은 시험지 사진에서 사람이 표시한 답을 읽는 것입니다. 문제를 풀거나 정답으로 보정하지 마세요.
대상 문항: ${item.questionNumber}번. 사진 안의 다른 문항이나 옆 문항 필기는 무시하세요.
인쇄된 동그라미 번호는 답 표시가 아닙니다. 연필/펜으로 추가한 체크, 원, 손글씨만 관찰하세요.
빨간 채점 표시로 정오를 추측하지 마세요. 지워진 흔적과 명확한 최종 체크는 구별하세요.
선택지 체크와 손글씨 최종 답이 서로 다르거나, 복수 답 중 최종 선택을 확정할 수 없으면 status=review입니다.
이 경우 읽을 수 있는 체크 번호는 choice에 그대로 보존하세요. 체크가 없거나 모호하면 choice=null입니다.
전혀 답을 쓰지 않았으면 status=blank입니다. 판독 불가는 review이며 blank와 다릅니다.
사진에 보이는 것만 읽고 추정한 정답은 절대 채우지 마세요. 도구/웹검색은 사용하지 마세요. 이미지는 이 요청에 첨부되어 있습니다.
설명문이나 마크다운 없이 JSON 객체 하나만 출력하세요:
{"status":"answered|blank|review","choice":1부터5정수또는null,"writtenAnswer":"손글씨 최종 답 원문 또는 빈 문자열","evidence":"답 표시와 판독 근거 1~2문장"}`;
}

function parseReply(text) {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/, "")
    .replace(/\s*```$/, "");
  const start = stripped.indexOf("{"),
    end = stripped.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("No JSON object");
  const answer = JSON.parse(stripped.slice(start, end + 1));
  if (!["answered", "blank", "review"].includes(answer.status))
    throw new Error("Invalid status");
  if (
    answer.choice !== null &&
    (!Number.isInteger(answer.choice) || answer.choice < 1 || answer.choice > 5)
  )
    throw new Error("Invalid choice");
  if (
    typeof answer.writtenAnswer !== "string" ||
    typeof answer.evidence !== "string"
  )
    throw new Error("Missing transcription or evidence");
  return answer;
}

async function main() {
  const [manifestArg, outputArg, model, effort = "medium", limitArg] =
    process.argv.slice(2);
  if (!manifestArg || !outputArg || !model)
    throw new Error(
      "Usage: node run.mjs manifest.json output-dir model [effort] [limit]",
    );
  const manifest = JSON.parse(await readFile(manifestArg, "utf8"));
  const output = path.resolve(outputArg);
  await mkdir(output, { recursive: true });
  const cases = limitArg
    ? manifest.cases.slice(0, Number(limitArg))
    : manifest.cases;
  const results = [];
  for (const item of cases) {
    if (
      !/^[a-zA-Z0-9_-]+$/.test(item.id) ||
      !/^[a-zA-Z0-9._-]+$/.test(model) ||
      !/^[a-zA-Z0-9_-]+$/.test(effort)
    )
      throw new Error("Unsafe case, model or effort identifier");
    const label = `${model}-${effort}-${item.id}`;
    const resultPath = path.join(output, `${label}.json`);
    const prompt = photoPrompt(item);
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          model,
          effort,
          prompt,
          expected: item.expected,
          answerKey: item.answerKey,
        }),
      )
      .update(await readFile(item.imagePath))
      .digest("hex");
    let old;
    try {
      old = JSON.parse(await readFile(resultPath, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (old) {
      if (old.fingerprint !== fingerprint)
        throw new Error(
          `Cached inputs differ or lack a fingerprint: ${label}. Use a fresh output directory.`,
        );
      results.push(old);
      console.log(`cached ${label}`);
      continue;
    }
    const workDir = path.join(output, "isolated", label);
    const outputPrefix = path.join(output, "raw", label);
    const startedAt = new Date().toISOString();
    let result;
    try {
      const call = model.startsWith("gemini-")
        ? (await import("./agy.mjs")).callAgy
        : callCodex;
      const response = await call({
        model,
        effort,
        prompt,
        imagePath: item.imagePath,
        workDir,
        outputPrefix,
        timeoutMs: 180000,
      });
      const answer = parseReply(response.text);
      result = {
        id: item.id,
        category: item.category,
        model,
        effort,
        startedAt,
        ...response,
        answer,
        expected: item.expected,
        statusMatch: answer.status === item.expected.status,
        choiceMatch: answer.choice === item.expected.choice,
        exactMatch:
          answer.status === item.expected.status &&
          answer.choice === item.expected.choice,
        // This is deterministic choice checking, not an evaluation of reasoning or partial credit.
        derivedGrade:
          answer.status === "answered"
            ? answer.choice === null
              ? "review"
              : answer.choice === item.answerKey
                ? "correct"
                : "incorrect"
            : answer.status,
      };
      console.log(
        `${label}: ${result.exactMatch ? "match" : "MISMATCH"} ${response.ms}ms status=${answer.status} choice=${answer.choice}`,
      );
    } catch (error) {
      result = {
        id: item.id,
        category: item.category,
        model,
        effort,
        startedAt,
        error: String(error),
        exactMatch: false,
      };
      console.log(`${label}: ERROR ${String(error)}`);
    }
    result.fingerprint = fingerprint;
    await writeFile(resultPath, JSON.stringify(result, null, 2));
    results.push(result);
  }
  const successful = results.filter((r) => !r.error);
  const ms = successful.map((r) => r.ms).sort((a, b) => a - b);
  const summary = {
    model,
    effort,
    total: results.length,
    completed: successful.length,
    matches: successful.filter((r) => r.exactMatch).length,
    medianMs: ms.length
      ? (ms[Math.floor((ms.length - 1) / 2)] + ms[Math.floor(ms.length / 2)]) /
        2
      : null,
    meanMs: ms.length
      ? Math.round(ms.reduce((a, b) => a + b, 0) / ms.length)
      : null,
    limitations: [
      "Convenience sample; labels reviewed by assistant, not independently teacher-validated.",
      "Measures selected-answer reading and abstention; does not establish free-response or partial-credit grading accuracy.",
      "Subscription CLI agent overhead and tools differ by provider. Timing and usage are not direct API measurements.",
      "No automatic retry of a failed case; use a fresh output directory for an independent run.",
    ],
    results,
  };
  await writeFile(
    path.join(output, `summary-${model}-${effort}.json`),
    JSON.stringify(summary, null, 2),
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

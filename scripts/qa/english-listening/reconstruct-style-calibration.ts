/** Positive controls from actual original questions; no source answers enter Jev state. */
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import dotenv from "dotenv";
import { z } from "zod";
import {
  buildListeningStyleChecks,
  listeningStyleTemplateSchema,
  selectListeningStyleTemplates,
  readListeningStyleJudgment,
  type ListeningStyleTemplate,
} from "../../../src/lib/english/listening/reconstructionStyle";

async function main() {
  const { values } = parseArgs({
    options: {
      templates: { type: "string" },
      output: { type: "string" },
      "env-file": { type: "string" },
      execute: { type: "boolean", default: false },
      negatives: { type: "boolean", default: false },
      choice: { type: "boolean", default: false },
    },
    strict: true,
  });
  if (!values.templates || !values.output || !values["env-file"])
    throw new Error("--templates, --output and --env-file required");
  const templates = z
    .array(listeningStyleTemplateSchema)
    .parse(JSON.parse(await fs.readFile(values.templates, "utf8")));
  const env = dotenv.parse(await fs.readFile(values["env-file"]));
  if (!env.TYPESAFE_API_KEY)
    throw new Error("TypeSafe server credential missing");
  const output = path.resolve(values.output);
  const write = async (name: string, value: unknown) => {
    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(
      path.join(output, name),
      JSON.stringify(value, null, 2),
      { encoding: "utf8", flag: "wx" },
    );
  };
  const results = [];
  for (const level of ["중1", "중2", "중3", "고1", "고2", "고3"]) {
    const controls = ["detail", "number", "purpose", "reply"]
      .map((type) =>
        templates.find(
          (template) =>
            template.level === level && template.questionType === type,
          // Positive controls need their actual Korean instruction, not a detached speaker blank.
        ),
      )
      .filter(
        (template): template is ListeningStyleTemplate =>
          template !== undefined && /[가-힣]/.test(template.prompt),
      );
    const questions = controls.map((template, index) => ({
      sourceNumber: index + 1,
      prompt: template.prompt,
      choices: template.choices,
      questionType: template.questionType,
      correctChoiceOneBased: 1,
      explanation: "Unused synthetic placeholder; original answer omitted",
      evidenceQuotes: ["unused"],
      topics: [],
      keywords: [],
    }));
    const items = await Promise.all(
      controls.map(async (template, index) => {
        const bytes = await fs.readFile(template.originalPreparedPath);
        if (
          createHash("sha256").update(bytes).digest("hex") !==
          template.originalPreparedSha256
        )
          throw new Error("Control original source hash differs");
        const source = z
          .object({
            editableInput: z.object({
              groups: z.array(
                z.object({ transcript: z.object({ text: z.string() }) }),
              ),
            }),
          })
          .parse(JSON.parse(bytes.toString("utf8")));
        return {
          sourceNumber: index + 1,
          transcript: source.editableInput.groups
            .map((group) => group.transcript.text)
            .join("\n"),
        };
      }),
    );
    const bindings = Object.fromEntries(
      controls.map((control, index) => [
        index + 1,
        selectListeningStyleTemplates(
          templates.filter(
            (template) =>
              !(
                template.sourceRecordId === control.sourceRecordId &&
                template.sourceNumber === control.sourceNumber
              ),
          ),
          level,
          questions[index],
        ),
      ]),
    );
    if (values.negatives && questions.length) {
      const base = questions[0],
        refs = bindings[1];
      const negativeQuestions = [
        { ...base, prompt: "What is the conversation mainly about?" },
        {
          ...base,
          questionType: "detail" as const,
          prompt:
            "대화를 듣고, 두 사람이 이야기한 내용으로 가장 적절한 것을 고르시오.",
          choices: [
            "To buy a new bicycle",
            "To return the borrowed book",
            "To sign up for the class",
            "To order a birthday cake",
            "To visit the new museum",
          ],
        },
        {
          ...base,
          questionType: "number" as const,
          prompt: "대화를 듣고, 약속 시각을 고르시오.",
          choices: ["오전", "월요일", "아무 때나 괜찮음", "주말", "30달러"],
        },
        {
          ...base,
          prompt:
            "대화를 듣고, 화자의 인식론적 비결정성에 대한 변증법적 해석으로 가장 적절한 것을 고르시오.",
          choices: [
            "선험적 명제의 통약 불가능성에 관한 인식론적 함의를 정당화한다.",
            "초월론적 주체의 상호 주관적 지향성을 재구성한다.",
            "존재론적 환원의 방법론적 적합성을 비판적으로 논증한다.",
            "변증법적 유물론의 자기 동일성 전제를 해체한다.",
            "논리 실증주의의 검증 원리에 대한 메타 이론적 반론을 제시한다.",
          ],
        },
        {
          ...base,
          questionType: "purpose" as const,
          prompt: "대화를 듣고, 전화를 건 목적으로 가장 적절한 것을 고르시오.",
          choices: [
            "예약하려고",
            "취소하려고",
            "문의하려고",
            "신청하려고",
            "화자가 아픈 고양이를 돌보는 동안 발생한 배송 지연에 대하여 상대방에게 상세한 사유를 설명하고 새로운 배송 일정까지 모두 안내하려고",
          ],
        },
        {
          ...base,
          questionType: "reply" as const,
          prompt:
            "대화를 듣고, 마지막 말에 이어질 응답으로 가장 적절한 것을 고르시오.",
          choices: [
            "Sure, I'd love to.",
            "Yes, I'd like to.",
            "I forgot my wallet.",
            "It tastes sweet.",
            "My birthday is in May.",
          ],
        },
      ];
      for (const candidate of negativeQuestions) {
        const id = questions.length + 1;
        questions.push({ ...candidate, sourceNumber: id });
        items.push({ sourceNumber: id, transcript: "" });
        bindings[id] = refs;
      }
    }
    const checks = buildListeningStyleChecks(
      items,
      questions,
      level,
      bindings,
      "2",
    );
    const request = {
      model: "jev-latest",
      state: checks.state,
      questions: values.choice
        ? Object.fromEntries(
            Object.entries(checks.questions).map(([id, check]) => [
              id,
              {
                type: "choice",
                instructions: check.instructions.replace(
                  "Source answer correctness is checked separately; do not solve the question here.",
                  "Classify this one style property. Answer correctness is checked separately.",
                ),
                criteria: {
                  pass: check.criteria!.true,
                  fail: check.criteria!.false,
                },
              },
            ]),
          )
        : checks.questions,
    };
    const requestHash = createHash("sha256")
      .update(JSON.stringify(request))
      .digest("hex");
    const exists = async (file: string) =>
      fs.access(path.join(output, file)).then(
        () => true,
        () => false,
      );
    if (await exists(`${level}.request.json`)) {
      const cachedRequest = JSON.parse(
        await fs.readFile(path.join(output, `${level}.request.json`), "utf8"),
      );
      if (
        createHash("sha256")
          .update(JSON.stringify(cachedRequest))
          .digest("hex") !== requestHash
      )
        throw new Error("Cached control request differs");
    } else await write(`${level}.request.json`, request);
    if (!values.execute) continue;
    let receipt: { requestHash: string; httpStatus: number; response: unknown };
    if (await exists(`${level}.receipt.json`))
      receipt = JSON.parse(
        await fs.readFile(path.join(output, `${level}.receipt.json`), "utf8"),
      );
    else {
      if (await exists(`${level}.started.json`))
        throw new Error(
          "Prior control attempt has no receipt; no automatic paid retry",
        );
      await write(`${level}.started.json`, {
        requestHash,
        startedAt: new Date().toISOString(),
        automaticRetry: false,
      });
      const response = await fetch("https://api.typesafe.ai/v1/systemone", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.TYPESAFE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        redirect: "error",
        signal: AbortSignal.timeout(45000),
      });
      const raw: unknown = await response.json();
      await write(`${level}.receipt.json`, {
        requestHash,
        checkedAt: new Date().toISOString(),
        httpStatus: response.status,
        response: raw,
      });
      receipt = { requestHash, httpStatus: response.status, response: raw };
    }
    if (receipt.requestHash !== requestHash || receipt.httpStatus !== 200)
      throw new Error(
        `Invalid control receipt/HTTP ${receipt.httpStatus}; no automatic retry`,
      );
    const parsed = z
      .object({
        model: z.string(),
        answers: z.record(z.string(), z.unknown()),
        usage: z.object({
          input_tokens: z.number(),
          output_tokens: z.number(),
        }),
      })
      .parse(receipt.response);
    const readJudgment = (id: number) => {
      if (!values.choice)
        return readListeningStyleJudgment(parsed.answers, id, "2");
      const dimensions = [
        "taskStyle",
        "choiceStyle",
        "gradeAppropriate",
        "parallelDistractors",
      ];
      const scored = dimensions.map((dimension) =>
        z
          .object({
            type: z.literal("choice"),
            choice: z.enum(["pass", "fail"]),
            confidence: z.number().min(0).max(1),
            probabilities: z.strictObject({
              pass: z.number().min(0).max(1),
              fail: z.number().min(0).max(1),
            }),
          })
          .safeParse(parsed.answers[`style_${dimension}_${id}`]),
      );
      if (scored.some((value) => !value.success)) return null;
      return Object.fromEntries(
        scored.map((value, index) => [
          dimensions[index],
          value.success
            ? Math.min(value.data.confidence, value.data.probabilities.pass)
            : 0,
        ]),
      );
    };
    const row = {
      level,
      actualModel: parsed.model,
      usage: parsed.usage,
      controls: controls.map((template, index) => ({
        template,
        judgment: readJudgment(index + 1),
      })),
      negatives: questions.slice(controls.length).map((candidate) => ({
        candidate: {
          prompt: candidate.prompt,
          choices: candidate.choices,
          questionType: candidate.questionType,
        },
        judgment: readJudgment(candidate.sourceNumber),
      })),
    };
    results.push(row);
    console.log(
      JSON.stringify({
        stage: "official_controls",
        level,
        positiveCount: row.controls.length,
        positivesPassing: row.controls.filter(
          (control) =>
            control.judgment &&
            Object.values(control.judgment).every((value) => value >= 0.9),
        ).length,
        negativesPassing: row.negatives.filter(
          (control) =>
            control.judgment &&
            Object.values(control.judgment).every((value) => value >= 0.9),
        ).length,
      }),
    );
  }
  await write("summary.json", {
    method: "positive_controls_actual_official_originals_no_answers",
    results,
    humanReview: false,
    thresholdsChanged: false,
  });
}
void main().catch((error) => {
  console.error(
    JSON.stringify({
      error:
        error instanceof Error
          ? error.message.slice(0, 1500)
          : "Calibration failed",
    }),
  );
  process.exitCode = 1;
});

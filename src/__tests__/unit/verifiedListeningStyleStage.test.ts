// @vitest-environment node
import { createHash, randomUUID } from "node:crypto";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { makeListeningStyleStageFixture } from "../fixtures/english-listening/styleStage";
import {
  assertVerifiedListeningStyleStage,
  loadVerifiedListeningStyleStage,
} from "../../../scripts/qa/english-listening/verified-listening-style-stage.mts";
const sha = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
const roots: string[] = [];
const json = async (file: string) => JSON.parse(await readFile(file, "utf8"));
const write = async (file: string, value: unknown) => {
  await mkdir(dirname(file), { recursive: true });
  const data = JSON.stringify(value, null, 2);
  await writeFile(file, data);
  return sha(data);
};
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function fixture(
  judgmentVersion: "2" | "4" = "4",
  options: Parameters<typeof makeListeningStyleStageFixture>[1] = {},
) {
  const value = await makeListeningStyleStageFixture(judgmentVersion, options);
  roots.push(value.root);
  return value;
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
type RawGeneration = { questions: Record<string, unknown>[] };
async function rewriteGeneration(
  f: Fixture,
  change: (raw: RawGeneration) => void,
) {
  const reference = f.audit.receipts[0],
    request = await json(reference.requestPath),
    saved = await json(reference.receiptPath),
    raw = JSON.parse(saved.response.choices[0].message.content);
  change(raw);
  saved.response.choices[0].message.content = JSON.stringify(raw);
  await f.rewriteReceipt(0, request, saved);
}

describe("trusted offline listening style stage", () => {
  it("replays exact structural recovery without changing immutable receipts or held edits", async () => {
    const f = await fixture("4", { generationRecovery: true }),
      reference = f.audit.receipts[0],
      before = await readFile(reference.receiptPath),
      raw = JSON.parse(
        (await json(reference.receiptPath)).response.choices[0].message.content,
      ),
      loaded = await loadVerifiedListeningStyleStage(f.file, f.root);
    expect(raw.questions[0].questionType).toBe("reason");
    expect(raw.questions[0].sourceRecordId).toBe(loaded.sourceRecordId);
    expect(raw.questions[0].level).toBe("중3");
    expect(loaded.audit.generationNormalization).toEqual({
      version: "structural-metadata-v1",
      steps: [1, 3].flatMap((sourceNumber) => [
        {
          sourceNumber,
          field: "sourceRecordId",
          from: loaded.sourceRecordId,
          to: null,
        },
        { sourceNumber, field: "level", from: "중3", to: null },
        { sourceNumber, field: "questionType", from: "reason", to: "detail" },
      ]),
    });
    expect(loaded.audit.eligibleQuestionIds).toHaveLength(2);
    expect(
      loaded.staged.editableInput.groups[0].questions[0].metadata!.questionType,
    ).toBe("detail");
    expect(loaded.staged.editableInput.groups[0].questions[2]).toEqual(
      loaded.baseline.editableInput.groups[0].questions[2],
    );
    expect(
      loaded.staged.editableInput.groups[0].questions[1].metadata!
        .reconstruction!.verification,
    ).toBe("needs_review");
    expect(await readFile(reference.receiptPath)).toEqual(before);
    expect(sha(before)).toBe(reference.receiptSha256);
    assertVerifiedListeningStyleStage(loaded);
  });

  it("accepts raw current stages with an absent or explicitly empty normalization declaration", async () => {
    const f = await fixture();
    expect(
      (await loadVerifiedListeningStyleStage(f.file, f.root)).audit
        .generationNormalization,
    ).toBeUndefined();
    f.audit.generationNormalization = {
      version: "structural-metadata-v1",
      steps: [],
    };
    await f.saveStage();
    const loaded = await loadVerifiedListeningStyleStage(f.file, f.root);
    expect(loaded.audit.generationNormalization!.steps).toEqual([]);
    assertVerifiedListeningStyleStage(loaded);
  });

  it.each([
    "missing declaration",
    "missing version",
    "unknown version",
    "erased steps",
    "missing step",
    "invented step",
    "duplicate step",
    "reordered steps",
    "wrong ordinal",
    "wrong from",
    "wrong to",
    "unknown field",
    "extra field",
    "noninteger ordinal",
  ])("rejects recovery proof %s before candidate checks", async (change) => {
    const f = await fixture("4", { generationRecovery: true }),
      stage = await json(f.file),
      audit = stage.verification.styleRevision,
      normalization = audit.generationNormalization;
    if (change === "missing declaration") delete audit.generationNormalization;
    if (change === "missing version") delete normalization.version;
    if (change === "unknown version")
      normalization.version = "structural-metadata-v3";
    if (change === "erased steps") normalization.steps = [];
    if (change === "missing step") normalization.steps.pop();
    if (change === "invented step")
      normalization.steps.push({
        sourceNumber: 2,
        field: "questionType",
        from: "reason",
        to: "detail",
      });
    if (change === "duplicate step")
      normalization.steps.push(normalization.steps[0]);
    if (change === "reordered steps") normalization.steps.reverse();
    if (change === "wrong ordinal") normalization.steps[0].sourceNumber = 2;
    if (change === "wrong from")
      normalization.steps[0].from = "ebs-middle-3-2016-2";
    if (change === "wrong to") normalization.steps[0].to = "";
    if (change === "unknown field") normalization.steps[0].field = "prompt";
    if (change === "extra field") normalization.steps[0].text = "invented";
    if (change === "noninteger ordinal")
      normalization.steps[0].sourceNumber = 1.5;
    await write(f.file, stage);
    await expect(
      loadVerifiedListeningStyleStage(f.file, f.root),
    ).rejects.toThrow(/normalization|generationNormalization/);
  });

  it.each([
    "wrong sourceRecordId",
    "wrong level",
    "null sourceRecordId",
    "numeric level",
    "action alias",
    "unknown alias",
    "already normalized alias",
    "erased raw metadata",
    "unknown question field",
    "unknown top-level field",
  ])(
    "rejects raw recovery %s even after receipt hashes are rebuilt",
    async (change) => {
      const f = await fixture("4", { generationRecovery: true });
      await rewriteGeneration(f, (raw) => {
        const question = raw.questions[0];
        if (change === "wrong sourceRecordId")
          question.sourceRecordId = "ebs-middle-3-2016-2";
        if (change === "wrong level") question.level = "중2";
        if (change === "null sourceRecordId") question.sourceRecordId = null;
        if (change === "numeric level") question.level = 3;
        if (change === "action alias") question.questionType = "action";
        if (change === "unknown alias") question.questionType = "reasoning";
        if (change === "already normalized alias")
          question.questionType = "detail";
        if (change === "erased raw metadata") delete question.sourceRecordId;
        if (change === "unknown question field")
          question.officialQuestionNumber = 1;
        if (change === "unknown top-level field")
          Object.assign(raw, { recovered: true });
      });
      await expect(
        loadVerifiedListeningStyleStage(f.file, f.root),
      ).rejects.toThrow();
    },
  );

  it.each([
    "prompt",
    "choice",
    "explanation",
    "answer",
    "quote",
    "segments",
    "order",
    "missing",
    "duplicate",
  ])(
    "rejects a %s change hidden in a structural recovery, including held candidates",
    async (change) => {
      const f = await fixture("4", { generationRecovery: true });
      await rewriteGeneration(f, (raw) => {
        const held = raw.questions[2];
        if (change === "prompt")
          held.prompt = "대화를 듣고, 구입할 물건으로 적절한 것을 고르시오.";
        if (change === "choice") (held.choices as string[])[0] = "노란 시계";
        if (change === "explanation")
          held.explanation = "네모난 시계를 살 예정이라고 했다.";
        if (change === "answer") held.correctChoiceOneBased = 1;
        if (change === "quote")
          held.evidenceQuotes = ["I will buy a yellow watch."];
        if (change === "segments") held.sourceSegmentIds = [1];
        if (change === "order") raw.questions.reverse();
        if (change === "missing") raw.questions.pop();
        if (change === "duplicate") raw.questions[4] = raw.questions[3];
      });
      await expect(
        loadVerifiedListeningStyleStage(f.file, f.root),
      ).rejects.toThrow();
    },
  );

  it.each(["topics", "keywords"] as const)(
    "rejects recovery staging %s that is not derived from the exact eligible patch",
    async (field) => {
      const f = await fixture("4", { generationRecovery: true });
      f.staged.editableInput.groups[0].questions[0].metadata![field] = [
        "changed",
      ];
      await f.saveStage();
      await expect(
        loadVerifiedListeningStyleStage(f.file, f.root),
      ).rejects.toThrow(/editable|patch/);
    },
  );

  it("rejects invented proof on an unchanged raw generation and recovery on legacy audits", async () => {
    const plain = await fixture();
    plain.audit.generationNormalization = {
      version: "structural-metadata-v1",
      steps: [
        {
          sourceNumber: 1,
          field: "questionType",
          from: "reason",
          to: "detail",
        },
      ],
    };
    await plain.saveStage();
    await expect(
      loadVerifiedListeningStyleStage(plain.file, plain.root),
    ).rejects.toThrow(/normalization/);
    const recovered = await fixture("4", { generationRecovery: true });
    recovered.audit.version = "korean-official-style-v3-20261005";
    await recovered.saveStage();
    await expect(
      loadVerifiedListeningStyleStage(recovered.file, recovered.root),
    ).rejects.toThrow(/current guarded/);
    delete recovered.audit.generationNormalization;
    await recovered.saveStage();
    await expect(
      loadVerifiedListeningStyleStage(recovered.file, recovered.root),
    ).rejects.toThrow();
  });

  it("keeps semantic holds and rejects semantic warning erasure after normalization", async () => {
    const f = await fixture("4", {
        generationRecovery: true,
        semanticCase: "deadline_drift",
      }),
      loaded = await loadVerifiedListeningStyleStage(f.file, f.root);
    expect(loaded.audit.questionVerdicts[0].semanticWarnings).toEqual([
      "dropped_deadline",
    ]);
    expect(loaded.audit.questionVerdicts[0].eligible).toBe(false);
    expect(loaded.staged.editableInput.groups[0].questions[0]).toEqual(
      loaded.baseline.editableInput.groups[0].questions[0],
    );
    f.audit.questionVerdicts[0].semanticWarnings = [];
    f.audit.questionVerdicts[0].groundingJudgment!.choice = "1";
    f.audit.questionVerdicts[0].answerVerified = false;
    await f.saveStage();
    await expect(
      loadVerifiedListeningStyleStage(f.file, f.root),
    ).rejects.toThrow(/semantic warnings/);
  });

  it("replays explicit v2 reason and action aliases with exact ordered identity removals", async () => {
    const f = await fixture("4", {
        generationRecovery: true,
        generationRecoveryVersion: "structural-metadata-v2",
      }),
      before = await readFile(f.audit.receipts[0].receiptPath),
      loaded = await loadVerifiedListeningStyleStage(f.file, f.root);
    expect(loaded.audit.generationNormalization).toEqual({
      version: "structural-metadata-v2",
      steps: [1, 3].flatMap((sourceNumber) => [
        {
          sourceNumber,
          field: "sourceRecordId",
          from: loaded.sourceRecordId,
          to: null,
        },
        { sourceNumber, field: "level", from: "중3", to: null },
        {
          sourceNumber,
          field: "questionType",
          from: sourceNumber === 3 ? "action" : "reason",
          to: "detail",
        },
      ]),
    });
    expect(loaded.audit.eligibleQuestionIds).toHaveLength(2);
    expect(loaded.staged.editableInput.groups[0].questions[2]).toEqual(
      loaded.baseline.editableInput.groups[0].questions[2],
    );
    expect(await readFile(f.audit.receipts[0].receiptPath)).toEqual(before);
    assertVerifiedListeningStyleStage(loaded);
  });

  it.each([
    "downgraded version",
    "unknown version",
    "missing declaration",
    "wrong alias",
    "erased action step",
    "invented removal",
    "reordered steps",
  ])("rejects explicit v2 recovery with %s", async (change) => {
    const f = await fixture("4", {
        generationRecovery: true,
        generationRecoveryVersion: "structural-metadata-v2",
      }),
      stage = await json(f.file),
      audit = stage.verification.styleRevision,
      normalization = audit.generationNormalization;
    if (change === "downgraded version")
      normalization.version = "structural-metadata-v1";
    if (change === "unknown version")
      normalization.version = "structural-metadata-v3";
    if (change === "missing declaration") delete audit.generationNormalization;
    if (change === "wrong alias") normalization.steps[5].from = "reason";
    if (change === "erased action step") normalization.steps.pop();
    if (change === "invented removal")
      normalization.steps.push({
        sourceNumber: 2,
        field: "level",
        from: "중3",
        to: null,
      });
    if (change === "reordered steps") normalization.steps.reverse();
    await write(f.file, stage);
    await expect(
      loadVerifiedListeningStyleStage(f.file, f.root),
    ).rejects.toThrow();
  });

  it.each([
    "unknown alias",
    "mismatched identity",
    "prompt",
    "answer",
    "quote",
  ])(
    "rejects v2 raw %s changes with rebuilt receipt hashes",
    async (change) => {
      const f = await fixture("4", {
        generationRecovery: true,
        generationRecoveryVersion: "structural-metadata-v2",
      });
      await rewriteGeneration(f, (raw) => {
        const question = raw.questions[2];
        if (change === "unknown alias") question.questionType = "intent";
        if (change === "mismatched identity") question.level = "중1";
        if (change === "prompt")
          question.prompt =
            "대화를 듣고, 구입할 물건으로 적절한 것을 고르시오.";
        if (change === "answer") question.correctChoiceOneBased = 1;
        if (change === "quote")
          question.evidenceQuotes = ["I will buy a yellow watch."];
      });
      await expect(
        loadVerifiedListeningStyleStage(f.file, f.root),
      ).rejects.toThrow();
    },
  );

  it("records deadline drift and holds it despite strong independent judgments", async () => {
    const f = await fixture("4", { semanticCase: "deadline_drift" }),
      loaded = await loadVerifiedListeningStyleStage(f.file, f.root);
    expect(loaded.audit.questionVerdicts[0].answerVerified).toBe(true);
    expect(loaded.audit.questionVerdicts[0].styleVerified).toBe(true);
    expect(loaded.audit.questionVerdicts[0].semanticWarnings).toEqual([
      "dropped_deadline",
    ]);
    expect(loaded.audit.questionVerdicts[0].eligible).toBe(false);
    expect(loaded.staged.editableInput.groups[0].questions[0]).toEqual(
      loaded.baseline.editableInput.groups[0].questions[0],
    );
    expect(loaded.adoptionEligible).toBe(true);
    assertVerifiedListeningStyleStage(loaded);
  });

  it("accepts a preserved deadline and rejects an erased declared warning even on a held candidate", async () => {
    const safe = await fixture("4", { semanticCase: "deadline_preserved" }),
      loaded = await loadVerifiedListeningStyleStage(safe.file, safe.root);
    expect(loaded.audit.questionVerdicts[0].semanticWarnings).toEqual([]);
    expect(loaded.audit.questionVerdicts[0].eligible).toBe(true);
    const unsafe = await fixture("4", { semanticCase: "deadline_drift" });
    unsafe.audit.questionVerdicts[0].semanticWarnings = [];
    // Existing wrong answer declaration keeps the candidate held, so schema gates
    // alone still agree; the loader must independently recover the warning.
    unsafe.audit.questionVerdicts[0].groundingJudgment!.choice = "1";
    unsafe.audit.questionVerdicts[0].answerVerified = false;
    await unsafe.saveStage();
    await expect(
      loadVerifiedListeningStyleStage(unsafe.file, unsafe.root),
    ).rejects.toThrow(/semantic warnings/);
  });

  it("rejects invented semantic warnings and a warning-based eligibility bypass", async () => {
    const safe = await fixture();
    safe.audit.questionVerdicts[3].semanticWarnings = ["dropped_deadline"];
    await safe.saveStage();
    await expect(
      loadVerifiedListeningStyleStage(safe.file, safe.root),
    ).rejects.toThrow(/semantic warnings/);
    const unsafe = await fixture("4", { semanticCase: "deadline_drift" });
    unsafe.audit.questionVerdicts[0].semanticWarnings = [];
    unsafe.audit.questionVerdicts[0].eligible = true;
    unsafe.audit.questionVerdicts[0].verification = "ai_verified";
    unsafe.audit.eligibleQuestionIds.unshift(
      unsafe.audit.questionVerdicts[0].questionId,
    );
    unsafe.audit.needsReviewQuestionIds.shift();
    await unsafe.saveStage();
    await expect(
      loadVerifiedListeningStyleStage(unsafe.file, unsafe.root),
    ).rejects.toThrow(/semantic warnings|Semantic drift/);
  });

  it("replays legacy receipts read-only and refuses their proof for adoption", async () => {
    for (const legacy of [
      await fixture("2"),
      await fixture("4", { legacy: true }),
    ]) {
      const loaded = await loadVerifiedListeningStyleStage(
        legacy.file,
        legacy.root,
      );
      expect(loaded.adoptionEligible).toBe(false);
      expect(() => assertVerifiedListeningStyleStage(loaded)).toThrow(
        /semantic guard/,
      );
    }
  });

  it("rejects a missing current warning field and an adoption downgrade to a legacy version", async () => {
    const missing = await fixture(),
      payload = await json(missing.file);
    delete payload.verification.styleRevision.questionVerdicts[0]
      .semanticWarnings;
    await write(missing.file, payload);
    await expect(
      loadVerifiedListeningStyleStage(missing.file, missing.root),
    ).rejects.toThrow(/semantic warnings/);
    const downgrade = await fixture();
    downgrade.audit.version = "korean-official-style-v3-20261005";
    await downgrade.saveStage();
    const loaded = await loadVerifiedListeningStyleStage(
      downgrade.file,
      downgrade.root,
    );
    expect(() => assertVerifiedListeningStyleStage(loaded)).toThrow(
      /semantic guard/,
    );
  });

  it("replays Choice style judgments with the unchanged probability and confidence gate", async () => {
    const f = await fixture("4"),
      loaded = await loadVerifiedListeningStyleStage(f.file, f.root);
    expect(loaded.audit.version).toBe("korean-official-style-v4-20261005");
    expect(loaded.audit.judgmentVersion).toBe("4");
    expect(loaded.audit.eligibleQuestionIds).toHaveLength(2);
    expect(loaded.audit.questionVerdicts[3].styleJudgment!.taskStyle).toBe(
      0.89,
    );
    expect(loaded.audit.questionVerdicts[3].eligible).toBe(false);
  });

  it.each([
    "confidence",
    "pass probability",
    "missing pass",
    "extra option",
    "wrong selected choice",
    "invalid sum",
  ])(
    "rejects forged Choice style %s after recomputing receipt hashes",
    async (change) => {
      const f = await fixture("4"),
        ref = f.audit.receipts[2],
        request = await json(ref.requestPath),
        saved = await json(ref.receiptPath),
        answer = saved.response.answers.style_taskStyle_1;
      if (change === "confidence") answer.confidence = 0.89;
      if (change === "pass probability") {
        answer.probabilities.pass = 0.89;
        answer.probabilities.fail = 0.11;
      }
      if (change === "missing pass") delete answer.probabilities.pass;
      if (change === "extra option") answer.probabilities.maybe = 0.01;
      if (change === "wrong selected choice") answer.choice = "fail";
      if (change === "invalid sum") answer.probabilities.fail = 0.5;
      await f.rewriteReceipt(2, request, saved);
      await expect(
        loadVerifiedListeningStyleStage(f.file, f.root),
      ).rejects.toThrow();
    },
  );

  it("supports re-verification with earlier immutable generation and answer receipts", async () => {
    const f = await fixture("4"),
      reusedDirectory = join(
        f.root,
        "style-revision-earlier",
        "audit",
        f.staged.sourceRecordId,
      );
    await mkdir(reusedDirectory, { recursive: true });
    for (const index of [0, 1, 3]) {
      const ref = f.audit.receipts[index],
        stem =
          index === 0 ? "generation" : index === 1 ? "answer-1" : "answer-5";
      const requestPath = join(reusedDirectory, `${stem}.request.json`),
        receiptPath = join(reusedDirectory, `${stem}.receipt.json`);
      await writeFile(requestPath, await readFile(ref.requestPath));
      await writeFile(receiptPath, await readFile(ref.receiptPath));
      ref.requestPath = requestPath;
      ref.receiptPath = receiptPath;
    }
    await f.saveStage();
    await expect(
      loadVerifiedListeningStyleStage(f.file, f.root),
    ).resolves.toBeDefined();
  });

  it("replays receipts across batches, patches only eligible text, and preserves prior review", async () => {
    const f = await fixture(),
      loaded = await loadVerifiedListeningStyleStage(f.file, f.root);
    expect(loaded.audit.eligibleQuestionIds).toHaveLength(2);
    expect(loaded.audit.needsReviewQuestionIds).toHaveLength(3);
    expect(
      loaded.staged.editableInput.groups[0].questions[1].metadata!
        .reconstruction!.verification,
    ).toBe("needs_review");
    expect(loaded.staged.editableInput.groups[0].questions.slice(2)).toEqual(
      loaded.baseline.editableInput.groups[0].questions.slice(2),
    );
    expect(loaded.stageSha256).toBe(sha(await readFile(f.file)));
    expect(() => assertVerifiedListeningStyleStage(loaded)).not.toThrow();
    expect(() =>
      assertVerifiedListeningStyleStage(structuredClone(loaded)),
    ).toThrow(/trusted offline/);
    expect(() =>
      assertVerifiedListeningStyleStage(Object.freeze({ ...loaded })),
    ).toThrow(/trusted offline/);
    expect(
      Object.isFrozen(
        loaded.staged.editableInput.groups[0].questions[0].choices[0],
      ),
    ).toBe(true);
    expect(() => {
      loaded.staged.editableInput.groups[0].questions[0].prompt = "changed";
    }).toThrow();
  });

  const stageTampering: Array<[string, (f: Fixture) => void]> = [
    [
      "eligible prompt",
      (f) => {
        f.staged.editableInput.groups[0].questions[0].prompt += "추가";
      },
    ],
    [
      "ineligible prompt",
      (f) => {
        f.staged.editableInput.groups[0].questions[2].prompt += "추가";
      },
    ],
    [
      "choice identity",
      (f) => {
        f.staged.editableInput.groups[0].questions[0].choices[0].id =
          randomUUID();
      },
    ],
    [
      "answer reference",
      (f) => {
        f.staged.editableInput.groups[0].questions[0].answerChoiceId =
          f.staged.editableInput.groups[0].questions[0].choices[0].id;
      },
    ],
    [
      "question identity",
      (f) => {
        f.staged.editableInput.groups[0].questions[0].id = randomUUID();
      },
    ],
    [
      "question evidence",
      (f) => {
        f.staged.editableInput.groups[0].questions[0].evidence = [
          { startMs: 1, endMs: 2 },
        ];
      },
    ],
    [
      "audio range",
      (f) => {
        f.staged.editableInput.groups[0].questions[0].audioRange = {
          startMs: 1,
          endMs: 2,
        };
      },
    ],
    [
      "rights",
      (f) => {
        f.staged.editableInput.rights.rightsStatus = "approved";
      },
    ],
    [
      "transcript",
      (f) => {
        f.staged.editableInput.groups[0].transcript.text += "invented speech";
      },
    ],
    [
      "keywords",
      (f) => {
        f.staged.editableInput.groups[0].questions[0].metadata!.keywords.push(
          "correct answer",
        );
      },
    ],
    [
      "grounding digest",
      (f) => {
        f.audit.baselineEditableInputSha256 = "0".repeat(64);
      },
    ],
    [
      "verdict order",
      (f) => {
        f.audit.questionVerdicts.reverse();
      },
    ],
    [
      "verdict duplicate",
      (f) => {
        f.audit.questionVerdicts[1] = f.audit.questionVerdicts[0];
      },
    ],
    [
      "verdict missing",
      (f) => {
        f.audit.questionVerdicts.pop();
      },
    ],
    [
      "official ordinal claim",
      (f) => {
        Object.assign(f.audit, { originalQuestionNumbersRecovered: true });
      },
    ],
    [
      "human review claim",
      (f) => {
        Object.assign(f.audit, { humanReviewed: true });
      },
    ],
    [
      "alignment claim",
      (f) => {
        Object.assign(f.audit, { audioAlignmentVerified: true });
      },
    ],
    [
      "prior needs_review upgrade",
      (f) => {
        f.staged.editableInput.groups[0].questions[1].metadata!.reconstruction!.verification =
          "ai_verified";
      },
    ],
    [
      "false source uncertainty",
      (f) => {
        f.audit.questionVerdicts[2].asrUncertain = false;
      },
    ],
    [
      "template prompt",
      (f) => {
        f.audit.questionVerdicts[0].templateBindings[0] = {
          ...f.audit.questionVerdicts[0].templateBindings[0],
          prompt: "invented official prompt",
        };
      },
    ],
    [
      "template page",
      (f) => {
        f.audit.questionVerdicts[0].templateBindings[0] = {
          ...f.audit.questionVerdicts[0].templateBindings[0],
          sourcePage: 9,
        };
      },
    ],
    [
      "template grade",
      (f) => {
        f.audit.questionVerdicts[0].templateBindings[0] = {
          ...f.audit.questionVerdicts[0].templateBindings[0],
          level: "중1",
        };
      },
    ],
    [
      "duplicate template",
      (f) => {
        f.audit.questionVerdicts[0].templateBindings.push(
          f.audit.questionVerdicts[0].templateBindings[0],
        );
      },
    ],
    [
      "missing receipt",
      (f) => {
        f.audit.receipts.pop();
      },
    ],
    [
      "reordered receipts",
      (f) => {
        [f.audit.receipts[1], f.audit.receipts[2]] = [
          f.audit.receipts[2],
          f.audit.receipts[1],
        ];
      },
    ],
    [
      "duplicate receipt",
      (f) => {
        f.audit.receipts[3] = f.audit.receipts[1];
      },
    ],
    [
      "actual model",
      (f) => {
        f.audit.receipts[1].actualModel = "jev-0.0.0";
      },
    ],
    [
      "declared grounding probability",
      (f) => {
        f.audit.questionVerdicts[0].groundingJudgment!.confidence = 0.97;
      },
    ],
    [
      "declared style probability",
      (f) => {
        f.audit.questionVerdicts[0].styleJudgment!.taskStyle = 0.97;
      },
    ],
    [
      "eligible ID list",
      (f) => {
        f.audit.eligibleQuestionIds.reverse();
      },
    ],
  ];
  it.each(stageTampering)(
    "rejects staged tampering: %s",
    async (_name, edit) => {
      const f = await fixture();
      edit(f);
      await f.saveStage();
      await expect(
        loadVerifiedListeningStyleStage(f.file, f.root),
      ).rejects.toThrow();
    },
  );

  it.each([
    "baselinePath",
    "asrPath",
    "audioPath",
    "pdfPath",
    "nativePath",
    "originalPath",
  ] as const)("rehashes actual immutable source bytes: %s", async (key) => {
    const f = await fixture();
    await writeFile(f[key], "tampered actual bytes");
    await expect(
      loadVerifiedListeningStyleStage(f.file, f.root),
    ).rejects.toThrow();
  });

  it("rejects unbound generation response bytes even when candidate sidecar agrees", async () => {
    const f = await fixture(),
      saved = await json(f.audit.receipts[0].receiptPath);
    const candidate = JSON.parse(saved.response.choices[0].message.content);
    candidate.questions[0].prompt += "추가";
    saved.response.choices[0].message.content = JSON.stringify(candidate);
    await write(f.audit.receipts[0].receiptPath, saved);
    await write(join(f.audit.auditDirectory, "all-candidates.json"), candidate);
    await expect(
      loadVerifiedListeningStyleStage(f.file, f.root),
    ).rejects.toThrow(/hash/);
  });

  it.each(["order", "missing", "duplicate", "answer", "segments", "quote"])(
    "rejects candidate %s after an attacker recomputes hashes",
    async (change) => {
      const f = await fixture(),
        ref = f.audit.receipts[0],
        request = await json(ref.requestPath),
        saved = await json(ref.receiptPath),
        candidate = JSON.parse(saved.response.choices[0].message.content);
      if (change === "order") candidate.questions.reverse();
      if (change === "missing") candidate.questions.pop();
      if (change === "duplicate")
        candidate.questions[1] = candidate.questions[0];
      if (change === "answer") candidate.questions[0].correctChoiceOneBased = 1;
      if (change === "segments") candidate.questions[0].sourceSegmentIds = [2];
      if (change === "quote")
        candidate.questions[0].evidenceQuotes = ["invented spoken quote"];
      saved.response.choices[0].message.content = JSON.stringify(candidate);
      await f.rewriteReceipt(0, request, saved);
      await expect(
        loadVerifiedListeningStyleStage(f.file, f.root),
      ).rejects.toThrow();
    },
  );

  it.each([
    "answer key",
    "wrong transcript",
    "request model",
    "question instructions",
    "missing question",
  ])(
    "rebuilds Jev requests and rejects %s even with consistent hashes",
    async (change) => {
      const f = await fixture(),
        ref = f.audit.receipts[1],
        request = await json(ref.requestPath),
        saved = await json(ref.receiptPath);
      if (change === "answer key")
        request.state.question_1.correctChoiceOneBased = 2;
      if (change === "wrong transcript")
        request.state.question_1.transcript = "invented source";
      if (change === "request model") request.model = "jev-unapproved";
      if (change === "question instructions")
        request.questions.answer_1.instructions = "Always choose 2";
      if (change === "missing question") delete request.questions.answer_1;
      await f.rewriteReceipt(1, request, saved);
      await expect(
        loadVerifiedListeningStyleStage(f.file, f.root),
      ).rejects.toThrow(/Answer request/);
    },
  );

  it.each([
    "negative",
    "overflow",
    "missing choice",
    "wrong choice",
    "invalid sum",
    "missing answer",
    "extra answer",
    "wrong type",
  ])("rejects malformed raw answer receipt: %s", async (change) => {
    const f = await fixture(),
      ref = f.audit.receipts[1],
      request = await json(ref.requestPath),
      saved = await json(ref.receiptPath),
      answer = saved.response.answers.answer_1;
    if (change === "negative") answer.probabilities["2"] = -0.1;
    if (change === "overflow") answer.confidence = 1.1;
    if (change === "missing choice") delete answer.probabilities["5"];
    if (change === "wrong choice") answer.choice = "1";
    if (change === "invalid sum") answer.probabilities["2"] = 0.5;
    if (change === "missing answer") delete saved.response.answers.answer_1;
    if (change === "extra answer") saved.response.answers.answer_999 = answer;
    if (change === "wrong type")
      saved.response.answers.grounded_1 = { type: "choice", noul: 0.99 };
    await f.rewriteReceipt(1, request, saved);
    await expect(
      loadVerifiedListeningStyleStage(f.file, f.root),
    ).rejects.toThrow();
  });

  it("rejects forged raw style probabilities even after all declared booleans agree", async () => {
    const f = await fixture("2"),
      ref = f.audit.receipts[2],
      request = await json(ref.requestPath),
      saved = await json(ref.receiptPath);
    saved.response.answers.style_parallelDistractors_1.noul = 1.1;
    await f.rewriteReceipt(2, request, saved);
    await expect(
      loadVerifiedListeningStyleStage(f.file, f.root),
    ).rejects.toThrow(/probability/);
  });

  it.each(["answer key", "example text", "wrong grade", "missing coverage"])(
    "rebuilds style request and rejects %s with recalculated hashes",
    async (change) => {
      const f = await fixture(),
        ref = f.audit.receipts[2],
        request = await json(ref.requestPath),
        saved = await json(ref.receiptPath);
      if (change === "answer key")
        request.state.style_question_1.answerChoiceId =
          f.baseline.editableInput.groups[0].questions[0].answerChoiceId;
      if (change === "example text")
        request.state.style_question_1.actualOfficialExamples[0].choices[0] =
          "invented reference answer";
      if (change === "wrong grade")
        request.state.style_question_1.level = "중1";
      if (change === "missing coverage") delete request.state.style_question_1;
      await f.rewriteReceipt(2, request, saved);
      await expect(
        loadVerifiedListeningStyleStage(f.file, f.root),
      ).rejects.toThrow(/Style request/);
    },
  );

  it.each([
    "question ID",
    "choice ID",
    "choice order",
    "source number",
    "answer",
    "duplicate coverage",
    "missing native proof",
  ])(
    "rejects rehashed native template %s against its original",
    async (change) => {
      const f = await fixture(),
        native = await json(f.nativePath),
        question = native.questions[0];
      if (change === "question ID") question.questionId = randomUUID();
      if (change === "choice ID") question.choices[0].id = randomUUID();
      if (change === "choice order") question.choices.reverse();
      if (change === "source number") question.sourceNumber = 2;
      if (change === "answer") question.answerChoiceId = question.choices[0].id;
      if (change === "duplicate coverage") native.questions.push(question);
      if (change === "missing native proof")
        question.conversion.nativePrompt = false;
      const nativeHash = await write(f.nativePath, native);
      f.audit.questionVerdicts.forEach((verdict) =>
        verdict.templateBindings.forEach((template) => {
          template.nativePreparedSha256 = nativeHash;
        }),
      );
      await f.saveStage();
      await expect(
        loadVerifiedListeningStyleStage(f.file, f.root),
      ).rejects.toThrow(/template|native/);
    },
  );

  it("rejects rehashed baseline ordinal claims and duplicated grounding coverage", async () => {
    for (const change of ["official ordinals", "duplicate grounding"]) {
      const f = await fixture(),
        baseline = await json(f.baselinePath);
      if (change === "official ordinals")
        baseline.verification.originalQuestionNumbersRecovered = true;
      else
        baseline.verification.grounding[1] = baseline.verification.grounding[0];
      f.audit.baselineSha256 = await write(f.baselinePath, baseline);
      Object.assign(f.staged.verification, baseline.verification);
      await f.saveStage();
      await expect(
        loadVerifiedListeningStyleStage(f.file, f.root),
      ).rejects.toThrow();
    }
  });

  it("hashes requests with JSON.stringify and receipts with their exact file bytes", async () => {
    const f = await fixture(),
      ref = f.audit.receipts[1],
      request = await json(ref.requestPath);
    await writeFile(ref.requestPath, JSON.stringify(request, null, 4));
    await expect(
      loadVerifiedListeningStyleStage(f.file, f.root),
    ).resolves.toBeDefined();
    await writeFile(
      ref.receiptPath,
      JSON.stringify(await json(ref.receiptPath)),
    );
    await expect(
      loadVerifiedListeningStyleStage(f.file, f.root),
    ).rejects.toThrow(/hash/);
  });

  it("binds generation input back to baseline semantic ASR and template text", async () => {
    const f = await fixture(),
      ref = f.audit.receipts[0],
      request = await json(ref.requestPath),
      saved = await json(ref.receiptPath),
      state = JSON.parse(request.messages[1].content);
    state.existingQuestions[0].selectedActualAsrSegments[0].text =
      "invented baseline speech";
    request.messages[1].content = JSON.stringify(state);
    await f.rewriteReceipt(0, request, saved);
    await expect(
      loadVerifiedListeningStyleStage(f.file, f.root),
    ).rejects.toThrow(/Generation input/);
  });

  it.each([
    "grade",
    "audio hash",
    "incompatible version",
    "question order",
    "missing question",
    "duplicated question",
    "official examples",
  ])(
    "rejects generation input %s even after request/receipt hashes are rebuilt",
    async (change) => {
      const f = await fixture(),
        ref = f.audit.receipts[0],
        request = await json(ref.requestPath),
        saved = await json(ref.receiptPath),
        state = JSON.parse(request.messages[1].content);
      if (change === "grade") state.level = "중1";
      if (change === "audio hash") state.sourceAudioSha256 = "0".repeat(64);
      if (change === "incompatible version")
        state.version = "korean-official-style-v1-20261005";
      if (change === "question order") state.existingQuestions.reverse();
      if (change === "missing question") state.existingQuestions.pop();
      if (change === "duplicated question")
        state.existingQuestions[1] = state.existingQuestions[0];
      if (change === "official examples")
        state.actualOfficialExamples[0].choices[0] = "fake official reference";
      request.messages[1].content = JSON.stringify(state);
      await f.rewriteReceipt(0, request, saved);
      await expect(
        loadVerifiedListeningStyleStage(f.file, f.root),
      ).rejects.toThrow(/Generation/);
    },
  );

  it("rejects source path escape even when file hashes match", async () => {
    const f = await fixture(),
      outside = await mkdtemp(join(tmpdir(), "listening-outside-"));
    roots.push(outside);
    const escaped = join(outside, "asr.json");
    await writeFile(escaped, await readFile(f.asrPath));
    f.audit.asrPath = escaped;
    await f.saveStage();
    await expect(
      loadVerifiedListeningStyleStage(f.file, f.root),
    ).rejects.toThrow(/outside/);
  });

  it("rejects sibling-prefix paths, relative receipts and symlink/junction paths", async () => {
    const f = await fixture(),
      outside = `${f.root}-sibling`;
    roots.push(outside);
    await mkdir(outside);
    const copy = join(outside, "asr.json");
    await writeFile(copy, await readFile(f.asrPath));
    f.audit.asrPath = copy;
    await f.saveStage();
    await expect(
      loadVerifiedListeningStyleStage(f.file, f.root),
    ).rejects.toThrow(/outside/);
    f.audit.asrPath = f.asrPath;
    f.audit.receipts[0].requestPath = "generation.request.json";
    await f.saveStage();
    await expect(
      loadVerifiedListeningStyleStage(f.file, f.root),
    ).rejects.toThrow(/absolute/);
    const another = await fixture(),
      link = join(another.root, "linked-audit");
    await symlink(
      another.audit.auditDirectory,
      link,
      process.platform === "win32" ? "junction" : "dir",
    );
    another.audit.receipts[0].requestPath = join(
      link,
      "generation.request.json",
    );
    await another.saveStage();
    await expect(
      loadVerifiedListeningStyleStage(another.file, another.root),
    ).rejects.toThrow(/symlink|junction/);
  });

  it("rejects an oversized stage before parsing", async () => {
    const f = await fixture();
    await writeFile(f.file, Buffer.alloc(16 * 1024 * 1024 + 1));
    await expect(
      loadVerifiedListeningStyleStage(f.file, f.root),
    ).rejects.toThrow(/bounded/);
  });

  for (const [directory, judgmentVersion, eligible] of [
    ["style-revision-20261005", "1", 1],
    ["style-revision-20261005-v2", "2", 0],
    ["style-revision-20261005-v3", "4", 5],
  ] as const)
    it(`validates the real immutable ${directory} pilot when the QA archive exists`, async (context) => {
      const root = "C:/Creative/testautocreator/output/listening-assessments",
        file = resolve(root, `${directory}/ebs-middle-3-2017-2.json`);
      if (
        !(await access(file).then(
          () => true,
          () => false,
        ))
      ) {
        context.skip();
        return;
      }
      const loaded = await loadVerifiedListeningStyleStage(file, root);
      expect(loaded.audit.questionVerdicts).toHaveLength(20);
      expect(loaded.audit.judgmentVersion).toBe(judgmentVersion);
      expect(loaded.audit.eligibleQuestionIds).toHaveLength(eligible);
      expect(loaded.audit.needsReviewQuestionIds).toHaveLength(20 - eligible);
      expect(loaded.adoptionEligible).toBe(false);
      expect(() => assertVerifiedListeningStyleStage(loaded)).toThrow(
        /semantic guard/,
      );
    });

  it("validates the saved failed-generation recovery with every gate and unchanged raw receipt", async (context) => {
    const root = "C:/Creative/testautocreator/output/listening-assessments",
      file = resolve(
        root,
        "style-revision-20261005-recovery-v4/ebs-middle-1-2006-2.json",
      );
    if (
      !(await access(file).then(
        () => true,
        () => false,
      ))
    ) {
      context.skip();
      return;
    }
    const stage = await json(file),
      receiptPath = stage.verification.styleRevision.receipts[0].receiptPath,
      before = await readFile(receiptPath),
      raw = JSON.parse(
        JSON.parse(before.toString("utf8")).response.choices[0].message.content,
      ),
      loaded = await loadVerifiedListeningStyleStage(file, root);
    expect(loaded.audit.version).toBe("korean-official-style-v4-20261005");
    expect(loaded.audit.generationNormalization!.version).toBe(
      "structural-metadata-v1",
    );
    expect(loaded.audit.generationNormalization!.steps).toEqual([
      { sourceNumber: 20, field: "questionType", from: "reason", to: "detail" },
    ]);
    expect(
      raw.questions.some(
        (question: { questionType: string }) =>
          question.questionType === "reason",
      ),
    ).toBe(true);
    expect(resolve(receiptPath)).toBe(
      resolve(
        root,
        "style-revision-20261005-flash-v4/audit/ebs-middle-1-2006-2/generation.receipt.json",
      ),
    );
    expect(loaded.audit.questionVerdicts).toHaveLength(20);
    expect(loaded.audit.eligibleQuestionIds).toHaveLength(2);
    expect(loaded.audit.needsReviewQuestionIds).toHaveLength(18);
    expect(loaded.audit.receipts).toHaveLength(11);
    expect(loaded.audit.humanReviewed).toBe(false);
    expect(loaded.audit.audioAlignmentVerified).toBe(false);
    expect(loaded.audit.originalQuestionNumbersRecovered).toBe(false);
    expect(await readFile(receiptPath)).toEqual(before);
    expect(loaded.audit.receipts[0].receiptSha256).toBe(sha(before));
    assertVerifiedListeningStyleStage(loaded);
  });

  it("validates the current guarded Flash pilot with adoption proof", async (context) => {
    const root = "C:/Creative/testautocreator/output/listening-assessments",
      file = resolve(
        root,
        "style-revision-20261005-flash-v4/ebs-middle-3-2017-2.json",
      );
    if (
      !(await access(file).then(
        () => true,
        () => false,
      ))
    ) {
      context.skip();
      return;
    }
    const loaded = await loadVerifiedListeningStyleStage(file, root);
    expect(loaded.audit.version).toBe("korean-official-style-v4-20261005");
    expect(loaded.audit.eligibleQuestionIds).toHaveLength(6);
    expect(loaded.audit.needsReviewQuestionIds).toHaveLength(14);
    expect(loaded.audit.receipts[0].actualModel).toBe("deepseek-flash");
    expect(loaded.audit.questionVerdicts[4].semanticWarnings).toEqual([
      "added_deadline",
    ]);
    expect(loaded.audit.questionVerdicts[4].eligible).toBe(false);
    assertVerifiedListeningStyleStage(loaded);
  });
});

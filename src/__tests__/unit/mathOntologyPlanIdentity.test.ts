import { expect, it, vi } from "vitest";
import release from "../fixtures/ontology-packaged-release.json";
import { mathOntologyGraphIdentitySchema } from "@/contracts/mathOntology.contract";
import { loadOntologyRuntime } from "@/lib/math-ontology/runtime/artifact";
import { runOntologyAssist } from "@/lib/math-ontology/retrieval/assist";
import { ontologyDigest } from "@/lib/math-ontology/compiler/canonical";
import { ontologyCourseSectionLabel } from "@/lib/math-ontology/retrieval/planIdentity";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
const title = "분모가 같은 분수의 크기 비교";
async function run(question: string) {
  const runtime = await loadOntologyRuntime(
    release,
    mathOntologyGraphIdentitySchema.parse(release.identity),
  );
  const preparePlan = vi.fn(async () => ({
    id: "synthetic-plan",
    summary: "preview",
    steps: [],
    details: [],
    coverage: [],
  }));
  let seenChoices: {
    id: string;
    label: string;
    grade: number;
    semester: number;
    path: string;
  }[] = [];
  const result = await runOntologyAssist(
    {
      maskedQuestion: question,
      hasSelectedStudent: true,
      signal: new AbortController().signal,
    },
    {
      assertAuthorized: async () => {},
      open: async () => ({
        runtime,
        context: {
          allowedScopes: ["global"],
          contextHash: "synthetic-plan-context",
          cursorSecret: "synthetic-local-only",
          deadlineMs: 10000,
        },
        assertCurrent: async () => {},
      }),
      complete: async (prompt) => {
        const data = JSON.parse(prompt.split("\n").at(-1)!);
        let raw: string;
        if (data.choices) {
          seenChoices = data.choices;
          const choice =
            seenChoices.find((c) => c.semester === 2) ?? seenChoices[0];
          raw = JSON.stringify({
            intent: "plan-draft",
            section: choice.id,
            dailyQuestionCount: 10,
            enabled: true,
          });
        } else
          raw = JSON.stringify({
            intent: "plan-draft",
            searchTerms: [title],
            context: "selected-student",
          });
        return {
          raw,
          receipt: {
            vendor: "anthropic" as const,
            requestedModel: "synthetic-only",
            reportedModel: null,
            responseId: null,
            completionReason: "end_turn",
            responseTextHash: ontologyDigest(raw),
            usage: null,
          },
        };
      },
      preparePlan,
    },
  );
  return { result, preparePlan, seenChoices };
}
it("exposes verified grade semester and full path for actual same-title native sections", async () => {
  const { preparePlan, seenChoices } = await run(
    "초3 2학기 분모가 같은 분수의 크기 비교부터 하루 10개 계획해줘",
  );
  expect(new Set(seenChoices.map((c) => c.semester))).toEqual(new Set([1, 2]));
  expect(
    seenChoices.every(
      (c) =>
        c.grade === 3 &&
        c.path.includes(`${c.semester}학기`) &&
        c.path.includes(title),
    ),
  ).toBe(true);
  expect(preparePlan).toHaveBeenCalledOnce();
}, 60000);
it("does not let a model guess the semester for an ambiguous same-title request", async () => {
  const { result, preparePlan } = await run(
    "분모가 같은 분수의 크기 비교부터 하루 10개 계획해줘",
  );
  expect(preparePlan).not.toHaveBeenCalled();
  expect(result.answer.summary).toContain("학기");
}, 60000);
it("human before and after labels distinguish the actual native targets", () => {
  const sections = COURSE_SECTIONS.filter((s) => s.title === title);
  expect(sections).toHaveLength(2);
  const labels = sections.map((s) => ontologyCourseSectionLabel(s.id));
  expect(new Set(labels).size).toBe(2);
  for (const [i, s] of sections.entries())
    expect(labels[i]).toContain(`${s.semester}학기`);
  expect(ontologyCourseSectionLabel("unknown")).toBe("단원 표기 미확인");
});

import { DataFactory } from "n3";
import { queryOntology } from "@/lib/math-ontology/query/closed";
import { ontologyPlanSection } from "@/lib/math-ontology/retrieval/planIdentity";
it("rejects native metadata or source binding drift before exposing an actionable target", async () => {
  const runtime = await loadOntologyRuntime(
    release,
    mathOntologyGraphIdentitySchema.parse(release.identity),
  );
  const context = {
    allowedScopes: ["global"],
    contextHash: "test",
    cursorSecret: "synthetic",
    deadlineMs: 10000,
  };
  const page = await queryOntology(
    runtime,
    { kind: "catalog", namespace: "course-section", q: title, limit: 6 },
    context,
  );
  const iri = page.rows[0].entity;
  const slice = await runtime.materialize!(
    {
      kind: "neighbors",
      entityId: iri,
      relation: "projectsSourceSection",
      limit: 20,
    },
    context,
  );
  const registry = slice.datasets().registry;
  const proofs = slice.proofs();
  expect(ontologyPlanSection(registry, proofs, iri)).not.toBeNull();
  expect(ontologyPlanSection(registry, [], iri)).toBeNull();
  const predicate = DataFactory.namedNode("urn:todaymath:vocab:semester");
  registry.removeQuads(
    registry.getQuads(DataFactory.namedNode(iri), predicate, null, null),
  );
  registry.addQuad(
    DataFactory.namedNode(iri),
    predicate,
    DataFactory.literal("99"),
  );
  expect(ontologyPlanSection(registry, proofs, iri)).toBeNull();
}, 60000);

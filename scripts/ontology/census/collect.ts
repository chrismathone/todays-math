import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { join, relative } from "node:path";
import {
  MATH_ONTOLOGY_SOURCE_ADAPTER_VERSION,
  type MathOntologySourceRecord,
  type MathOntologySourceAssertion,
  type MathOntologySourceNamespace,
  type MathOntologySourceLocator,
  type MathOntologySourceRef,
  type MathOntologySourcePayload,
} from "@/contracts/mathOntologySource.contract";
import {
  EXPECTED_MATH_ONTOLOGY_ADAPTER_COVERAGE,
  sourcePopulationKind,
} from "@/lib/math-ontology/sources/registry";
import { sealMathOntologySourcePayload } from "@/lib/math-ontology/sources/assembler";
import {
  sourceByteDigest,
  sourceDigest,
} from "@/lib/math-ontology/sources/canonical";
import {
  createRepoSourceReadPort,
  readSourceInputManifest,
  verifySourceInputManifest,
  type RepoSourceReadPort,
} from "./inputs";
type Raw = Record<string, unknown>;
const str = (value: unknown): string => {
  if (typeof value !== "string" || !value.length)
    throw new Error("Missing native source string");
  return value;
};
const rows = (value: unknown): Raw[] => {
  if (!Array.isArray(value)) throw new Error("Missing finite source rows");
  return value as Raw[];
};
const sectionKey = (u: Raw) =>
  [str(u.grade), str(u.chapter), str(u.section)].join("::");
const scalar = (value: unknown): string | number | boolean | null =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean"
    ? value
    : null;
const ref = (
  namespace: MathOntologySourceNamespace,
  nativeId: string,
  scope = "global",
): MathOntologySourceRef => ({ namespace, nativeId, scope });
const INPUT_PREFIXES = [
  "prisma/seed-data/",
  "src/lib/concept-blank/",
  "src/lib/math-explorers/",
  "src/lib/math-srs/",
  "src/lib/fading/",
  "src/lib/math-prerequisite/",
  "src/lib/elementary/",
  "src/lib/middle/",
  "src/lib/high/",
  "src/lib/arithmetic/",
  "src/lib/arithmetic-v2/",
  "src/lib/examStudy/",
  "src/lib/engine/",
  "src/lib/textbook/",
  "src/lib/import/schoolTextbook/",
  "src/lib/lab/",
  "src/lib/math-ontology/sources/",
  "scripts/import/",
  "scripts/rpm/",
  "scripts/ontology/",
  "docs/reference/concept-terms/",
];
const INPUT_FILES = [
  "prisma/schema.prisma",
  "math_graph_2022.json",
  "config/testchanger-engine.json",
  "src/contracts/mathOntologySource.contract.ts",
  "src/lib/math-ontology/ids.ts",
  "ontology/source-manifests/official-2022-codes.json",
];
let collectorInvoked = false;
/** Executes only existing finite source registries, never generators, database code, models or network clients. */
export function collectMathOntologyRepoSources(
  repo: string,
  port: RepoSourceReadPort = createRepoSourceReadPort(repo),
) {
  if (collectorInvoked)
    throw new Error(
      "Source collector requires a fresh subprocess for each extraction",
    );
  collectorInvoked = true;
  const actualPort = createRepoSourceReadPort(repo);
  const require = createRequire(join(repo, "package.json"));
  const load = <T>(path: string): T => require(join(repo, path)) as T;
  const byteCache = new Map<string, Uint8Array>();
  const bytes = (path: string): Uint8Array => {
    let value = byteCache.get(path);
    if (!value) {
      value = port.read(path);
      byteCache.set(path, value);
    }
    return value;
  };
  const json = (path: string): unknown =>
    JSON.parse(Buffer.from(bytes(path)).toString("utf8"));
  const byteHashes = new Map<string, string>();
  const byteHash = (path: string): string => {
    let value = byteHashes.get(path);
    if (!value) {
      value = sourceByteDigest(bytes(path));
      byteHashes.set(path, value);
    }
    return value;
  };
  const origin = (
    path: string,
    pointer: string,
  ): MathOntologySourceLocator => ({
    repositoryPath: path,
    pointer,
    byteHash: byteHash(path),
    extractorVersion: MATH_ONTOLOGY_SOURCE_ADAPTER_VERSION,
  });
  const records: MathOntologySourceRecord[] = [],
    assertions: MathOntologySourceAssertion[] = [];
  function add(
    namespace: MathOntologySourceNamespace,
    nativeId: string,
    kind: MathOntologySourceRecord["kind"],
    path: string,
    pointer: string,
    metadata: MathOntologySourceRecord["metadata"] = {},
    options: Partial<
      Pick<
        MathOntologySourceRecord,
        | "scope"
        | "distribution"
        | "sourceProvenance"
        | "edition"
        | "labels"
        | "origin"
      >
    > = {},
  ) {
    const record: MathOntologySourceRecord = {
      namespace,
      nativeId,
      scope: "global",
      kind,
      origin: origin(path, pointer),
      distribution: "native-metadata",
      sourceProvenance: "native-source",
      edition: "unknown",
      metadata: {
        populationKind: sourcePopulationKind(namespace),
        actualInstances: null,
        ...metadata,
      },
      ...options,
    };
    records.push(record);
    return record;
  }
  function label(
    record: MathOntologySourceRecord,
    value: unknown,
    sourceField: NonNullable<
      MathOntologySourceRecord["labels"]
    >[number]["sourceField"],
    labelOrigin = record.origin,
  ) {
    if (typeof value !== "string" || !value.length) return;
    record.labels ??= [];
    record.labels.push({
      value,
      sourceField,
      language: "ko",
      sourceTextHash: sourceByteDigest(value),
      origin: {
        ...labelOrigin,
        pointer: labelOrigin.pointer + "/" + sourceField,
      },
    });
  }
  function nativeReference(
    record: MathOntologySourceRecord,
    namespace: NonNullable<
      MathOntologySourceRecord["nativeReferences"]
    >[number]["namespace"],
    value: unknown,
    pointer: string,
    referenceOrigin = record.origin,
  ) {
    if (typeof value !== "string" || !value.length) return;
    record.nativeReferences ??= [];
    record.nativeReferences.push({
      namespace,
      nativeId: value,
      resolution: "unverified",
      origin: { ...referenceOrigin, pointer },
    });
  }
  function relation(
    nativeId: string,
    subject: MathOntologySourceRef,
    predicate: MathOntologySourceAssertion["predicate"],
    object: MathOntologySourceRef,
    path: string,
    pointer: string,
    options: Partial<
      Pick<
        MathOntologySourceAssertion,
        | "originKind"
        | "supportKind"
        | "mappingReviewStatus"
        | "evidenceKind"
        | "reviewState"
        | "partial"
      >
    > = {},
  ) {
    assertions.push({
      nativeId,
      subject,
      predicate,
      object,
      origin: origin(path, pointer),
      originKind: "source-projection",
      supportKind: "direct-source-structure",
      evidenceKind: "observed",
      reviewState: "unreviewed",
      publicationState: "unpublished",
      partial: false,
      ...options,
    });
  }
  const units = load<{ CURRICULUM_UNITS: Raw[] }>(
    "prisma/seed-data/units.ts",
  ).CURRICULUM_UNITS;
  const seedPath = "prisma/seed-data/units.ts",
    grades = new Set<string>(),
    chapters = new Set<string>();
  for (const [i, u] of units.entries()) {
    const grade = str(u.grade),
      chapter = [grade, str(u.chapter)].join("::"),
      section = sectionKey(u),
      coordinate = "/CURRICULUM_UNITS/" + i;
    if (!grades.has(grade)) {
      grades.add(grade);
      label(
        add(
          "curriculum-grade",
          grade,
          "Grade",
          seedPath,
          coordinate + "/grade",
          { grade },
        ),
        u.grade,
        "label",
      );
    }
    if (!chapters.has(chapter)) {
      chapters.add(chapter);
      label(
        add(
          "curriculum-chapter",
          chapter,
          "Chapter",
          seedPath,
          coordinate + "/chapter",
          { grade },
        ),
        u.chapter,
        "chapter",
      );
      relation(
        "seed-chapter:" + chapter,
        ref("curriculum-chapter", chapter),
        "partOf",
        ref("curriculum-grade", grade),
        seedPath,
        coordinate,
      );
    }
    label(
      add("curriculum-section", section, "Section", seedPath, coordinate, {
        grade,
        order: Number(u.orderIndex),
      }),
      u.section,
      "section",
    );
    relation(
      "seed-section:" + section,
      ref("curriculum-section", section),
      "partOf",
      ref("curriculum-chapter", chapter),
      seedPath,
      coordinate,
    );
    if (i + 1 < units.length)
      relation(
        "seed-next:" + section,
        ref("curriculum-section", section),
        "orderedBefore",
        ref("curriculum-section", sectionKey(units[i + 1])),
        seedPath,
        coordinate,
      );
  }
  const bankModule = load<{
    BANK_PARTS: Record<string, Record<string, Raw[]>>;
  }>("src/lib/concept-blank/bank/index.ts");
  const bankRecords = new Map<string, MathOntologySourceRecord>();
  for (const [part, bank] of Object.entries(bankModule.BANK_PARTS)) {
    const path =
      "src/lib/concept-blank/bank/" + part.replace("plus", "-plus") + ".ts";
    for (const [genre, namespace] of Object.entries({
      concepts: "bank-definition",
      ox: "bank-ox",
      apply: "bank-apply",
      figures: "bank-figure",
    } as const))
      for (const [i, r] of bank[genre].entries()) {
        const id = str(r.id),
          record = add(
            namespace,
            id,
            genre === "concepts" ? "Definition" : "QuestionRepresentation",
            path,
            `/bank/${genre}/${id}`,
            {
              grade: str(r.section).split("::")[0],
              level: scalar(r.level),
              order: i,
              entryKind: genre,
              ...(genre === "concepts"
                ? { definitionTextHash: sourceByteDigest(str(r.definition)) }
                : {}),
            },
          );
        bankRecords.set(id, record);
        if (genre === "concepts") label(record, r.term, "term");
        relation(
          "bank-section:" + id,
          ref(namespace, id),
          "partOf",
          ref("curriculum-section", str(r.section)),
          path,
          record.origin.pointer,
        );
      }
    const assessmentPath =
      "src/lib/concept-blank/bank/assessments/" +
      part.replace("plus", "-plus") +
      ".json";
    for (const [id, row] of Object.entries(
      json(assessmentPath) as Record<string, Raw>,
    )) {
      const record = add(
        "bank-assessment",
        id,
        "AssessmentEntry",
        assessmentPath,
        "/" + id,
        {
          bQuestionAvailable: row.bQuestion !== null,
          clozeAvailable: row.clozeQuestion !== null,
          questionRevision: scalar(
            load<{ QUESTION_REVISION: unknown }>(
              "src/lib/concept-blank/questions.ts",
            ).QUESTION_REVISION,
          ),
        },
      );
      relation(
        "assessment-definition:" + id,
        ref("bank-assessment", id),
        "assessesDefinition",
        ref("bank-definition", id),
        assessmentPath,
        record.origin.pointer,
      );
    }
  }
  const course = load<{ COURSE_SECTIONS: Raw[] }>(
    "src/lib/math-srs/elementary/catalog.ts",
  ).COURSE_SECTIONS;
  for (const r of course) {
    const id = str(r.id),
      path = "src/lib/math-srs/elementary/catalog.ts";
    label(
      add("course-section", id, "Section", path, "/COURSE_SECTIONS/" + id, {
        grade: scalar(r.grade),
        semester: scalar(r.semester),
        order: scalar(r.order),
      }),
      r.title,
      "title",
    );
    relation(
      "course-seed:" + id,
      ref("course-section", id),
      "projectsSourceSection",
      ref("curriculum-section", sectionKey(r.unit as Raw)),
      path,
      "/COURSE_SECTIONS/" + id,
    );
  }
  const explorer = load<{ definitionUnits: Raw[]; definitionCards: Raw[] }>(
    "src/lib/math-explorers/definition-cards.ts",
  );
  const explorerPath = "src/lib/math-explorers/definition-cards.ts";
  for (const u of explorer.definitionUnits) {
    label(
      add(
        "explorer-unit",
        str(u.id),
        "LearningUnit",
        explorerPath,
        "/definitionUnits/" + str(u.id),
        { grade: scalar(u.grade) },
      ),
      u.title,
      "title",
    );
  }
  for (const c of explorer.definitionCards) {
    const id = str(c.id);
    label(
      add("explorer-card", id, "Card", explorerPath, "/definitionCards/" + id),
      c.name,
      "name",
    );
    relation(
      "card-unit:" + id,
      ref("explorer-card", id),
      "cardInUnit",
      ref("explorer-unit", str(c.unit)),
      explorerPath,
      "/definitionCards/" + id,
    );
    for (const p of (c.prerequisites ?? []) as string[])
      relation(
        "card-prerequisite:" + p + "->" + id,
        ref("explorer-card", p),
        "authoredPrerequisiteRecommendation",
        ref("explorer-card", id),
        explorerPath,
        "/definitionCards/" + id + "/prerequisites",
        {
          originKind: "authored",
          supportKind: "editorial-judgment",
          evidenceKind: "authored-inference",
        },
      );
  }
  const bridge = load<{
    middleEquationBankSections: string[];
    explorerUnitForSection: (id: string) => string | null;
    explorerCardForSection: (id: string) => string | null;
  }>("src/lib/math-explorers/curriculumBridge.ts");
  const bridgeRows = [
    ...course.map((c) => ({ id: str(c.id), key: sectionKey(c.unit as Raw) })),
    ...bridge.middleEquationBankSections.map((id) => {
      const matches = units.filter(
        (u) => u.grade === "중1" && u.section === id,
      );
      if (matches.length !== 1)
        throw new Error("Ambiguous middle source correspondence");
      return { id, key: sectionKey(matches[0]) };
    }),
  ];
  for (const b of bridgeRows) {
    const path = "src/lib/math-explorers/curriculumBridge.ts",
      u = bridge.explorerUnitForSection(b.id),
      c = bridge.explorerCardForSection(b.id);
    if (u)
      relation(
        "bridge-unit:" + b.id,
        ref("explorer-unit", u),
        "coversSourceSection",
        ref("curriculum-section", b.key),
        path,
        "/bridge/" + b.id,
        {
          originKind: "authored",
          supportKind: "editorial-judgment",
          partial: true,
        },
      );
    if (c)
      relation(
        "bridge-card:" + b.id,
        ref("curriculum-section", b.key),
        "representativeCard",
        ref("explorer-card", c),
        path,
        "/bridge/" + b.id,
        {
          originKind: "authored",
          supportKind: "editorial-judgment",
          partial: true,
        },
      );
  }
  const groups = load<{ FADING_GROUPS: Record<string, string[]> }>(
    "src/lib/fading/groups/index.ts",
  ).FADING_GROUPS;
  for (const [id, ids] of Object.entries(groups)) {
    const path = "src/lib/fading/groups/" + id.slice(0, 2) + ".ts",
      group = add("fading-group", id, "RecallGroup", path, "/groups/" + id, {
        count: ids.length,
      });
    for (const p of ids) {
      const original = bankRecords.get(p);
      if (!original) throw new Error("Missing fading proposition");
      group.labels ??= [];
      group.labels.push(...(original.labels ?? []));
      relation(
        "group-member:" + id + ":" + p,
        ref("fading-group", id),
        "containsProposition",
        ref("bank-definition", p),
        path,
        "/groups/" + id,
      );
    }
  }
  const graph = json("math_graph_2022.json") as {
    units: Raw[];
    topics: Raw[];
    edges: Raw[];
    courseRelations: Raw[];
  };
  const graphPath = "math_graph_2022.json",
    graphCourseIds = new Set<string>();
  for (const [i, u] of graph.units.entries()) {
    label(
      add(
        "graph-unit",
        str(u.id),
        "EditorialUnit",
        graphPath,
        "/units/" + i,
        { grade: scalar(u.gradeBand), educationEvidence: "authored-inference" },
        { edition: "2022" },
      ),
      u.title,
      "title",
    );
    graphCourseIds.add(str(u.course));
  }
  for (const [i, t] of graph.topics.entries())
    label(
      add(
        "graph-topic",
        str(t.id),
        "EditorialTopic",
        graphPath,
        "/topics/" + i,
        {
          grade: scalar(t.gradeBand),
          order: scalar(t.order),
          educationEvidence: "authored-inference",
        },
        { edition: "2022" },
      ),
      t.title,
      "title",
    );
  const listedGraphCourses = new Set(graphCourseIds);
  for (const e of graph.courseRelations) {
    graphCourseIds.add(str(e.from));
    graphCourseIds.add(str(e.to));
  }
  for (const c of graphCourseIds) {
    const index = graph.units.findIndex((u) => u.course === c);
    const relationIndex = graph.courseRelations.findIndex(
      (e) => e.from === c || e.to === c,
    );
    const pointer =
      index >= 0
        ? "/units/" + index + "/course"
        : "/courseRelations/" +
          relationIndex +
          (graph.courseRelations[relationIndex].from === c ? "/from" : "/to");
    label(
      add(
        "graph-course",
        c,
        listedGraphCourses.has(c) ? "Course" : "CourseExpression",
        graphPath,
        pointer,
        {
          nativeKind: listedGraphCourses.has(c)
            ? "listed-course"
            : "course-expression",
        },
        { edition: "2022" },
      ),
      c,
      "name",
    );
  }
  const graphUnitIds = new Set(graph.units.map((u) => str(u.id)));
  for (const [i, e] of graph.edges.entries()) {
    const predicate =
      e.relation === "contains"
        ? "editorialContains"
        : e.relation === "prerequisite"
          ? "editorialPrerequisite"
          : "editorialSupport";
    relation(
      "graph-edge:" + i,
      ref("graph-unit", str(e.from)),
      predicate,
      ref(
        graphUnitIds.has(str(e.to)) ? "graph-unit" : "graph-topic",
        str(e.to),
      ),
      graphPath,
      "/edges/" + i,
      predicate === "editorialContains"
        ? {}
        : {
            originKind: "authored",
            supportKind: "editorial-judgment",
            evidenceKind: "authored-inference",
          },
    );
  }
  for (const [i, e] of graph.courseRelations.entries())
    relation(
      "graph-course-sequence:" + i,
      ref("graph-course", str(e.from)),
      (
        {
          course_sequence: "courseSequence",
          alternative_track: "courseAlternativeTrack",
          recommended_foundation: "courseRecommendedFoundation",
          recommended_before_or_concurrent:
            "courseRecommendedBeforeOrConcurrent",
        } as const
      )[str(e.relation) as "course_sequence"],
      ref("graph-course", str(e.to)),
      graphPath,
      "/courseRelations/" + i,
      { originKind: "authored", supportKind: "editorial-judgment" },
    );
  const mappingPath = "src/lib/math-prerequisite/mapping.ts",
    mapping = load<{
      PILOT_TARGET_UNIT_ID: string;
      PILOT_CHECK_UNIT_ID: string;
      PILOT_TARGET_SECTION_IDS: string[];
      PILOT_CHECK_SECTION_IDS: string[];
      mappingInfo: (unitId: string) => {
        mappingStatus: "verified" | "unmapped";
      };
    }>(mappingPath);
  for (const [unitId, sectionIds] of [
    [mapping.PILOT_TARGET_UNIT_ID, mapping.PILOT_TARGET_SECTION_IDS],
    [mapping.PILOT_CHECK_UNIT_ID, mapping.PILOT_CHECK_SECTION_IDS],
  ] as const)
    for (const id of sectionIds)
      relation(
        "partial-course-map:" + id,
        ref("graph-unit", unitId),
        "partialCourseMapping",
        ref("course-section", id),
        mappingPath,
        "/PILOT_SECTION_IDS/" + id,
        {
          originKind: "authored",
          supportKind: "editorial-judgment",
          partial: true,
          mappingReviewStatus:
            mapping.mappingInfo(unitId).mappingStatus === "verified"
              ? "source-marked-verified"
              : "unknown",
        },
      );
  const catalogs: [MathOntologySourceNamespace, string, Raw[], string][] = [
    [
      "arithmetic-skill",
      "src/lib/arithmetic/catalog.ts",
      load<{ listArithmeticSkills: () => Raw[] }>(
        "src/lib/arithmetic/catalog.ts",
      ).listArithmeticSkills(),
      "skillId",
    ],
    [
      "arithmetic-v2-type",
      "src/lib/arithmetic-v2/registry.ts",
      load<{ arithmeticV2Definitions: () => Raw[] }>(
        "src/lib/arithmetic-v2/registry.ts",
      ).arithmeticV2Definitions(),
      "id",
    ],
    [
      "algebra-srs-concept",
      "src/lib/math-srs/concepts.ts",
      load<{ CONCEPTS: Raw[] }>("src/lib/math-srs/concepts.ts").CONCEPTS,
      "id",
    ],
    [
      "middle-type",
      "src/lib/middle/generate.ts",
      load<{ registeredTypes: () => Raw[] }>(
        "src/lib/middle/generate.ts",
      ).registeredTypes(),
      "key",
    ],
    [
      "high-type",
      "src/lib/high/generate.ts",
      load<{ registeredHighTypes: () => Raw[] }>(
        "src/lib/high/generate.ts",
      ).registeredHighTypes(),
      "key",
    ],
    [
      "high-hold",
      "src/lib/high/generate.ts",
      load<{ registeredHighHolds: () => Raw[] }>(
        "src/lib/high/generate.ts",
      ).registeredHighHolds(),
      "key",
    ],
    [
      "native-descriptive-definition",
      "src/lib/engine/nativeDescriptive20261018.ts",
      load<{ nativeDescriptiveDefinitions: () => Raw[] }>(
        "src/lib/engine/nativeDescriptive20261018.ts",
      ).nativeDescriptiveDefinitions(),
      "definitionId",
    ],
    [
      "elementary-combo",
      "src/lib/elementary/combo.ts",
      load<{ elementaryComboDefinitions: () => Raw[] }>(
        "src/lib/elementary/combo.ts",
      ).elementaryComboDefinitions(),
      "id",
    ],
    [
      "exam-study-family",
      "src/lib/examStudy/registry.ts",
      load<{ examStudyFamilies: () => Raw[] }>(
        "src/lib/examStudy/registry.ts",
      ).examStudyFamilies(),
      "id",
    ],
    [
      "exam-study-requirement",
      "src/lib/examStudy/requirements.ts",
      load<{ STUDY_REQUIREMENTS: Raw[] }>("src/lib/examStudy/requirements.ts")
        .STUDY_REQUIREMENTS,
      "id",
    ],
  ];
  for (const [namespace, path, catalog, idKey] of catalogs)
    for (const [i, row] of catalog.entries()) {
      const id = str(row[idKey]);
      const record = add(
        namespace,
        id,
        namespace === "exam-study-requirement"
          ? "Requirement"
          : namespace === "algebra-srs-concept"
            ? "Definition"
            : namespace === "arithmetic-skill"
              ? "Skill"
              : "GeneratorFamily",
        path,
        "/registry/" + id,
        {
          grade: scalar(row.grade ?? row.course),
          order: i,
          version: scalar(row.version),
        },
      );
      nativeReference(
        record,
        "db-unit",
        row.unitId,
        record.origin.pointer + "/unitId",
      );
      for (const [i, value] of (Array.isArray(row.unitIds)
        ? row.unitIds
        : []
      ).entries())
        nativeReference(
          record,
          "db-unit",
          value,
          record.origin.pointer + "/unitIds/" + i,
        );
      for (const value of Array.isArray(row.familyIds) ? row.familyIds : [])
        nativeReference(
          record,
          "engine-family",
          value,
          record.origin.pointer + "/familyIds",
        );
      const labelKey =
        namespace === "middle-type" ||
        namespace === "high-type" ||
        namespace === "high-hold"
          ? "unitSection"
          : typeof row.title === "string"
            ? "title"
            : "label";
      label(
        record,
        row[labelKey],
        labelKey === "unitSection" ? "section" : labelKey,
      );
      if (
        typeof row.unitSection === "string" &&
        typeof row.grade === "string"
      ) {
        const matches = units.filter(
          (u) => u.grade === row.grade && u.section === row.unitSection,
        );
        if (matches.length !== 1)
          throw new Error("Ambiguous engine section correspondence");
        relation(
          "engine-section:" + namespace + ":" + id,
          ref(namespace, id),
          "generatesForSection",
          ref("curriculum-section", sectionKey(matches[0])),
          path,
          record.origin.pointer,
        );
      }
    }
  const formPath = "src/lib/elementary/forms.ts",
    forms = load<{ listedForms: (u: Raw) => Raw[] }>(formPath);
  for (const u of units)
    for (const f of forms.listedForms(u)) {
      const id = sectionKey(u) + "|" + str(f.id),
        r = add(
          "elementary-form",
          id,
          "GeneratorFamily",
          formPath,
          "/listedForms/" + id,
          { grade: scalar(u.grade) },
        );
      label(
        r,
        u.section,
        "section",
        origin(seedPath, "/CURRICULUM_UNITS/" + units.indexOf(u)),
      );
      relation(
        "form-section:" + id,
        ref("elementary-form", id),
        "generatesForSection",
        ref("curriculum-section", sectionKey(u)),
        formPath,
        r.origin.pointer,
      );
    }
  const sourcePaths = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: repo, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  )
    .split("\0")
    .filter(Boolean);
  const scriptFiles = ["e3", "e4", "e5", "e6", "m1", "m2", "m3"];
  for (const code of scriptFiles) {
    const path = "src/lib/textbook/scripts/" + code + ".json";
    for (const [i, s] of rows(json(path)).entries()) {
      const id = str(s.sectionKey),
        record = add("textbook-script", id, "TeachingScript", path, "/" + i, {
          grade: scalar(s.grade),
          version: scalar(s.version),
        });
      label(record, s.title, "title");
      for (const concept of s.conceptIds as string[])
        relation(
          "script-concept:" + id + ":" + concept,
          ref("textbook-script", id),
          "scriptUsesDefinition",
          ref("bank-definition", concept),
          path,
          "/" + i + "/conceptIds",
        );
      const occurrenceCounts = new Map<string, number>();
      for (const [j, turn] of rows(s.dialogue).entries()) {
        const source = turn.source as Raw,
          kind = str(source.kind);
        const signature = sourceDigest([
          source.kind,
          source.key ?? null,
          (turn.presentation as Raw | undefined)?.lessonKey ?? null,
          turn.role ?? null,
          turn.purpose ?? null,
          turn.expression ?? null,
        ]);
        const occurrence = occurrenceCounts.get(signature) ?? 0;
        occurrenceCounts.set(signature, occurrence + 1);
        const nativeId = id + "::turn:" + signature.slice(7) + ":" + occurrence;
        const q = add(
          "textbook-script-turn",
          nativeId,
          "ScriptTurn",
          path,
          `/${i}/dialogue/${j}`,
          { sourceKind: kind, order: j, nativeKind: "source-key-occurrence" },
          {
            distribution:
              kind === "v15" ? "quarantine-reference" : "native-metadata",
            sourceProvenance:
              kind === "v15" ? "imported-source" : "native-source",
          },
        );
        nativeReference(
          q,
          "declared-family",
          source.key,
          q.origin.pointer + "/source/key",
        );
        relation(
          "turn-script:" + nativeId,
          ref("textbook-script-turn", nativeId),
          "partOf",
          ref("textbook-script", id),
          path,
          q.origin.pointer,
        );
      }
    }
  }
  for (const path of sourcePaths.filter((p) =>
    /^docs\/reference\/concept-terms\/[^/]+\.json$/.test(p),
  )) {
    const d = json(path) as Raw;
    if (!Array.isArray(d.terms)) continue;
    const sourceId = path.split("/").at(-1)!;
    add(
      "textbook-reference-source",
      sourceId,
      "SourceReference",
      path,
      "/",
      {
        licenseStatus: "unknown",
        count: d.terms.length,
        originalHashKnown: typeof d.md5 === "string",
      },
      {
        distribution: "quarantine-reference",
        sourceProvenance: "imported-source",
      },
    );
    for (const [i, t] of rows(d.terms).entries()) {
      const key = str(t.key);
      add(
        "textbook-reference-term",
        key,
        "SourceReference",
        path,
        "/terms/" + i,
        { order: i, licenseStatus: "unknown" },
        {
          scope: sourceId,
          distribution: "quarantine-reference",
          sourceProvenance: "imported-source",
        },
      );
      relation(
        "reference-document:" + sourceId + ":" + i,
        ref("textbook-reference-term", key, sourceId),
        "referencesSource",
        ref("textbook-reference-source", sourceId),
        path,
        "/terms/" + i,
      );
      const matches = Array.isArray(t.explorer)
        ? rows(t.explorer)
        : [t.explorer as Raw];
      for (const [j, m] of matches.entries())
        if (typeof m?.cardId === "string" && m.cardId.length > 0)
          relation(
            "reference-card:" +
              sourceId +
              ":" +
              i +
              ":" +
              j +
              ":" +
              str(m.match),
            ref("textbook-reference-term", key, sourceId),
            "referencesSource",
            ref("explorer-card", m.cardId),
            path,
            `/terms/${i}/explorer/${j}`,
          );
    }
  }
  for (const path of [
    "scripts/rpm/rpm-type-catalog.json",
    "scripts/rpm/rpm-high-type-catalog.json",
  ])
    for (const [book, d] of Object.entries(json(path) as Record<string, Raw>)) {
      add(
        "rpm-source",
        book,
        "SourceReference",
        path,
        "/" + book,
        {
          grade: scalar(d.grade),
          licenseStatus: "unknown",
          count: rows(d.types).length,
        },
        {
          distribution: "quarantine-reference",
          sourceProvenance: "imported-source",
        },
      );
      for (const [i, t] of rows(d.types).entries()) {
        const id = book + "|" + str(t.minor) + "|" + str(t.number);
        add(
          "rpm-index-type",
          id,
          "SourceReference",
          path,
          `/${book}/types/${i}`,
          { grade: scalar(d.grade), order: i, licenseStatus: "unknown" },
          {
            distribution: "quarantine-reference",
            sourceProvenance: "imported-source",
            edition:
              d.edition === "2022"
                ? "2022"
                : d.edition === "2015"
                  ? "2015"
                  : "unknown",
          },
        );
        relation(
          "rpm-source:" + id,
          ref("rpm-index-type", id),
          "referencesSource",
          ref("rpm-source", book),
          path,
          `/${book}/types/${i}`,
        );
      }
    }
  const labPath = "src/lib/lab/units.json",
    lab = json(labPath) as { units: Raw[]; sources: Record<string, Raw> };
  for (const id of Object.keys(lab.sources))
    add(
      "lab-source",
      id,
      "SourceReference",
      labPath,
      "/sources/" + id,
      { licenseStatus: "unknown" },
      { sourceProvenance: "unknown" },
    );
  for (const [i, u] of lab.units.entries()) {
    const r = add("lab-unit", str(u.id), "LabUnit", labPath, "/units/" + i, {
      grade: scalar(u.grade),
      semester: scalar(u.semester),
    });
    label(r, u.title, "title");
    relation(
      "lab-source:" + str(u.id),
      ref("lab-unit", str(u.id)),
      "referencesSource",
      ref("lab-source", str(u.source)),
      labPath,
      "/units/" + i,
    );
  }
  for (const path of sourcePaths.filter((p) =>
    /^scripts\/import\/exam-paper\/exams\/[^/]+\/exam\.json$/.test(p),
  )) {
    const meta = json(path) as Raw,
      examId = str(meta.examId);
    add(
      "source-exam",
      examId,
      "SourceReference",
      path,
      "/",
      { grade: scalar(meta.grade), licenseStatus: "unknown" },
      {
        distribution: "quarantine-reference",
        sourceProvenance: "imported-source",
      },
    );
    const bodyPath = path.replace(/exam\.json$/, "body.json");
    if (!sourcePaths.includes(bodyPath)) continue;
    const body = json(bodyPath) as Raw;
    for (const [i, q] of rows(body.questions).entries()) {
      const id = String(q.number);
      const questionRecord = add(
        "source-exam-question",
        id,
        "SourceQuestion",
        bodyPath,
        "/questions/" + i,
        { questionNumber: scalar(q.number), licenseStatus: "unknown" },
        {
          scope: examId,
          distribution: "quarantine-reference",
          sourceProvenance: "imported-source",
        },
      );
      const assignment = (meta.units as Record<string, Raw> | undefined)?.[id];
      if (assignment) {
        nativeReference(
          questionRecord,
          "declared-unit-section",
          assignment.section,
          "/units/" + id + "/section",
          origin(path, "/units/" + id),
        );
        nativeReference(
          questionRecord,
          "declared-family",
          assignment.family,
          "/units/" + id + "/family",
          origin(path, "/units/" + id),
        );
      }
      relation(
        "source-question:" + examId + ":" + id,
        ref("source-exam-question", id, examId),
        "referencesSource",
        ref("source-exam", examId),
        bodyPath,
        "/questions/" + i,
      );
    }
  }
  const replayPath = "scripts/import/replays/2026-10-21-계획밖-승인행.json",
    replay = json(replayPath) as Raw;
  for (const [i, r] of rows(replay.entries).entries()) {
    const record = add(
      "import-replay",
      String(i),
      "SourceReference",
      replayPath,
      "/entries/" + i,
      {
        sourceKind: scalar(r.kind),
        count: Array.isArray(r.selectedExternalIds)
          ? r.selectedExternalIds.length
          : 1,
      },
    );
    for (const id of Array.isArray(r.selectedExternalIds)
      ? r.selectedExternalIds
      : [r.externalId])
      nativeReference(
        record,
        "source-external-id",
        id,
        record.origin.pointer + "/externalId",
      );
  }
  const officialPath = "ontology/source-manifests/official-2022-codes.json",
    official = json(officialPath) as {
      schemaVersion: number;
      edition: string;
      source: { byteHash: string; nativeId: string; publicSourceIri: string };
      extractor: { version: string };
      validation: {
        uniqueCodes: number;
        occurrences: number;
        flowRawAgreement: boolean;
        alignmentAudited: boolean;
      };
      codes: {
        nativeId: string;
        occurrences: {
          paragraph: number;
          offset: number;
          paragraphTextHash: string;
        }[];
      }[];
    };
  if (
    official.schemaVersion !== 1 ||
    official.edition !== "2022" ||
    official.source.byteHash !==
      "sha256:aab8eed59ecf244223d04afad75f4cf5ac5085fadcfc3cf52c2f6d54ddfc7856" ||
    official.validation.uniqueCodes !== 435 ||
    official.validation.occurrences !== 629 ||
    !official.validation.flowRawAgreement ||
    official.validation.alignmentAudited
  )
    throw new Error("Unvalidated official code manifest");
  const publicOrigin = (pointer: string) => ({
    ...origin(officialPath, pointer),
    upstreamByteHash: official.source.byteHash as `sha256:${string}`,
    publicSourceIri: official.source.publicSourceIri,
  });
  label(
    add(
      "official-source",
      official.source.nativeId,
      "SourceReference",
      officialPath,
      "/source",
      { licenseStatus: "public-official-metadata" },
      {
        sourceProvenance: "official-document",
        distribution: "public-official-metadata",
        edition: "2022",
        origin: publicOrigin("/source"),
      },
    ),
    official.source.nativeId,
    "code",
  );
  for (const [i, c] of official.codes.entries()) {
    if (
      !/^\d{1,2}[가-힣][가-힣0-9ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]*(?:-\d{2}){1,2}$/.test(c.nativeId)
    )
      throw new Error("Invalid official native code");
    const r = add(
      "official-standard",
      c.nativeId,
      "OfficialStandard",
      officialPath,
      "/codes/" + i,
      {
        sourceKind: official.extractor.version,
        count: c.occurrences.length,
        licenseStatus: "public-official-metadata",
        educationEvidence: "official-source",
      },
      {
        sourceProvenance: "official-document",
        distribution: "public-official-metadata",
        edition: "2022",
        origin: publicOrigin("/codes/" + i),
      },
    );
    label(r, c.nativeId, "code");
    relation(
      "official-source:" + c.nativeId,
      ref("official-standard", c.nativeId),
      "referencesSource",
      ref("official-source", official.source.nativeId),
      officialPath,
      "/codes/" + i,
    );
  }
  const modelNames = new Set([
    "StudentSrsState",
    "Unit",
    "Problem",
    "ProblemFamily",
    "SourceBook",
    "SourceMaterial",
    "Exam",
    "ExamQuestion",
    "Progress",
    "ProgressPlan",
    "Test",
    "TestResult",
    "ProblemAnswer",
    "Textbook",
    "TextbookEdition",
    "TextbookSection",
    "TextbookProblemSnapshot",
    "TextbookItem",
    "TextbookConcept",
    "TextbookConceptAttempt",
    "TextbookAssignment",
    "TextbookArtifact",
    "TextbookQrTarget",
    "ConceptLecture",
    "ConceptLectureView",
    "FadingStudentPolicy",
    "FadingRelearnCapDay",
    "Class",
    "Student",
    "Branch",
    "User",
  ]);
  const schema = Buffer.from(bytes("prisma/schema.prisma")).toString("utf8");
  for (const m of schema.matchAll(/^model (\w+) \{/gm))
    if (modelNames.has(m[1]))
      label(
        add(
          "operational-model",
          m[1],
          "OperationalModel",
          "prisma/schema.prisma",
          "/model/" + m[1],
          { count: null },
        ),
        m[1],
        "model",
      );
  const paths = new Set(
    sourcePaths.filter(
      (path) =>
        INPUT_FILES.includes(path) ||
        INPUT_PREFIXES.some((prefix) => path.startsWith(prefix)),
    ),
  );
  for (const path of Object.keys(require.cache)) {
    const p = relative(repo, path);
    if (
      !p.startsWith("..") &&
      !p.startsWith("node_modules/") &&
      p !== "package.json"
    )
      paths.add(p);
  }
  // Build outputs are not inputs: no circular hash or accidental private artifact import.
  for (const path of [...paths])
    if (path.startsWith("ontology/source-manifests/") && path !== officialPath)
      paths.delete(path);
  const inputs = readSourceInputManifest({ read: bytes }, [...paths]);
  verifySourceInputManifest(port, inputs);
  verifySourceInputManifest(actualPort, inputs);
  const payload: Omit<MathOntologySourcePayload, "versions"> = {
    schemaVersion: 1,
    adapterVersion: MATH_ONTOLOGY_SOURCE_ADAPTER_VERSION,
    inputs,
    records,
    assertions,
    expectedCoverage: Object.entries(
      EXPECTED_MATH_ONTOLOGY_ADAPTER_COVERAGE,
    ).map(([namespace, expected]) => ({
      namespace: namespace as MathOntologySourceNamespace,
      expected,
    })),
  };
  return sealMathOntologySourcePayload(payload);
}

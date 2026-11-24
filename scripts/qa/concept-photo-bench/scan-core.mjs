/** Deterministic scoring, abstention, token estimates. No model/production calls. */
export const TAGS = [
  "clear",
  "faint",
  "erased",
  "outside",
  "red-overlap",
  "blank",
];
export function normalize(value) {
  return String(value)
    .normalize("NFC")
    .replace(/\\\(|\\\)|\$/g, "")
    .replace(/\^\{\\circ\}|\^\\circ/g, "°")
    .replace(/(\d)\s*도/g, "$1°")
    .replace(/[−–]/g, "-")
    .replace(/✕/g, "×")
    .replace(/\s/g, "");
}
export function validateRead(result, allowed) {
  if (!result || !Array.isArray(result.slots))
    throw new Error("Missing slots array");
  const seen = new Set();
  for (const s of result.slots) {
    if (
      !/^q[1-9]\d*\.(b[1-9]\d*|answer)$/.test(s.id) ||
      seen.has(s.id) ||
      (allowed && !allowed.includes(s.id))
    )
      throw new Error("Invalid/duplicate/unexpected slot id");
    seen.add(s.id);
    if (
      !["read", "blank", "uncertain", "unreadable"].includes(s.status) ||
      typeof s.text !== "string" ||
      s.text.length > 2000
    )
      throw new Error("Invalid slot status/text");
    if (s.status === "blank" && s.text !== "")
      throw new Error("Blank must have empty text");
    if (s.status === "read" && !s.text.trim())
      throw new Error("Read must have visible text");
    if (
      s.tags &&
      (!Array.isArray(s.tags) || s.tags.some((t) => !TAGS.includes(t)))
    )
      throw new Error("Invalid category");
  }
  return result;
}
export function consensus(a, b, expectedIds) {
  validateRead(a);
  validateRead(b);
  const aa = new Map(a.slots.map((s) => [s.id, s])),
    bb = new Map(b.slots.map((s) => [s.id, s]));
  if (
    expectedIds &&
    [...aa.keys(), ...bb.keys()].some((id) => !expectedIds.includes(id))
  )
    throw new Error("Reference has an unexpected slot");
  return [...new Set([...(expectedIds || []), ...aa.keys(), ...bb.keys()])]
    .sort((x, y) => x.localeCompare(y, undefined, { numeric: true }))
    .map((id) => {
      const x = aa.get(id),
        y = bb.get(id);
      const agrees =
        x &&
        y &&
        ["read", "blank"].includes(x.status) &&
        x.status === y.status &&
        normalize(x.text) === normalize(y.text);
      return {
        id,
        referenceStatus: agrees ? "candidate" : "human-review",
        text: agrees ? x.text : null,
        status: agrees ? x.status : null,
        tags: [...new Set([...(x?.tags || []), ...(y?.tags || [])])],
        sources: [x || null, y || null],
      };
    });
}
export function reconcile(a, b, ids) {
  const aa = new Map(a.slots.map((s) => [s.id, s])),
    bb = new Map(b.slots.map((s) => [s.id, s]));
  return {
    slots: ids.map((id) => {
      const x = aa.get(id),
        y = bb.get(id);
      return x &&
        y &&
        x.status === y.status &&
        normalize(x.text) === normalize(y.text)
        ? x
        : {
            id,
            status: "uncertain",
            text: "",
            reason: "independent-disagreement",
          };
    }),
  };
}
export function compareTranscription(
  reference,
  observed,
  metadata = {},
  options = {},
) {
  const a = normalize(reference),
    b = normalize(observed);
  if (a === b) return { equal: true };
  if (
    options.allowDegreeRing &&
    metadata.handwrittenAngle &&
    /^\d+(?:\.\d+)?°$/.test(a) &&
    b === a.slice(0, -1) + "˚"
  )
    return { equal: true, notation: "degree-ring-v1.2" };
  if (
    metadata.numericMultiplier &&
    /^×\d+$/.test(a) &&
    /^[xX]\d+$/.test(b) &&
    a.slice(1) === b.slice(1)
  )
    return { equal: true, notation: "multiplication-glyph" };
  const labels = (value) => {
    let out = value.replace(/([가-힣])\.$/, "$1");
    for (const label of metadata.textLabels || [])
      out = out.replace(label + ":", label + "=");
    return out;
  };
  if (labels(a) === labels(b))
    return { equal: true, notation: "sentence-punctuation" };
  const unitOmission =
    !!metadata.handwrittenAngle &&
    /^\d+(?:\.\d+)?°$/.test(a) &&
    a.slice(0, -1) === b;
  return { equal: false, unitOmission };
}
export function scoreRead(truth, result, metadata = {}, options = {}) {
  const got = new Map((result?.slots || []).map((s) => [s.id, s]));
  const count = {
    correct: 0,
    wrong: 0,
    abstain: 0,
    missing: 0,
    unresolved: 0,
    errors: [],
    cells: [],
    allStatuses: { read: 0, blank: 0, uncertain: 0, unreadable: 0, missing: 0 },
    unresolvedConfident: 0,
    strictWrong: 0,
    notation: 0,
    lateNotation: 0,
    unitOmissions: 0,
  };
  for (const t of truth) {
    const s = got.get(t.id);
    count.allStatuses[s?.status || "missing"]++;
    if (
      t.referenceStatus !== "candidate" &&
      s &&
      ["read", "blank"].includes(s.status)
    )
      count.unresolvedConfident++;
    let kind =
      t.referenceStatus !== "candidate"
        ? "unresolved"
        : !s
          ? "missing"
          : ["uncertain", "unreadable"].includes(s.status)
            ? "abstain"
            : s.status === t.status && normalize(s.text) === normalize(t.text)
              ? "correct"
              : "wrong";
    let difference = {};
    if (kind === "wrong") {
      count.strictWrong++;
      if (s.status === "read" && t.status === "read")
        difference = compareTranscription(
          t.text,
          s.text,
          metadata[t.id],
          options,
        );
      if (difference.equal) {
        kind = "correct";
        count.notation++;
        if (difference.notation === "degree-ring-v1.2") count.lateNotation++;
      }
      if (difference.unitOmission) count.unitOmissions++;
    }
    count[kind]++;
    const row = {
      id: t.id,
      kind,
      reference: t.text,
      read: s?.text ?? null,
      status: s?.status ?? "missing",
      tags: t.tags,
      ...difference,
    };
    count.cells.push(row);
    if (kind === "wrong") count.errors.push(row);
  }
  return count;
}
export function tokenCost(model, calls) {
  const rates = {
    "claude-haiku-5-5": [0.1, 0.5],
    "claude-sonnet-5-5": [2, 10],
    "claude-opus-5-5": [4, 20],
  };
  let input = 0,
    output = 0;
  for (const c of calls) {
    const u = c.usage;
    if (
      !u ||
      !Number.isFinite(u.input_tokens) ||
      !Number.isFinite(u.output_tokens)
    )
      return { input: null, output: null, usd: null };
    input +=
      u.input_tokens +
      (u.cache_read_input_tokens || 0) +
      (u.cache_creation_input_tokens || 0);
    output += u.output_tokens;
  }
  return {
    input,
    output,
    usd: (input * rates[model][0] + output * rates[model][1]) / 1e6,
  };
}
export function rankRows(rows) {
  return rows
    .filter((r) => r.complete && r.failures === 0 && r.missing === 0)
    .sort(
      (a, b) =>
        a.wrong - b.wrong ||
        a.abstain - b.abstain ||
        (a.newPageMedianMs ?? a.medianMs ?? 0) -
          (b.newPageMedianMs ?? b.medianMs ?? 0),
    );
}
export function median(values) {
  const v = [...values].sort((a, b) => a - b);
  return v.length
    ? (v[Math.floor((v.length - 1) / 2)] + v[Math.floor(v.length / 2)]) / 2
    : null;
}

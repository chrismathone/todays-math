/**
 * Everything one command needs about one source, loaded once and bound by hash:
 * the frozen record and clock identity, the measured loudness, measured onsets,
 * stored recognitions, search hints, generation quotes and certificate rows.
 */
import { readFileSync } from "node:fs";
import { energyAtDbfs } from "../../claude/lib/activity.mjs";
import { onsetCandidates } from "../../claude/lib/candidates.mjs";
import { ABSOLUTE, Hold, NOISE_TIERS, RULES, noiseFloor } from "./rules.mjs";
import {
  MAIN,
  OUT,
  ProbeStore,
  TOOLS,
  clockIdentity,
  loadBaseline,
  loadGeneration,
  loadHints,
  loadNativeCache,
} from "./store.mjs";

const PILOT_PLAN =
  MAIN + "/.qa-artifacts/listening-seek-research-20261006/pilot-plan.json";

export function openSession(values = {}) {
  const baseline = loadBaseline({
    inventory: values.inventory,
    inventorySha256: values["inventory-sha256"],
    clock: values.clock,
    clockSha256: values["clock-sha256"],
    certificate: values.certificate,
    certificateSha256: values["certificate-sha256"],
  });
  const out = values.out ?? OUT;
  const store = new ProbeStore([out, ...TOOLS.priorProbeRoots]);
  const worlds = new Map();

  /** Source ids of a named scope, in inventory order. */
  const scope = (name, explicit) => {
    const all = baseline.inventory.records;
    if (explicit?.length)
      return all
        .filter((r) => explicit.includes(r.sourceRecordId))
        .map((r) => r.sourceRecordId);
    if (name === "pilot") {
      const plan = JSON.parse(readFileSync(PILOT_PLAN, "utf8"));
      const wanted = new Set(plan.candidateQuestions.map((q) => q.sourceRecordId));
      return all
        .filter((r) => wanted.has(r.sourceRecordId))
        .map((r) => r.sourceRecordId);
    }
    if (name === "reconstructed")
      return all.filter((r) => r.reconstructed).map((r) => r.sourceRecordId);
    throw new Error("Unknown scope: " + name);
  };

  const world = (sourceRecordId) => {
    if (worlds.has(sourceRecordId)) return worlds.get(sourceRecordId);
    const record = baseline.recordById.get(sourceRecordId);
    if (!record) throw new Error("Unknown source: " + sourceRecordId);
    const identity = clockIdentity(
      record,
      baseline.clockBySource.get(sourceRecordId),
    );
    const certRows = baseline.certBySource.get(sourceRecordId) ?? [];
    let value = { record, identity, certRows };
    if (!identity.unavailable) {
      const native = loadNativeCache(out, record, identity);
      const frames = native.windowFrames;
      const threshold = energyAtDbfs(RULES.quietThresholdDbfs, frames);
      // Measured onsets: after absolute quiet under the normal and the finer
      // island split, and after a stationary noise floor (two seconds, else one).
      const onsets = new Map();
      const soundFrom = (onsetWindow, limit) => {
        let sound = 0;
        const end = Math.min(
          native.energy.length,
          onsetWindow + RULES.soundAfterOnsetSpanWindows,
        );
        for (let w = onsetWindow; w < end; w++)
          if (native.energy[w] >= limit) sound++;
        return sound;
      };
      for (const split of [15, 5])
        for (const candidate of onsetCandidates(native.energy, frames, split)) {
          if (onsets.has(candidate.onsetWindow) || candidate.startWindow < 0)
            continue;
          onsets.set(candidate.onsetWindow, {
            onsetWindow: candidate.onsetWindow,
            startWindow: candidate.startWindow,
            quietWindows: candidate.quietWindows,
            soundWindows: soundFrom(candidate.onsetWindow, threshold),
            method: ABSOLUTE,
          });
        }
      for (let at = 50; at + 5 <= native.energy.length; at++) {
        if (onsets.has(at) || native.energy[at] <= native.energy[at - 1])
          continue;
        for (const [method, windows] of Object.entries(NOISE_TIERS)) {
          let noise;
          try {
            noise = noiseFloor(native, at, windows);
          } catch (error) {
            if (!(error instanceof Hold)) throw error;
            continue;
          }
          onsets.set(at, {
            onsetWindow: at,
            startWindow: at - RULES.leadWindows,
            quietWindows: windows,
            soundWindows: soundFrom(at, noise.limit),
            method,
          });
          break;
        }
      }
      const listenings = store.listenings(record, identity);
      value = {
        ...value,
        native,
        onsets: [...onsets.values()].sort((a, b) => a.onsetWindow - b.onsetWindow),
        koListenings: listenings.filter(
          (l) => l.language === "ko" && l.onsetFrame !== null,
        ),
        enListenings: listenings.filter((l) => l.language === "en"),
        allListenings: listenings,
        hints: loadHints(record),
        generation: record.reconstructed ? loadGeneration(record) : null,
      };
    }
    worlds.set(sourceRecordId, value);
    return value;
  };

  /** Long-quiet onsets between two frames and how many a Korean probe began at. */
  const terminalScan = (w) => (fromFrame, toFrame) => {
    const frames = w.native.windowFrames;
    const listened = new Set(w.koListenings.map((l) => l.startFrame));
    const wanted = w.onsets.filter(
      (o) =>
        o.quietWindows >= 50 &&
        o.soundWindows >= RULES.minimumSoundAfterOnsetWindows &&
        o.startWindow * frames > fromFrame &&
        (toFrame === undefined || o.startWindow * frames <= toFrame),
    );
    const missing = wanted.filter((o) => !listened.has(o.startWindow * frames));
    return {
      onsetsAfterLongQuiet: wanted.length,
      missing: missing.length,
      missingStartFrames: missing.map((o) => o.startWindow * frames),
    };
  };

  return { baseline, out, store, scope, world, terminalScan };
}

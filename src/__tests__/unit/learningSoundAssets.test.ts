import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEARNING_SOUND_FILES,
  LEARNING_SOUND_GAIN,
} from "@/lib/math-srs/learningSoundManifest";
const root = resolve(process.cwd(), "public/audio/math-learning");
describe("shipped CC0 learning samples", () => {
  it("ships exactly the reviewed samples with their original license", () => {
    expect(readdirSync(root).sort()).toEqual([
      "LICENSE.txt",
      "README.md",
      "complete.wav",
      "correct.wav",
      "neutral.wav",
    ]);
    expect(readFileSync(resolve(root, "LICENSE.txt"), "utf8")).toContain(
      "Creative Commons Zero",
    );
    expect(LEARNING_SOUND_GAIN).toBe(0.2);
  });
  it.each(Object.entries(LEARNING_SOUND_FILES))(
    "verifies %s bytes, PCM duration and peak before gain",
    (cue, file) => {
      const data = readFileSync(resolve(root, file.url.split("/").at(-1)!));
      expect(data.length).toBe(file.bytes);
      expect(createHash("sha256").update(data).digest("hex")).toBe(file.sha256);
      expect(data.toString("ascii", 0, 4)).toBe("RIFF");
      expect(data.toString("ascii", 8, 12)).toBe("WAVE");
      expect(data.readUInt16LE(20)).toBe(1);
      expect(data.readUInt16LE(22)).toBe(1);
      expect(data.readUInt16LE(34)).toBe(16);
      expect(data.readUInt32LE(24)).toBe(44100);
      const seconds = (data.length - 44) / (44100 * 2);
      expect(seconds).toBeCloseTo(file.durationSeconds, 6);
      expect(seconds).toBeLessThan(cue === "complete" ? 0.8 : 0.4);
      let peak = 0;
      for (let i = 44; i < data.length; i += 2)
        peak = Math.max(peak, Math.abs(data.readInt16LE(i) / 32768));
      expect(peak * LEARNING_SOUND_GAIN).toBeLessThan(0.2);
    },
  );
});

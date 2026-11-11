import { it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { ontologyModelConfig } from "@/lib/math-ontology/retrieval/config.server";
import { insightModelConfig } from "@/lib/math-insight/config";
import { API_KEY_NAMES, API_MODELS } from "@/lib/studio-ai/routing";
const environment = (): NodeJS.ProcessEnv => ({
  NODE_ENV: "test",
  MATH_INSIGHT_VENDOR: "gemini",
  MATH_INSIGHT_MODEL: API_MODELS.gemini[0],
  [API_KEY_NAMES.gemini]: "synthetic-test-only",
  [API_KEY_NAMES.anthropic]: "synthetic-test-only",
});
it("keeps the existing feature untouched and falls back exactly when ontology overrides are absent", () => {
  const env = environment(),
    before = { ...env };
  expect(ontologyModelConfig(env)).toEqual(insightModelConfig(env));
  expect(env).toEqual(before);
  env.MATH_ONTOLOGY_VENDOR = "anthropic";
  env.MATH_ONTOLOGY_MODEL = "claude-opus-5";
  expect(ontologyModelConfig(env)).toEqual({
    vendor: "anthropic",
    model: "claude-opus-5",
  });
  expect(insightModelConfig(env)).toEqual({
    vendor: "gemini",
    model: API_MODELS.gemini[0],
  });
  expect(env.MATH_INSIGHT_VENDOR).toBe("gemini");
});
it("inherits the Claude default when neither feature names a vendor (원장님 2026-11-11)", () => {
  const env: NodeJS.ProcessEnv = {
    NODE_ENV: "test",
    [API_KEY_NAMES.anthropic]: "synthetic-test-only",
  };
  expect(ontologyModelConfig(env)).toEqual({
    vendor: "anthropic",
    model: "claude-sonnet-5-5",
  });
  // 온톨로지만 모델을 바꾸면 물려받는 공급자(Claude) 안에서 바꾼다
  env.MATH_ONTOLOGY_MODEL = "claude-opus-5-5";
  expect(ontologyModelConfig(env)).toEqual({
    vendor: "anthropic",
    model: "claude-opus-5-5",
  });
});
it("selects a vendor-local default for a vendor-only override and fails closed on invalid explicit config", () => {
  const env = environment();
  env.MATH_ONTOLOGY_VENDOR = "anthropic";
  expect(ontologyModelConfig(env)?.vendor).toBe("anthropic");
  env.MATH_ONTOLOGY_MODEL = "unregistered-model";
  expect(ontologyModelConfig(env)).toBeNull();
  env.MATH_ONTOLOGY_VENDOR = "unregistered-vendor";
  expect(ontologyModelConfig(env)).toBeNull();
});

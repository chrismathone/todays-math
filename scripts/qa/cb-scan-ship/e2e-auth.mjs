// Deliberately unusable: the local harness must inject its synthetic actor explicitly.
export async function auth() {
  throw new Error("Local scan QA requires an injected actor");
}

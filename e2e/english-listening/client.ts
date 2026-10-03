/** Local development transport only: no authentication, persistence or production API. */
export async function fixtureRequest<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/__harness/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok || !result.ok)
    throw new Error(result.error ?? "Fixture request failed");
  return result.data as T;
}

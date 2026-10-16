export class ApiError extends Error {}

export async function api<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new ApiError(data.error || "Er ging iets mis.");
  return data as T;
}

import { ZodError } from "zod";
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
  }
}
export const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie, Authorization",
};
export function json(data: unknown, status = 200, extra: HeadersInit = {}) {
  return Response.json(data, { status, headers: { ...privateHeaders, ...extra } });
}
export function handleError(error: unknown) {
  if (error instanceof ZodError)
    return json(
      {
        error: {
          code: "INVALID_INPUT",
          message: "Check the request fields.",
          issues: error.issues.map(i => ({ path: i.path.join("."), message: i.message })),
        },
      },
      400,
    );
  if (error instanceof ApiError)
    return json(
      { error: { code: error.code, message: error.message } },
      error.status,
      error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {},
    );
  // Do not log exception objects: database drivers can include values and connection strings.
  return json(
    {
      error: { code: "UNAVAILABLE", message: "Moni is temporarily unavailable. Please try again." },
    },
    503,
  );
}
export async function endpoint(work: () => Promise<Response>) {
  try {
    return await work();
  } catch (e) {
    return handleError(e);
  }
}
export async function readJson(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    throw new ApiError(415, "CONTENT_TYPE", "Use application/json.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "INVALID_JSON", "A JSON body is required.");
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 4096) {
      await reader.cancel();
      throw new ApiError(413, "BODY_TOO_LARGE", "Keep the request under 4 KB.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Provide valid JSON.");
  }
}

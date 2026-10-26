import { authorize } from "@/server/api";
import { endpoint, json, readJson } from "@/server/errors";
import { transactionSchema } from "@/lib/validation";
import { createTransaction } from "@/server/transactions";
export async function POST(request: Request) {
  return endpoint(async () => {
    const db = await authorize(request);
    const result = await createTransaction(
      db,
      transactionSchema.parse(await readJson(request)),
      request.headers.get("idempotency-key"),
    );
    return json(result, result.replayed ? 200 : 201);
  });
}

import { authorize } from "@/server/api";
import { endpoint, json, readJson } from "@/server/errors";
import { querySchema, transactionSchema } from "@/lib/validation";
import { createTransaction, listTransactions } from "@/server/transactions";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return endpoint(async () => {
    const db = await authorize(request, true);
    const result = await createTransaction(
      db,
      transactionSchema.parse(await readJson(request)),
      request.headers.get("idempotency-key"),
    );
    return json(result, result.replayed ? 200 : 201, {
      "Idempotency-Replayed": String(result.replayed),
    });
  });
}
export async function GET(request: Request) {
  return endpoint(async () => {
    const db = await authorize(request);
    return json(
      await listTransactions(
        db,
        querySchema.parse(Object.fromEntries(new URL(request.url).searchParams)),
      ),
    );
  });
}

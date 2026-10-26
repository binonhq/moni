import { authorize } from "@/server/api";
import { endpoint, json, privateHeaders, readJson } from "@/server/errors";
import { updateSchema } from "@/lib/validation";
import { deleteTransaction, updateTransaction } from "@/server/transactions";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  return endpoint(async () => {
    const { db, userId } = await authorize(request);
    return json({
      data: await updateTransaction(
        db,
        (await context.params).id,
        updateSchema.parse(await readJson(request)), userId,
      ),
    });
  });
}
export async function DELETE(request: Request, context: Context) {
  return endpoint(async () => {
    const { db, userId } = await authorize(request);
    await deleteTransaction(db, (await context.params).id, userId);
    return new Response(null, { status: 204, headers: privateHeaders });
  });
}

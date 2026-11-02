import { authorize } from "@/server/api";
import { endpoint, json } from "@/server/errors";
import { deleteGoldPurchase } from "@/server/gold";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return endpoint(async () => {
    const { db, userId } = await authorize(request);
    await deleteGoldPurchase(db, (await context.params).id, userId);
    return json({ deleted: true });
  });
}

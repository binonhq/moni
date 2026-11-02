import { authorize } from "@/server/api";
import { endpoint, json, readJson } from "@/server/errors";
import { deleteAssetCategory, saveAssetCategory } from "@/server/asset-categories";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return endpoint(async () => {
    const { db, userId } = await authorize(request);
    return json({
      data: await saveAssetCategory(db, userId, await readJson(request), (await context.params).id),
    });
  });
}
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return endpoint(async () => {
    const { db, userId } = await authorize(request);
    await deleteAssetCategory(db, userId, (await context.params).id);
    return new Response(null, { status: 204 });
  });
}

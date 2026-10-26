import { authorize } from "@/server/api";
import { endpoint, privateHeaders } from "@/server/errors";
import { deleteCategory } from "@/server/categories";
type Context = { params: Promise<{ id: string }> };
export async function DELETE(request: Request, context: Context) {
  return endpoint(async () => {
    const { db, userId } = await authorize(request);
    await deleteCategory(db, (await context.params).id, userId);
    return new Response(null, { status: 204, headers: privateHeaders });
  });
}

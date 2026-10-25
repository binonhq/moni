import { authorize } from "@/server/api";
import { endpoint, privateHeaders } from "@/server/errors";
import { deleteCategory } from "@/server/categories";
type Context = { params: Promise<{ id: string }> };
export async function DELETE(request: Request, context: Context) {
  return endpoint(async () => {
    const db = await authorize(request);
    await deleteCategory(db, (await context.params).id);
    return new Response(null, { status: 204, headers: privateHeaders });
  });
}

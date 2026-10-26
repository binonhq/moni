import { authorize } from "@/server/api";
import { endpoint, json, readJson } from "@/server/errors";
import { createCategory, listCategories } from "@/server/categories";
export async function GET(request: Request) {
  return endpoint(async () => { const { db, userId } = await authorize(request); return json({ data: await listCategories(db, userId) }); });
}
export async function POST(request: Request) {
  return endpoint(async () => {
    const { db, userId } = await authorize(request);
    return json({ data: await createCategory(db, await readJson(request), userId) }, 201);
  });
}

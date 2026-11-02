import { authorize } from "@/server/api";
import { endpoint, json, readJson } from "@/server/errors";
import { createAssetCheckpoint, listAssetCheckpoints } from "@/server/checkpoints";

export async function POST(request: Request) {
  return endpoint(async () => {
    const { db, userId } = await authorize(request);
    const id = await createAssetCheckpoint(db, await readJson(request), userId);
    const checkpoints = await listAssetCheckpoints(db, userId);
    return json({ data: checkpoints.find(item => item.id === id) }, 201);
  });
}

export async function GET(request: Request) {
  return endpoint(async () => {
    const { db, userId } = await authorize(request);
    return json({ data: await listAssetCheckpoints(db, userId) });
  });
}

import { authorize } from "@/server/api";
import { endpoint, json } from "@/server/errors";
import { getGoldPortfolio } from "@/server/gold";
import { listAssetCheckpoints } from "@/server/checkpoints";

export async function GET(request: Request) {
  return endpoint(async () => {
    const { db, userId } = await authorize(request);
    const [gold, checkpoints] = await Promise.all([
      getGoldPortfolio(db, userId),
      listAssetCheckpoints(db, userId),
    ]);
    return json({ gold, checkpoints });
  });
}

import { authorize } from "@/server/api";
import { endpoint, json } from "@/server/errors";
import { getGoldHistory } from "@/server/gold";

export async function GET(request: Request) {
  return endpoint(async () => {
    const { db } = await authorize(request);
    const code = new URL(request.url).searchParams.get("code") ?? "KGB";
    return json({ data: await getGoldHistory(db, code) });
  });
}

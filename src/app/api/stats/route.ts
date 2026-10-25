import { authorize } from "@/server/api";
import { endpoint, json } from "@/server/errors";
import { monthSchema } from "@/lib/validation";
import { localMonth } from "@/lib/dates";
import { getStats } from "@/server/stats";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return endpoint(async () => {
    const db = await authorize(request);
    const month = monthSchema.parse(new URL(request.url).searchParams.get("month") ?? localMonth());
    return json({ data: await getStats(db, month) });
  });
}

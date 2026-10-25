import { authorize } from "@/server/api";
import { endpoint, privateHeaders } from "@/server/errors";
import { listTransactions } from "@/server/transactions";
import { localDay } from "@/lib/dates";
export const maxDuration = 60;
export async function GET(request: Request) {
  return endpoint(async () => {
    const db = await authorize(request);
    // A repeatable-read transaction produces a consistent export during concurrent ingestion.
    const csv = await db.transaction(async tx => {
      let cursor: string | undefined;
      const rows = ["\uFEFFid,amount_vnd,timestamp_utc,date_vietnam,created_at_utc"];
      do {
        const page = await listTransactions(tx as unknown as typeof db, { limit: 100, cursor });
        for (const t of page.data) rows.push(`${t.id},${t.amount},${t.timestamp},${localDay(t.timestamp)},${t.createdAt}`);
        cursor = page.nextCursor ?? undefined;
      } while (cursor);
      return rows.join("\r\n");
    }, { isolationLevel: "repeatable read", accessMode: "read only" });
    return new Response(csv, { headers: { ...privateHeaders, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="moni-${localDay()}.csv"` } });
  });
}

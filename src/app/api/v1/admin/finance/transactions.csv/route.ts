import { apiHandler, parseQuery } from "@/server/lib/api-handler";
import { file } from "@/server/lib/response";
import { periodQuerySchema } from "@/server/modules/finance/finance.schema";
import * as financeService from "@/server/modules/finance/finance.service";

/** A file download, not an envelope. The client links to it with a plain <a href>. */
export const GET = apiHandler("admin", async ({ req }) => {
  const { filename, csv } = await financeService.transactionsCsv(parseQuery(req, periodQuerySchema));
  return file(csv, { contentType: "text/csv; charset=utf-8", filename });
});

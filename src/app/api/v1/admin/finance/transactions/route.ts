import { apiHandler, parseQuery } from "@/server/lib/api-handler";
import { ok } from "@/server/lib/response";
import { transactionsQuerySchema } from "@/server/modules/finance/finance.schema";
import * as financeService from "@/server/modules/finance/finance.service";

export const GET = apiHandler("admin", async ({ req }) => ok(await financeService.transactions(parseQuery(req, transactionsQuerySchema))));

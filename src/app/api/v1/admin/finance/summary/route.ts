import { apiHandler, parseQuery } from "@/server/lib/api-handler";
import { ok } from "@/server/lib/response";
import { periodQuerySchema } from "@/server/modules/finance/finance.schema";
import * as financeService from "@/server/modules/finance/finance.service";

export const GET = apiHandler("admin", async ({ req }) => ok(await financeService.summary(parseQuery(req, periodQuerySchema))));

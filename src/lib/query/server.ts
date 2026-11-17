import "server-only";
import { QueryClient } from "@tanstack/react-query";
import { cache } from "react";
import { queryDefaults } from "./defaults";

/** One QueryClient per request, shared by every Server Component in that request. */
export const getServerQueryClient = cache(() => new QueryClient({ defaultOptions: queryDefaults }));

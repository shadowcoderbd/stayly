import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/lib/better-auth";

export const { GET, POST } = toNextJsHandler(auth);

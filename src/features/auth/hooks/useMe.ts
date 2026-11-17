import { useQuery } from "@tanstack/react-query";
import { authQueries } from "../queries";

export function useMe() {
  const { data, isPending } = useQuery(authQueries.me());
  const user = data?.user ?? null;
  return { user, isSignedIn: !!user, isAdmin: user?.role === "admin", isLoading: isPending };
}

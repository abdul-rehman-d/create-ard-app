import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function useTasks(enabled = true) {
  const result = useQuery(api.tasks.list, enabled ? {} : "skip");

  return {
    data: result ?? [],
    isLoading: enabled && result === undefined,
    isEmpty: result !== undefined && result.length === 0,
  };
}

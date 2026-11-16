import type { ResumenDashboard } from "@/features/dashboard/types";
import { apiClient } from "@/lib/api-client";

export async function obtenerResumen(): Promise<ResumenDashboard> {
  const { data } = await apiClient.get<ResumenDashboard>("/dashboard/resumen");
  return data;
}

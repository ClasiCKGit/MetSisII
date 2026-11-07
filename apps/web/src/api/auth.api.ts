import type { Perfil, Sesion } from "@/features/auth/types";
import type { LoginInput } from "@/features/auth/schemas";
import { apiClient } from "@/lib/api-client";

export async function login(input: LoginInput): Promise<Sesion> {
  const { data } = await apiClient.post<Sesion>("/auth/login", input);
  return data;
}

export async function getMe(): Promise<Perfil> {
  const { data } = await apiClient.get<Perfil>("/auth/me");
  return data;
}

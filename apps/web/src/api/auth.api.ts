import type { Perfil, RegisterPayload, Sesion } from "@/features/auth/types";
import type { LoginInput } from "@/features/auth/schemas";
import { apiClient } from "@/lib/api-client";

export async function login(input: LoginInput): Promise<Sesion> {
  const { data } = await apiClient.post<Sesion>("/auth/login", input);
  return data;
}

export async function registerGimnasio(payload: RegisterPayload): Promise<Sesion> {
  const { data } = await apiClient.post<Sesion>("/auth/register-gimnasio", payload);
  return data;
}

export async function getMe(): Promise<Perfil> {
  const { data } = await apiClient.get<Perfil>("/auth/me");
  return data;
}

// La API cierra todas las sesiones del usuario (incluida la actual) y devuelve una nueva
export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<Sesion> {
  const { data } = await apiClient.post<Sesion>("/auth/change-password", input);
  return data;
}

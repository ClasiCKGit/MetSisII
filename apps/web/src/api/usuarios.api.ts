import type {
  CrearUsuarioInput,
  EditarUsuarioInput,
  ResetPasswordInput,
} from "@/features/usuarios/schemas";
import type { UsuarioListado } from "@/features/usuarios/types";
import { apiClient } from "@/lib/api-client";

export async function listarUsuarios(): Promise<UsuarioListado[]> {
  const { data } = await apiClient.get<UsuarioListado[]>("/usuarios");
  return data;
}

export async function crearUsuario(input: CrearUsuarioInput): Promise<UsuarioListado> {
  const { data } = await apiClient.post<UsuarioListado>("/usuarios", input);
  return data;
}

// PATCH: solo se envían los campos que cambian
export async function actualizarUsuario(
  id: string,
  cambios: Partial<EditarUsuarioInput> & { activo?: boolean }
): Promise<UsuarioListado> {
  const { data } = await apiClient.patch<UsuarioListado>(`/usuarios/${id}`, cambios);
  return data;
}

export async function resetearPassword(id: string, input: ResetPasswordInput): Promise<void> {
  await apiClient.post(`/usuarios/${id}/reset-password`, input);
}

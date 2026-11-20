import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Perfil, Sesion } from "@/features/auth/types";

export type AuthStatus = "unauthenticated" | "checking" | "authenticated";

interface AuthState {
  token: string | null;
  usuario: Perfil["usuario"] | null;
  gimnasio: Perfil["gimnasio"] | null;
  // Último gimnasio con el que se inició sesión, para no volver a escribirlo
  ultimoSlug: string;

  setSession: (sesion: Sesion) => void;
  setProfile: (perfil: Perfil) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      usuario: null,
      gimnasio: null,
      ultimoSlug: "",

      setSession: ({ token, usuario, gimnasio }) =>
        set({ token, usuario, gimnasio, ultimoSlug: gimnasio.slug }),
      setProfile: ({ usuario, gimnasio }) => set({ usuario, gimnasio }),
      // ultimoSlug se conserva a propósito: no es un dato de la sesión
      logout: () => set({ token: null, usuario: null, gimnasio: null }),
    }),
    {
      name: "fitmanager-auth",
      storage: createJSONStorage(() => localStorage),
      // Solo se guarda en localStorage lo imprescindible. El usuario y el gimnasio
      // NO se guardan: se piden de nuevo a la API (GET /me) al abrir la app, así el
      // rol y los datos siempre están actualizados.
      partialize: (state) => ({
        token: state.token,
        ultimoSlug: state.ultimoSlug,
      }),
    }
  )
);

// El estado de la sesión se DERIVA de los datos, no se guarda en una variable aparte:
// una variable "status" se podría desincronizar de "token" y "usuario".
export function getAuthStatus(state: Pick<AuthState, "token" | "usuario">): AuthStatus {
  if (!state.token) return "unauthenticated";
  return state.usuario ? "authenticated" : "checking";
}

// Devuelve un string (un valor primitivo), por eso es seguro como selector
export function useAuthStatus(): AuthStatus {
  return useAuthStore(getAuthStatus);
}

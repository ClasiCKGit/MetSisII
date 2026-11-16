import axios from "axios";
import { env } from "@/config/env";
import { cerrarSesion } from "@/features/auth/session";
import { toApiError } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth.store";

export const apiClient = axios.create({
  baseURL: `${env.VITE_API_URL}/api`,
  timeout: 15_000,
});

// REQUEST: antes de enviar cada petición, se le agrega el token (si hay sesión).
// Esto no ocurre dentro de un componente de React, así que no se puede usar el hook
// useAuthStore(): se usa getState(), que lee el valor actual del store desde cualquier lado.
apiClient.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

// En estas rutas un 401 significa "credenciales incorrectas", no "sesión vencida"
const RUTAS_SIN_SESION = ["/auth/login", "/auth/register-gimnasio"];

// RESPONSE: todo error se convierte en un ApiError, y un 401 en cualquier otra ruta
// significa que el token venció o el usuario fue desactivado: se cierra la sesión.
// Las rutas protegidas se encargan solas de redirigir al login.
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error);
    const config = axios.isAxiosError(error) ? error.config : undefined;
    const url = config?.url ?? "";
    const eraRutaSinSesion = RUTAS_SIN_SESION.some((ruta) => url.endsWith(ruta));

    // Solo cierra la sesión un 401 de una petición hecha con el token actual. Una respuesta
    // que llega tarde, de una sesión que ya se cerró, no debe cerrar la que se abrió después.
    const { token } = useAuthStore.getState();
    const eraDeLaSesionActual =
      token !== null && config?.headers.get("Authorization") === `Bearer ${token}`;

    if (apiError.status === 401 && !eraRutaSinSesion && eraDeLaSesionActual) {
      cerrarSesion();
    }
    return Promise.reject(apiError);
  }
);

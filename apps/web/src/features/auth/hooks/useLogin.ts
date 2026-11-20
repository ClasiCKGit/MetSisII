import { useMutation } from "@tanstack/react-query";
import { login } from "@/api/auth.api";
import { useAuthStore } from "@/store/auth.store";

export function useLogin() {
  // Selector que devuelve UNA función del store (las acciones son estables)
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: login,
    onSuccess: (sesion) => setSession(sesion),
  });
}

import { useMutation } from "@tanstack/react-query";
import { changePassword } from "@/api/auth.api";
import { toast } from "@/components/ui/toast";
import { useAuthStore } from "@/store/auth.store";
import type { ChangePasswordInput } from "../schemas";

export function useChangePassword() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    // El campo de confirmación es solo del formulario: la API no lo recibe
    mutationFn: ({ currentPassword, newPassword }: ChangePasswordInput) =>
      changePassword({ currentPassword, newPassword }),
    // El token anterior quedó invalidado: sin guardar el nuevo, el próximo request daría 401
    onSuccess: (sesion) => {
      setSession(sesion);
      toast.add({ type: "success", title: "Contraseña actualizada" });
    },
  });
}

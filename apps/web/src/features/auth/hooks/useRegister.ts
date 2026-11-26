import { useMutation } from "@tanstack/react-query";
import { registerGimnasio } from "@/api/auth.api";
import { toast } from "@/components/ui/toast";
import { useAuthStore } from "@/store/auth.store";
import { toRegisterPayload, type RegisterInput } from "../schemas";

export function useRegister() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: (valores: RegisterInput) => registerGimnasio(toRegisterPayload(valores)),
    onSuccess: (sesion) => {
      // El registro ya devuelve una sesión: el usuario queda adentro sin pasar por el login
      setSession(sesion);
      toast.add({
        type: "success",
        title: "¡Gimnasio creado!",
        description: `Ya podés usar FitManager en ${sesion.gimnasio.nombre}.`,
      });
    },
  });
}

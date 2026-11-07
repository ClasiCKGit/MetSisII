import { z } from "zod";

// Las mismas reglas que valida la API (apps/api/src/modules/auth/auth.schema.ts):
// se validan también acá para avisar antes de hacer la petición.
export const loginSchema = z.object({
  gimnasioSlug: z.string().trim().toLowerCase().min(1, "Ingresá el identificador de tu gimnasio"),
  email: z.string().trim().min(1, "Ingresá tu email").pipe(z.email("El email no es válido")),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

export type LoginInput = z.infer<typeof loginSchema>;

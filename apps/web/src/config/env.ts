import { z } from "zod";

const envSchema = z.object({
  VITE_API_URL: z.url("VITE_API_URL debe ser una URL válida"),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  console.error("❌ Variables de entorno inválidas:");
  console.error(z.treeifyError(parsed.error));
  throw new Error("Variables de entorno inválidas, revisá la consola");
}

export const env = parsed.data;

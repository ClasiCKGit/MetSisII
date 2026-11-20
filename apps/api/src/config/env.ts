// apps/api/src/config/env.ts
import "dotenv/config";
import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatoria"),
  JWT_SECRET: z.string().min(10, "JWT_SECRET debe tener al menos 10 caracteres"),
  // Si es false, nadie puede crear gimnasios desde la API (POST /api/auth/register-gimnasio
  // responde 403) y el frontend oculta el registro. Acepta true/false, 1/0, yes/no, on/off.
  REGISTRO_GIMNASIOS_HABILITADO: z.stringbool().default(true),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Variables de entorno inválidas:");
  console.error(z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;

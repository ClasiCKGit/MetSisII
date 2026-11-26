// apps/api/src/config/env.ts
import "dotenv/config";
import { z } from "zod";
import { esZonaHorariaValida } from "../utils/fechas";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatoria"),
  JWT_SECRET: z.string().min(10, "JWT_SECRET debe tener al menos 10 caracteres"),
  // Si es false, nadie puede crear gimnasios desde la API (POST /api/auth/register-gimnasio
  // responde 403) y el frontend oculta el registro. Acepta true/false, 1/0, yes/no, on/off.
  REGISTRO_GIMNASIOS_HABILITADO: z.stringbool().default(true),
  // Zona horaria de los gimnasios (IANA): define qué es "el mes" en las métricas del inicio
  ZONA_HORARIA: z
    .string()
    .refine(esZonaHorariaValida, "ZONA_HORARIA debe ser una zona horaria IANA válida")
    .default("America/Argentina/Buenos_Aires"),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY es obligatoria"),
  // Remitente de los mails. Mientras no haya dominio propio verificado en Resend,
  // usar el de prueba: onboarding@resend.dev
  MAIL_FROM: z.string().min(1, "MAIL_FROM es obligatoria"),
  // URL del frontend, para armar el link de recuperación de contraseña que va en el mail
  FRONTEND_URL: z.string().min(1, "FRONTEND_URL es obligatoria").default("http://localhost:5173"),
  // Cantidad de proxies (balanceador, CDN) delante de la API. Con 0, req.ip es la IP de
  // quien se conecta; detrás de un proxy sería la del proxy y el límite de intentos
  // bloquearía a todos juntos. En Render/Railway, 1.
  TRUST_PROXY: z.coerce
    .number()
    .int("TRUST_PROXY debe ser un entero")
    .min(0, "TRUST_PROXY no puede ser negativo")
    .default(0),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Variables de entorno inválidas:");
  console.error(z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;

import { TEST_DATABASE_URL } from "./test-env";

// Se ejecuta antes de que se importe cualquier archivo de la API: src/config/env.ts
// valida las variables apenas se carga, y dotenv no pisa las que ya están definidas.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.JWT_SECRET = "secreto-solo-para-tests-no-usar-en-produccion";
// Valores falsos: los tests no dependen del .env de cada uno y nunca usan una API key real de Resend
process.env.RESEND_API_KEY = "re_test_dummy";
process.env.MAIL_FROM = "FitManager <onboarding@resend.dev>";

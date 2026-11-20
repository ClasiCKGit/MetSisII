import { TEST_DATABASE_URL } from "./test-env";

// Se ejecuta antes de que se importe cualquier archivo de la API: src/config/env.ts
// valida las variables apenas se carga, y dotenv no pisa las que ya están definidas.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.JWT_SECRET = "secreto-solo-para-tests-no-usar-en-produccion";

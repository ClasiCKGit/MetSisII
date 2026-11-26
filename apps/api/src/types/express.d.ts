import type { Logger } from "pino";
import type { TenantClient } from "../config/tenant";
import type { AuthContext } from "../modules/auth/auth.types";

declare global {
  namespace Express {
    interface Request {
      log: Logger;
      // Disponibles solo en rutas detrás del middleware `authenticate`
      auth: AuthContext;
      db: TenantClient;
    }
  }
}

export {};

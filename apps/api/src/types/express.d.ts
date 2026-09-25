import { Logger } from "pino";

// Para que typescript no se queje cuando usamos req.log, que es un tipo que agrega pino-http

declare global {
  namespace Express {
    interface Request {
      log: Logger;
    }
  }
}

export {};

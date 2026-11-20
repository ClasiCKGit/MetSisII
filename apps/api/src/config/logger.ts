import pino from "pino";

export const logger = pino({
  // En tests no se loguea nada: las requests de cada test ensuciarían la salida
  level:
    process.env.NODE_ENV === "test"
      ? "silent"
      : process.env.NODE_ENV === "production"
        ? "info"
        : "debug",
  transport:
    process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } }
      : undefined,
});

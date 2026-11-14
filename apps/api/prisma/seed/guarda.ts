// El seed borra todas las tablas antes de cargar los datos de prueba: correrlo contra la base
// de producción la vaciaría. Se lee process.env directamente (y no config/env.ts) porque el
// seed no necesita el resto de las variables de la API, como JWT_SECRET.
export function asegurarEntornoNoProductivo(nodeEnv: string | undefined = process.env.NODE_ENV) {
  if (nodeEnv === "production") {
    throw new Error("El seed borra todos los datos y no se puede correr con NODE_ENV=production");
  }
}

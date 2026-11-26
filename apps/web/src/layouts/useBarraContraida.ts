import { useState } from "react";

const CLAVE = "fitmanager-barra-contraida";

/** Lee la preferencia guardada; si el navegador bloquea localStorage, arranca expandida. */
function leerPreferencia(): boolean {
  try {
    return localStorage.getItem(CLAVE) === "1";
  } catch {
    // Almacenamiento bloqueado (modo privado, políticas del navegador): se usa el valor por defecto
    return false;
  }
}

/** Guarda la preferencia; si no se puede, la barra igual funciona durante la sesión. */
function guardarPreferencia(contraida: boolean) {
  try {
    localStorage.setItem(CLAVE, contraida ? "1" : "0");
  } catch {
    // Sin almacenamiento la preferencia no sobrevive a la recarga, que es aceptable
  }
}

/**
 * Estado de la barra lateral (contraída o expandida), recordado entre visitas. Es una preferencia
 * de este navegador, no de la sesión: por eso no va en el store de auth.
 */
export function useBarraContraida() {
  // Inicialización perezosa: localStorage se lee una sola vez, sin useEffect
  const [contraida, setContraida] = useState(leerPreferencia);

  function alternar() {
    const siguiente = !contraida;
    setContraida(siguiente);
    guardarPreferencia(siguiente);
  }

  return { contraida, alternar };
}

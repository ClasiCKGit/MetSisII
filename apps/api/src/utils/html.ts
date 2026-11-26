const ENTIDADES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapa texto cargado por usuarios antes de meterlo en el HTML de un mail. */
export function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (caracter) => ENTIDADES[caracter] ?? caracter);
}

// Ofrece al navegador un archivo generado en memoria para que el usuario lo guarde
export function descargarArchivo(contenido: BlobPart, nombre: string, tipo: string): void {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

// El navegador descarta el BOM al decodificar la respuesta como texto; sin él,
// Excel abre el CSV como ANSI y rompe las tildes. Se vuelve a agregar (una sola vez).
export function descargarCsv(csv: string, nombre: string): void {
  const BOM = "\uFEFF";
  const conBom = csv.startsWith(BOM) ? csv : BOM + csv;
  descargarArchivo(conBom, nombre, "text/csv;charset=utf-8");
}

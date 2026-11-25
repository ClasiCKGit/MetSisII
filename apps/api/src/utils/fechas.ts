// Fechas en la zona horaria del gimnasio. El servidor corre en UTC, pero "el mes" o "hoy"
// son los del lugar donde está el gimnasio.

interface PartesFecha {
  anio: number;
  mes: number; // 1-12
  dia: number;
  hora: number;
  minuto: number;
  segundo: number;
}

function partesEnZona(fecha: Date, zona: string): PartesFecha {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: zona,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(fecha);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    Number(partes.find((parte) => parte.type === tipo)?.value);
  return {
    anio: valor("year"),
    mes: valor("month"),
    dia: valor("day"),
    hora: valor("hour"),
    minuto: valor("minute"),
    segundo: valor("second"),
  };
}

/** Instante en que empieza ese día (00:00) en la zona indicada. `mes` va de 1 a 12. */
export function medianocheEnZona(anio: number, mes: number, dia: number, zona: string): Date {
  const comoUtc = Date.UTC(anio, mes - 1, dia);
  const p = partesEnZona(new Date(comoUtc), zona);
  // Diferencia entre la hora de la zona y UTC en ese momento (por ejemplo, -3 h en Argentina)
  const desfase = Date.UTC(p.anio, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo) - comoUtc;
  return new Date(comoUtc - desfase);
}

/** Rango [desde, hasta) del mes calendario en curso, en la zona indicada. */
export function rangoDelMes(ahora: Date, zona: string): { desde: Date; hasta: Date } {
  const { anio, mes } = partesEnZona(ahora, zona);
  const siguiente = mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };
  return {
    desde: medianocheEnZona(anio, mes, 1, zona),
    hasta: medianocheEnZona(siguiente.anio, siguiente.mes, 1, zona),
  };
}

/** Fecha y hora en la zona indicada como "dd/mm/aaaa hh:mm" (24 h), el formato que lee Excel en español. */
export function formatearFechaHora(fecha: Date, zona: string): string {
  const p = partesEnZona(fecha, zona);
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${dos(p.dia)}/${dos(p.mes)}/${p.anio} ${dos(p.hora)}:${dos(p.minuto)}`;
}

export function esZonaHorariaValida(zona: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zona });
    return true;
  } catch {
    return false;
  }
}

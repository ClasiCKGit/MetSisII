import "../config/env"; // fuerza a cargar el .env antes que config/database
import cron from "node-cron";
import { prisma } from "../config/database";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { escaparHtml } from "../utils/html";
import { enviarMail } from "../utils/mailer";
import { rangoPorVencer } from "../modules/membresias/vigencia";

/**
 * Nota: usa `prisma` directo (no `req.db`) a propósito: este job no corre
 * dentro de un request de un gimnasio en particular, tiene que recorrer
 * TODOS los gimnasios activos. El filtro por gimnasio.activo reemplaza acá
 * al middleware de tenant, que no existe fuera de un request HTTP.
 */
export async function enviarRecordatoriosDeVencimiento(): Promise<void> {
  const { desde, hasta } = rangoPorVencer();

  const membresias = await prisma.membresia.findMany({
    where: {
      fechaFin: { gte: desde, lt: hasta },
      estado: { not: "CANCELADA" },
      recordatorioEnviado: false,
      socio: { activo: true, email: { not: null } },
      gimnasio: { activo: true },
    },
    include: { socio: true, actividad: true, gimnasio: true },
  });

  logger.info(`Recordatorio de vencimiento: ${membresias.length} membresías por notificar`);

  for (const membresia of membresias) {
    const email = membresia.socio.email;
    if (!email) continue;

    try {
      await enviarMail({
        to: email,
        subject: `Tu membresía en ${membresia.gimnasio.nombre} está por vencer`,
        html: `
          <p>Hola ${escaparHtml(membresia.socio.nombre)},</p>
          <p>Tu membresía de <strong>${escaparHtml(membresia.actividad.nombre)}</strong> vence el
          ${membresia.fechaFin.toLocaleDateString("es-AR", { timeZone: env.ZONA_HORARIA })}.</p>
          <p>Te recomendamos renovarla a tiempo para seguir disfrutando de tus actividades.</p>
        `,
      });

      await prisma.membresia.update({
        where: { id: membresia.id },
        data: { recordatorioEnviado: true },
      });
    } catch (err) {
      logger.error(
        { err, membresiaId: membresia.id },
        "Error al enviar recordatorio de vencimiento"
      );
    }
  }
}

export function programarRecordatorioVencimiento(): void {
  // Todos los días a las 8:00, hora del gimnasio
  cron.schedule(
    "0 8 * * *",
    () => {
      enviarRecordatoriosDeVencimiento().catch((err) => {
        logger.error(err, "Error al correr el job de recordatorio de vencimiento");
      });
    },
    { timezone: env.ZONA_HORARIA }
  );

  logger.info("Job de recordatorio de vencimiento programado (0 8 * * *)");
}

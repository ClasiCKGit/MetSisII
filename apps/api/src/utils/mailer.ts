import { Resend } from "resend";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { AppError } from "../middlewares/error.middleware";

const resend = new Resend(env.RESEND_API_KEY);

export interface DatosMail {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envía un mail usando Resend. Lo usan FIT-75 (recordatorio de vencimiento)
 * y FIT-77 (recuperación de contraseña).
 */
export async function enviarMail({ to, subject, html }: DatosMail): Promise<void> {
  const { error } = await resend.emails.send({
    from: env.MAIL_FROM,
    to,
    subject,
    html,
  });

  if (error) {
    logger.error({ error, to, subject }, "Error al enviar mail con Resend");
    throw new AppError(502, "No se pudo enviar el mail");
  }
}

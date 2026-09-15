import 'dotenv/config';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';

// Crea la aplicación, define el puerto y configura el logger.
const app = express();
const port = Number(process.env.PORT ?? 3000);
const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

// Agrega seguridad, CORS, parsing de JSON y logging de requests.
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));

// Permite comprobar rápidamente si la API está funcionando.
app.get('/health', (_request: Request, response: Response) => {
	response.status(200).json({
		status: 'ok',
		service: 'fitmanager-api',
	});
});

// Responde con un error cuando no existe la ruta solicitada.
app.use((_request: Request, response: Response) => {
	response.status(404).json({
		error: 'Ruta no encontrada',
	});
});

// Inicia el servidor solo cuando este archivo se ejecuta directamente.
if (require.main === module) {
	app.listen(port, () => {
		logger.info({ port }, 'API escuchando');
	});
}

// Exporta la aplicación para poder reutilizarla en tests.
export { app };

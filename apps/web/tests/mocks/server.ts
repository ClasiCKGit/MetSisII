import { setupServer } from "msw/node";
import { crearHandlers } from "./fake-api";

export const API_ORIGIN = import.meta.env.VITE_API_URL as string;

export const server = setupServer(...crearHandlers(API_ORIGIN));

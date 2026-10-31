import axios from "axios";
import { env } from "../config/env";

export const apiClient = axios.create({
  baseURL: env.VITE_API_URL,
});

import { afterAll, beforeEach } from "vitest";
import { prisma } from "../src/config/database";
import { resetDb } from "./helpers/db";

// Cada test arranca con la base vacía
beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

import { prisma } from "./database";

type Args = Record<string, unknown>;

// Modelos que tienen la columna gimnasioId directamente.
// OJO: Horario todavía no la tiene.
const TENANT_MODELS = new Set([
  "Usuario",
  "Socio",
  "Profesor",
  "Actividad",
  "ActividadProfesor",
  "TipoMembresia",
  "Membresia",
  "Pago",
]);

function scopeWhere(args: Args, gimnasioId: string): Args {
  return { ...args, where: { ...(args.where as Args | undefined), gimnasioId } };
}

function scopeData(data: unknown, gimnasioId: string): unknown {
  if (Array.isArray(data)) return data.map((row) => ({ ...row, gimnasioId }));
  return { ...(data as Args), gimnasioId };
}

// Evita que un update mueva un registro a otro gimnasio
function protectData(data: unknown): unknown {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const rest = { ...(data as Args) };
    delete rest.gimnasioId;
    return rest;
  }
  return data;
}

function scopeArgs(operation: string, rawArgs: unknown, gimnasioId: string): Args {
  const args = (rawArgs ?? {}) as Args;

  switch (operation) {
    case "create":
    case "createMany":
    case "createManyAndReturn":
      return { ...args, data: scopeData(args.data, gimnasioId) };

    case "update":
    case "updateMany":
    case "updateManyAndReturn":
      return { ...scopeWhere(args, gimnasioId), data: protectData(args.data) };

    case "upsert":
      return {
        ...scopeWhere(args, gimnasioId),
        create: scopeData(args.create, gimnasioId),
        update: protectData(args.update),
      };

    // findUnique, findFirst, findMany, count, aggregate, groupBy, delete, deleteMany...
    default:
      return scopeWhere(args, gimnasioId);
  }
}

export function tenantClient(gimnasioId: string) {
  return prisma.$extends({
    name: "tenant-scope",
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          if (!TENANT_MODELS.has(model)) return query(args);
          return query(scopeArgs(operation, args, gimnasioId) as typeof args);
        },
      },
    },
  });
}

export type TenantClient = ReturnType<typeof tenantClient>;

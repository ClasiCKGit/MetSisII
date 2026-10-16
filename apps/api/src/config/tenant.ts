import { prisma } from "./database";

type Args = Record<string, unknown>;

// Un renglón por modelo que participa en el tenant.
// Para agregar un modelo nuevo basta con sumar una fila.
// "id" en Gimnasio: restringe el acceso al propio registro.
export const TENANT_FIELD: Record<string, string> = {
  Gimnasio: "id",
  Usuario: "gimnasioId",
  Socio: "gimnasioId",
  Profesor: "gimnasioId",
  Actividad: "gimnasioId",
  ActividadProfesor: "gimnasioId",
  TipoMembresia: "gimnasioId",
  Membresia: "gimnasioId",
  Pago: "gimnasioId",
  // Horario se suma aquí cuando tenga la columna gimnasioId (Epic 3)
};

function scopeWhere(args: Args, field: string, value: string): Args {
  return { ...args, where: { ...(args.where as Args | undefined), [field]: value } };
}

function scopeData(data: unknown, field: string, value: string): unknown {
  if (Array.isArray(data)) return data.map((row) => ({ ...row, [field]: value }));
  return { ...(data as Args), [field]: value };
}

// Evita que un update mueva un registro a otro tenant
function protectData(data: unknown, field: string): unknown {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const rest = { ...(data as Args) };
    delete rest[field];
    return rest;
  }
  return data;
}

export function scopeArgs(operation: string, rawArgs: unknown, field: string, value: string): Args {
  const args = (rawArgs ?? {}) as Args;

  switch (operation) {
    case "create":
    case "createMany":
    case "createManyAndReturn":
      return { ...args, data: scopeData(args.data, field, value) };

    case "update":
    case "updateMany":
    case "updateManyAndReturn":
      return { ...scopeWhere(args, field, value), data: protectData(args.data, field) };

    case "upsert":
      return {
        ...scopeWhere(args, field, value),
        create: scopeData(args.create, field, value),
        update: protectData(args.update, field),
      };

    // findUnique, findFirst, findMany, count, aggregate, groupBy, delete, deleteMany…
    default:
      return scopeWhere(args, field, value);
  }
}

export function tenantClient(gimnasioId: string) {
  return prisma.$extends({
    name: "tenant-scope",
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          const field = TENANT_FIELD[model];
          if (!field) return query(args);
          return query(scopeArgs(operation, args, field, gimnasioId) as typeof args);
        },
      },
    },
  });
}

export type TenantClient = ReturnType<typeof tenantClient>;

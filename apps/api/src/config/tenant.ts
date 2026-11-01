import { prisma } from "./database";

type Args = Record<string, unknown>;

interface TenantRule {
  /** Columna que vincula el registro con el gimnasio al que pertenece. */
  field: string;
  /** Operaciones que no se permiten a través de req.db. */
  forbidden?: readonly string[];
}

// TODO: Agregar columna gimnasioId en Horario (epic 4).
const TENANT_RULES: Record<string, TenantRule> = {
  // Un gimnasio solo ve y modifica su propio registro. Crear o borrar gimnasios
  // no se hace desde req.db: el alta es el onboarding y el borrado es lógico.
  Gimnasio: {
    field: "id",
    forbidden: ["create", "createMany", "createManyAndReturn", "upsert", "delete", "deleteMany"],
  },
  Usuario: { field: "gimnasioId" },
  Socio: { field: "gimnasioId" },
  Profesor: { field: "gimnasioId" },
  Actividad: { field: "gimnasioId" },
  ActividadProfesor: { field: "gimnasioId" },
  TipoMembresia: { field: "gimnasioId" },
  Membresia: { field: "gimnasioId" },
  Pago: { field: "gimnasioId" },
};

// Agrega la condición del tenant con AND, sin pisar lo que ya pidió quien llama.
// Si pide un registro de otro gimnasio, las dos condiciones se contradicen y la
// consulta no encuentra nada.
function scopeWhere(args: Args, { field }: TenantRule, gimnasioId: string): Args {
  const where = (args.where ?? {}) as Args;
  const previous =
    where.AND === undefined ? [] : Array.isArray(where.AND) ? where.AND : [where.AND];
  return { ...args, where: { ...where, AND: [...previous, { [field]: gimnasioId }] } };
}

function scopeData(data: unknown, { field }: TenantRule, gimnasioId: string): unknown {
  if (Array.isArray(data)) return data.map((row) => ({ ...row, [field]: gimnasioId }));
  return { ...(data as Args), [field]: gimnasioId };
}

// Evita que un update mueva un registro a otro gimnasio
function protectData(data: unknown, { field }: TenantRule): unknown {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const rest = { ...(data as Args) };
    delete rest[field];
    return rest;
  }
  return data;
}

function scopeArgs(
  operation: string,
  rawArgs: unknown,
  rule: TenantRule,
  gimnasioId: string
): Args {
  const args = (rawArgs ?? {}) as Args;

  switch (operation) {
    case "create":
    case "createMany":
    case "createManyAndReturn":
      return { ...args, data: scopeData(args.data, rule, gimnasioId) };

    case "update":
    case "updateMany":
    case "updateManyAndReturn":
      return { ...scopeWhere(args, rule, gimnasioId), data: protectData(args.data, rule) };

    case "upsert":
      return {
        ...scopeWhere(args, rule, gimnasioId),
        create: scopeData(args.create, rule, gimnasioId),
        update: protectData(args.update, rule),
      };

    // findUnique, findFirst, findMany, count, aggregate, groupBy, delete, deleteMany...
    default:
      return scopeWhere(args, rule, gimnasioId);
  }
}

export function tenantClient(gimnasioId: string) {
  return prisma.$extends({
    name: "tenant-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const rule: TenantRule | undefined = TENANT_RULES[model];

          if (!rule) {
            throw new Error(
              `El modelo ${model} no está registrado en TENANT_RULES (config/tenant.ts), ` +
                "así que no se puede usar a través de req.db."
            );
          }
          if (rule.forbidden?.includes(operation)) {
            throw new Error(
              `La operación ${operation} sobre ${model} no está permitida a través de req.db.`
            );
          }

          return query(scopeArgs(operation, args, rule, gimnasioId) as typeof args);
        },
      },
    },
  });
}

export type TenantClient = ReturnType<typeof tenantClient>;

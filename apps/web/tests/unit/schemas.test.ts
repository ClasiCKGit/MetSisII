import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  toRegisterPayload,
} from "@/features/auth/schemas";
import {
  crearUsuarioSchema,
  editarUsuarioSchema,
  resetPasswordSchema,
} from "@/features/usuarios/schemas";

// Devuelve los mensajes de error por campo
function errores(resultado: {
  success: boolean;
  error?: { issues: Array<{ path: PropertyKey[]; message: string }> };
}) {
  return Object.fromEntries(
    (resultado.error?.issues ?? []).map((i) => [String(i.path[0]), i.message])
  );
}

const registroValido = {
  gimnasioNombre: "Gym Norte",
  gimnasioSlug: "gym-norte",
  adminNombre: "Ana",
  adminApellido: "Pérez",
  email: "ana@mail.com",
  password: "clave12345",
  confirmPassword: "clave12345",
};

describe("loginSchema", () => {
  it("normaliza el slug y recorta el email", () => {
    const r = loginSchema.parse({
      gimnasioSlug: "  MI-Gym ",
      email: " ana@mail.com ",
      password: "x",
    });
    expect(r).toEqual({ gimnasioSlug: "mi-gym", email: "ana@mail.com", password: "x" });
  });

  it("pide los tres campos y valida el formato del email", () => {
    expect(errores(loginSchema.safeParse({ gimnasioSlug: "", email: "", password: "" }))).toEqual({
      gimnasioSlug: "Ingresá el identificador de tu gimnasio",
      email: "Ingresá tu email",
      password: "Ingresá tu contraseña",
    });
    expect(
      errores(loginSchema.safeParse({ gimnasioSlug: "g", email: "no-es-email", password: "x" }))
    ).toEqual({
      email: "El email no es válido",
    });
  });
});

describe("registerSchema", () => {
  it("acepta un registro válido", () => {
    expect(registerSchema.safeParse(registroValido).success).toBe(true);
  });

  it.each([
    ["con espacios", "con espacios", "Solo minúsculas, números y guiones"],
    ["con guion al inicio", "-gym", "Solo minúsculas, números y guiones"],
    ["con guion al final", "gym-", "Solo minúsculas, números y guiones"],
    ["con guiones dobles", "gym--norte", "Solo minúsculas, números y guiones"],
    ["demasiado corto", "ab", "al menos 3 caracteres"],
    ["demasiado largo", "a".repeat(41), "no puede superar los 40"],
    ["reservado", "admin", "Ese identificador está reservado"],
    ["reservado (api)", "api", "Ese identificador está reservado"],
  ])("rechaza un identificador %s", (_caso, slug, fragmento) => {
    const mensaje = errores(
      registerSchema.safeParse({ ...registroValido, gimnasioSlug: slug })
    ).gimnasioSlug;
    expect(mensaje).toContain(fragmento);
  });

  it("normaliza un identificador con mayúsculas", () => {
    const r = registerSchema.parse({ ...registroValido, gimnasioSlug: "  Gym-Norte " });
    expect(r.gimnasioSlug).toBe("gym-norte");
  });

  it("exige que las contraseñas coincidan y marca el campo de confirmación", () => {
    const r = registerSchema.safeParse({ ...registroValido, confirmPassword: "otra-clave" });
    expect(errores(r)).toEqual({ confirmPassword: "Las contraseñas no coinciden" });
  });

  it.each([
    ["corta", "corta", "al menos 8 caracteres"],
    ["demasiado larga", "a".repeat(73), "no puede superar los 72"],
  ])("rechaza una contraseña %s", (_caso, password, fragmento) => {
    const r = registerSchema.safeParse({ ...registroValido, password, confirmPassword: password });
    expect(errores(r).password).toContain(fragmento);
  });

  it("toRegisterPayload arma el cuerpo anidado que espera la API", () => {
    expect(toRegisterPayload(registerSchema.parse(registroValido))).toEqual({
      gimnasio: { nombre: "Gym Norte", slug: "gym-norte" },
      admin: { nombre: "Ana", apellido: "Pérez", email: "ana@mail.com", password: "clave12345" },
    });
  });
});

describe("changePasswordSchema", () => {
  const valido = {
    currentPassword: "actual-123",
    newPassword: "nueva-12345",
    confirmNewPassword: "nueva-12345",
  };

  it("acepta un cambio válido", () => {
    expect(changePasswordSchema.safeParse(valido).success).toBe(true);
  });

  it("exige que la confirmación coincida", () => {
    const r = changePasswordSchema.safeParse({ ...valido, confirmNewPassword: "distinta-123" });
    expect(errores(r)).toEqual({ confirmNewPassword: "Las contraseñas no coinciden" });
  });

  it("exige que la nueva sea distinta de la actual", () => {
    const r = changePasswordSchema.safeParse({
      currentPassword: "misma-clave-1",
      newPassword: "misma-clave-1",
      confirmNewPassword: "misma-clave-1",
    });
    expect(errores(r)).toEqual({
      newPassword: "La nueva contraseña tiene que ser distinta de la actual",
    });
  });
});

describe("esquemas de usuarios", () => {
  it("crear: pide todos los campos y valida rol, email y contraseña", () => {
    expect(
      Object.keys(
        errores(
          crearUsuarioSchema.safeParse({
            nombre: "",
            apellido: "",
            email: "",
            password: "",
            rol: "ADMIN",
          })
        )
      ).sort()
    ).toEqual(["apellido", "email", "nombre", "password"]);
    expect(
      crearUsuarioSchema.safeParse({
        nombre: "A",
        apellido: "B",
        email: "a@b.com",
        password: "12345678",
        rol: "SUPERADMIN",
      }).success
    ).toBe(false);
  });

  it("editar: pide nombre y apellido y acepta los dos roles", () => {
    expect(
      editarUsuarioSchema.safeParse({ nombre: "A", apellido: "B", rol: "RECEPCIONISTA" }).success
    ).toBe(true);
    expect(
      Object.keys(
        errores(editarUsuarioSchema.safeParse({ nombre: " ", apellido: "B", rol: "ADMIN" }))
      )
    ).toEqual(["nombre"]);
  });

  it("restablecer: la contraseña tiene entre 8 y 72 caracteres", () => {
    expect(resetPasswordSchema.safeParse({ password: "12345678" }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ password: "1234567" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ password: "a".repeat(73) }).success).toBe(false);
  });
});

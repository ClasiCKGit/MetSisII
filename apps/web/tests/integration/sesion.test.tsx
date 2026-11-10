import axios from "axios";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getMe } from "@/api/auth.api";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";
import {
  apiActualizarUsuario,
  apiCrearUsuario,
  apiLoginToken,
  conSesion,
  nuevoGimnasio,
  type GimnasioDePrueba,
} from "../helpers/api";
import { renderApp, type Usuario } from "../helpers/render";
import { simularServidorCaido } from "../helpers/servidor";

async function completarLogin(
  user: Usuario,
  datos: { gimnasioSlug: string; email: string; password: string },
  conSlug = true
) {
  if (conSlug) await user.type(screen.getByLabelText("Gimnasio"), datos.gimnasioSlug);
  await user.type(screen.getByLabelText("Email"), datos.email);
  await user.type(screen.getByLabelText("Contraseña"), datos.password);
  await user.click(screen.getByRole("button", { name: "Ingresar" }));
}

const credencialesDe = (g: GimnasioDePrueba) => ({
  gimnasioSlug: g.slug,
  email: g.email,
  password: g.password,
});

async function nuevaRecepcionista(g: GimnasioDePrueba) {
  const recepcionista = await apiCrearUsuario(g.token, {
    nombre: "Carla",
    apellido: "Recepción",
    email: `carla@${g.slug}.com`,
  });
  return { ...recepcionista, gimnasioSlug: g.slug };
}

describe("rutas y guards", () => {
  it("sin sesión, abrir una página protegida lleva al login", async () => {
    const { router } = renderApp("/");
    expect(await screen.findByText("Ingresá a FitManager")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
  });

  it("una ruta inexistente muestra la página 404", async () => {
    renderApp("/no-existe");
    expect(await screen.findByText("Página no encontrada")).toBeInTheDocument();
  });
});

describe("login", () => {
  it("valida los campos en el cliente, sin llamar a la API", async () => {
    const post = vi.spyOn(apiClient, "post");
    const { user } = renderApp("/login");

    await user.click(await screen.findByRole("button", { name: "Ingresar" }));

    expect(await screen.findByText("Ingresá el identificador de tu gimnasio")).toBeInTheDocument();
    expect(screen.getByText("Ingresá tu email")).toBeInTheDocument();
    expect(screen.getByText("Ingresá tu contraseña")).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
    post.mockRestore();
  });

  it("rechaza un email con formato inválido", async () => {
    const { user } = renderApp("/login");
    await user.type(await screen.findByLabelText("Email"), "esto-no-es-un-email");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(await screen.findByText("El email no es válido")).toBeInTheDocument();
  });

  it("con credenciales incorrectas muestra el error de la API y no cierra ni redirige", async () => {
    const g = await nuevoGimnasio();
    const { user, router } = renderApp("/login");
    await screen.findByText("Ingresá a FitManager");

    await completarLogin(user, { ...credencialesDe(g), password: "incorrecta-123" });

    expect(await screen.findByText("Credenciales inválidas")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
    expect(useAuthStore.getState().token).toBeNull();
    expect(screen.getByRole("button", { name: "Ingresar" })).toBeEnabled();
  });

  it("con credenciales correctas entra a la app y guarda en localStorage solo el token y el último gimnasio", async () => {
    const g = await nuevoGimnasio();
    const { user, router } = renderApp("/");
    await screen.findByText("Ingresá a FitManager");

    await completarLogin(user, credencialesDe(g));

    expect(await screen.findByText("Hola, Ana")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
    expect(screen.getByText(`${g.nombre} · Ana Admin`)).toBeInTheDocument();

    const guardado = JSON.parse(localStorage.getItem("fitmanager-auth")!);
    expect(Object.keys(guardado.state).sort()).toEqual(["token", "ultimoSlug"]);
    expect(guardado.state.ultimoSlug).toBe(g.slug);
    expect(localStorage.getItem("fitmanager-auth")).not.toContain(g.email);
  });

  it("después de iniciar sesión vuelve a la página que se había intentado abrir", async () => {
    const g = await nuevoGimnasio();
    const { user, router } = renderApp("/usuarios");
    await screen.findByText("Ingresá a FitManager");
    expect(router.state.location.pathname).toBe("/login");

    await completarLogin(user, credencialesDe(g));

    expect(await screen.findByText("Personal con acceso al sistema.")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/usuarios");
  });

  it("el identificador del último gimnasio viene cargado al volver al login", async () => {
    const g = await nuevoGimnasio();
    const { user } = renderApp("/");
    await screen.findByText("Ingresá a FitManager");
    await completarLogin(user, credencialesDe(g));
    await screen.findByText("Hola, Ana");

    await user.click(screen.getByRole("button", { name: "Salir" }));

    expect(await screen.findByLabelText("Gimnasio")).toHaveValue(g.slug);
  });

  it("un usuario con sesión que abre /login es redirigido al inicio", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    const { router } = renderApp("/login");

    expect(await screen.findByText("Hola, Ana")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
  });
});

describe("sesión guardada (al volver a abrir la app)", () => {
  it("con un token válido restaura la sesión pidiendo el usuario a la API, sin pasar por el login", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    expect(useAuthStore.getState().usuario).toBeNull(); // el usuario NO se guardó

    renderApp("/");

    expect(await screen.findByRole("status")).toHaveTextContent("Cargando");
    expect(await screen.findByText("Hola, Ana")).toBeInTheDocument();
    expect(useAuthStore.getState().usuario?.email).toBe(g.email);
  });

  it("con un token inválido o vencido limpia la sesión y muestra el login", async () => {
    await conSesion("este-token-no-sirve");

    renderApp("/");

    expect(await screen.findByText("Ingresá a FitManager")).toBeInTheDocument();
    expect(useAuthStore.getState().token).toBeNull();
    expect(JSON.parse(localStorage.getItem("fitmanager-auth")!).state.token).toBeNull();
  });

  it("si el servidor no responde muestra un error con 'Reintentar', y reintentar funciona", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    const levantarServidor = simularServidorCaido();

    const { user } = renderApp("/");

    expect(await screen.findByText("No pudimos conectar con el servidor")).toBeInTheDocument();
    expect(screen.getByText("No se pudo conectar con el servidor")).toBeInTheDocument();
    expect(useAuthStore.getState().token).toBe(g.token); // no se cerró la sesión

    levantarServidor();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Hola, Ana")).toBeInTheDocument();
  });

  it("'Cerrar sesión' desde la pantalla de error de conexión lleva al login", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    simularServidorCaido();

    const { user } = renderApp("/");
    await user.click(await screen.findByRole("button", { name: "Cerrar sesión" }));

    expect(await screen.findByText("Ingresá a FitManager")).toBeInTheDocument();
  });
});

describe("cerrar sesión y expiración", () => {
  it("'Salir' borra la sesión de la memoria y de localStorage y vuelve al login", async () => {
    const g = await nuevoGimnasio();
    const { user } = renderApp("/");
    await screen.findByText("Ingresá a FitManager");
    await completarLogin(user, credencialesDe(g));
    await screen.findByText("Hola, Ana");

    await user.click(screen.getByRole("button", { name: "Salir" }));

    expect(await screen.findByText("Ingresá a FitManager")).toBeInTheDocument();
    const { token, usuario, gimnasio } = useAuthStore.getState();
    expect([token, usuario, gimnasio]).toEqual([null, null, null]);
    expect(JSON.parse(localStorage.getItem("fitmanager-auth")!).state.token).toBeNull();
  });

  it("si la API responde 401 con la sesión abierta (usuario desactivado), el interceptor cierra la sesión", async () => {
    const g = await nuevoGimnasio();
    const temporal = await apiCrearUsuario(g.token, {
      nombre: "Temp",
      apellido: "Oral",
      email: `temporal@${g.slug}.com`,
      password: "temporal12345",
    });

    const { user } = renderApp("/");
    await screen.findByText("Ingresá a FitManager");
    await completarLogin(user, {
      gimnasioSlug: g.slug,
      email: temporal.email,
      password: "temporal12345",
    });
    await screen.findByText("Hola, Temp");

    // Un administrador lo desactiva mientras tiene la sesión abierta
    expect(await apiActualizarUsuario(g.token, temporal.id, { activo: false })).toBe(200);

    // La siguiente petición de la app recibe 401
    await expect(getMe()).rejects.toMatchObject({ status: 401 });

    expect(await screen.findByText("Ingresá a FitManager")).toBeInTheDocument();
    expect(useAuthStore.getState().token).toBeNull();
  });
});

describe("roles", () => {
  it("un administrador ve el enlace a Usuarios y puede abrir la página", async () => {
    const g = await nuevoGimnasio();
    const { user } = renderApp("/");
    await screen.findByText("Ingresá a FitManager");
    await completarLogin(user, credencialesDe(g));
    await screen.findByText("Hola, Ana");

    await user.click(screen.getByRole("link", { name: "Usuarios" }));

    expect(await screen.findByText("Personal con acceso al sistema.")).toBeInTheDocument();
  });

  it("una recepcionista no ve el enlace a Usuarios y, si abre la URL, ve el aviso de permisos", async () => {
    const g = await nuevoGimnasio();
    const carla = await nuevaRecepcionista(g);
    await conSesion(await apiLoginToken(g.slug, carla.email, carla.password));
    const { router } = renderApp("/usuarios");

    expect(await screen.findByText("No tenés permisos para ver esta página")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/usuarios"); // se mantiene la URL
    expect(screen.queryByRole("link", { name: "Usuarios" })).not.toBeInTheDocument();
    expect(screen.getByText(/Carla Recepción/)).toBeInTheDocument();
  });

  it("el dashboard muestra el rol del usuario", async () => {
    const g = await nuevoGimnasio();
    const carla = await nuevaRecepcionista(g);
    await conSesion(await apiLoginToken(g.slug, carla.email, carla.password));
    renderApp("/");
    expect(await screen.findByText("Ingresaste como recepcionista.")).toBeInTheDocument();
  });
});

describe("cliente HTTP (interceptores)", () => {
  it("envía el token solo cuando hay sesión", async () => {
    const g = await nuevoGimnasio();

    // Se observa la petición FINAL en el adaptador de axios, después de todos los interceptores
    // (los interceptores de request se ejecutan en orden inverso al de registro)
    const adaptadorOriginal = apiClient.defaults.adapter;
    const adaptador = axios.getAdapter(adaptadorOriginal);
    const enviados: Array<string | undefined> = [];
    apiClient.defaults.adapter = (config) => {
      enviados.push(config.headers.get("Authorization") as string | undefined);
      return adaptador(config);
    };

    try {
      await apiClient.post("/auth/login", credencialesDe(g)); // sin sesión: sin token
      useAuthStore.setState({ token: g.token });
      await getMe(); // con sesión: con token
    } finally {
      apiClient.defaults.adapter = adaptadorOriginal;
    }

    expect(enviados[0]).toBeUndefined();
    expect(enviados[1]).toBe(`Bearer ${g.token}`);
  });

  it("un 401 en el login (credenciales incorrectas) NO se confunde con una sesión vencida", async () => {
    const g = await nuevoGimnasio();
    useAuthStore.setState({ token: "token-existente" });

    await expect(
      apiClient.post("/auth/login", { ...credencialesDe(g), password: "incorrecta-123" })
    ).rejects.toMatchObject({ status: 401, message: "Credenciales inválidas" });

    expect(useAuthStore.getState().token).toBe("token-existente");
  });

  it("un 401 en cualquier otra ruta sí cierra la sesión", async () => {
    useAuthStore.setState({ token: "token-vencido" });

    await expect(getMe()).rejects.toMatchObject({ status: 401 });

    expect(useAuthStore.getState().token).toBeNull();
  });

  it("un error de red se convierte en ApiError con status null", async () => {
    simularServidorCaido();
    await expect(apiClient.get("/auth/me")).rejects.toMatchObject({
      name: "ApiError",
      status: null,
    });
  });
});

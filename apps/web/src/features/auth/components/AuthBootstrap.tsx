import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { getMe } from "@/api/auth.api";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getErrorMessage } from "@/lib/api-error";
import { useAuthStatus, useAuthStore } from "@/store/auth.store";
import { cerrarSesion } from "../session";

function PantallaDeCarga() {
  return (
    <div role="status" className="flex min-h-svh items-center justify-center gap-3">
      <div
        aria-hidden="true"
        className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
      <span className="text-sm text-muted-foreground">Cargando…</span>
    </div>
  );
}

// Al abrir la app con un token guardado todavía no se sabe quién es el usuario:
// se lo pide a la API (GET /me) antes de mostrar nada.
export function AuthBootstrap({ children }: { children: ReactNode }) {
  const status = useAuthStatus();
  const token = useAuthStore((state) => state.token);

  const { error, refetch, isFetching } = useQuery({
    queryKey: ["auth", "me", token],
    queryFn: async () => {
      const perfil = await getMe();
      // Se guarda en el store acá mismo, en vez de copiarlo después con un useEffect
      useAuthStore.getState().setProfile(perfil);
      return perfil;
    },
    // Solo cuando hay token pero todavía no se cargó el usuario
    enabled: status === "checking",
    retry: false,
  });

  if (status !== "checking") {
    return <>{children}</>;
  }

  // Un 401 no llega acá: el interceptor ya cerró la sesión y el status pasó a "unauthenticated".
  // Lo que sí llega es que el servidor no responda.
  if (error) {
    return (
      <div className="flex min-h-svh items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>No pudimos conectar con el servidor</CardTitle>
            <CardDescription>{getErrorMessage(error)}</CardDescription>
          </CardHeader>
          <CardFooter className="gap-2">
            <Button onClick={() => void refetch()} disabled={isFetching}>
              {isFetching ? "Reintentando…" : "Reintentar"}
            </Button>
            <Button variant="outline" onClick={cerrarSesion}>
              Cerrar sesión
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return <PantallaDeCarga />;
}

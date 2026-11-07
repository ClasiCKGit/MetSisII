import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth.store";

export function DashboardPage() {
  // Dos selectores separados que devuelven valores simples: no hace falta useShallow
  const nombre = useAuthStore((state) => state.usuario?.nombre);
  const rol = useAuthStore((state) => state.usuario?.rol);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hola, {nombre}</CardTitle>
        <CardDescription>
          Ingresaste como {rol === "ADMIN" ? "administrador" : "recepcionista"}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Acá va a ir el resumen del gimnasio (Epic 6).
        </p>
      </CardContent>
    </Card>
  );
}

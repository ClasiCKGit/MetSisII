import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ForbiddenPage() {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>No tenés permisos para ver esta página</CardTitle>
        <CardDescription>
          Esta sección es solo para administradores. Si creés que es un error, pedile acceso a un
          administrador de tu gimnasio.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

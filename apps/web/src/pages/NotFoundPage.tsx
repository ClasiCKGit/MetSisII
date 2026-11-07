import { Link } from "react-router-dom";
import { buttonVariants } from "../components/ui/button";

export function NotFoundPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <p className="text-sm text-muted-foreground">La dirección que abriste no existe.</p>
      <Link to="/" className={buttonVariants({ variant: "outline" })}>
        Volver al inicio
      </Link>
    </main>
  );
}

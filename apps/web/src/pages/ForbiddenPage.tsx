import { ShieldAlertIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";

export function ForbiddenPage() {
  return (
    <section className="mx-auto flex max-w-lg flex-col items-start gap-4 rounded-2xl border bg-card p-6 sm:p-8">
      <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
        <ShieldAlertIcon aria-hidden="true" className="size-5" />
      </span>
      <h1 className="font-heading text-2xl leading-tight font-black tracking-tight uppercase">
        No tenés permisos para ver esta página
      </h1>
      <p className="text-sm text-muted-foreground">
        Esta sección es solo para administradores. Si creés que es un error, pedile acceso a un
        administrador de tu gimnasio.
      </p>
      <Link to="/" className={buttonVariants({ variant: "outline" })}>
        Volver al inicio
      </Link>
    </section>
  );
}

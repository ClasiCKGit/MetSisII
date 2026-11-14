import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { getErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth.store";
import { ProfesoresDeLaActividad } from "../components/ProfesoresDeLaActividad";
import { useActividad } from "../hooks/useProfesoresDeActividad";

const VOLVER = (
  <Link to="/actividades" className="text-sm text-muted-foreground hover:underline">
    ← Volver a actividades
  </Link>
);

export function ActividadDetallePage() {
  // El id viene de la URL: /actividades/:id
  const { id = "" } = useParams();
  const { data: actividad, isPending, error } = useActividad(id);
  const puedeEditar = useAuthStore((state) => state.usuario?.rol === "ADMIN");

  if (isPending) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Cargando actividad…
      </p>
    );
  }

  if (error) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
        {VOLVER}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        {VOLVER}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{actividad.nombre}</h1>
          <Badge variant={actividad.activa ? "secondary" : "outline"}>
            {actividad.activa ? "Activa" : "Inactiva"}
          </Badge>
        </div>
        {actividad.descripcion && (
          <p className="text-sm text-muted-foreground">{actividad.descripcion}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {actividad.cupo === null ? "Sin límite de cupo" : `Cupo: ${actividad.cupo} personas`}
        </p>
      </div>

      <ProfesoresDeLaActividad actividad={actividad} puedeEditar={puedeEditar} />
    </div>
  );
}

import { Link, useParams } from "react-router-dom";
import { EstadoActivo } from "@/components/shared/EstadoActivo";
import { getErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth.store";
import { HorariosDeLaActividad } from "../components/HorariosDeLaActividad";
import { ProfesoresDeLaActividad } from "../components/ProfesoresDeLaActividad";
import { useActividad } from "../hooks/useProfesoresDeActividad";

const VOLVER = (
  <Link
    to="/actividades"
    className="w-fit text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
  >
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
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="titulo-pantalla">{actividad.nombre}</h1>
          <EstadoActivo activo={actividad.activa} femenino />
        </div>
        {actividad.descripcion && (
          <p className="text-sm text-muted-foreground">{actividad.descripcion}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {actividad.cupo === null ? "Sin límite de cupo" : `Cupo: ${actividad.cupo} personas`}
        </p>
      </div>

      <ProfesoresDeLaActividad actividad={actividad} puedeEditar={puedeEditar} />
      <HorariosDeLaActividad actividad={actividad} puedeEditar={puedeEditar} />
    </div>
  );
}

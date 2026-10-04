import type { ReactNode } from "react";
import { MascotaSigue } from "./MascotaSigue";

type EstadoAmableProps = {
  titulo: string;
  mensaje?: string;
  accion?: { texto: string; onClick: () => void };
  children?: ReactNode;
  compacto?: boolean;
};

/** Estado vacío o de error con la mascota: una frase corta y, si aplica, un botón para reintentar. */
export function EstadoAmable({ titulo, mensaje, accion, children, compacto = false }: EstadoAmableProps) {
  return (
    <div className={`kid-card mx-auto grid max-w-xl justify-items-center gap-3 px-6 text-center ${compacto ? "py-8" : "py-12"}`} role="status">
      <MascotaSigue className={`kid-bob w-auto ${compacto ? "h-24" : "h-32"}`} />
      <h2 className="text-xl font-black text-monserrat-ink">{titulo}</h2>
      {mensaje && <p className="max-w-md text-sm font-semibold leading-6 text-monserrat-ink/65">{mensaje}</p>}
      {children}
      {accion && (
        <button type="button" onClick={accion.onClick} className="kid-btn mt-1">
          {accion.texto}
        </button>
      )}
    </div>
  );
}

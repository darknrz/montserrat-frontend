type SkeletonProps = { className?: string };

/** Bloque de carga color crema: reserva el espacio para que el diseño no salte. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div aria-hidden="true" className={`sk ${className}`} />;
}

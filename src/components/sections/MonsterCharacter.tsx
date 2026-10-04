type MonsterCharacterProps = {
  src: string;
  /** "error": la mascota niega con la cabeza; "exito": salta de alegría (animaciones de AmbienteAmigable). */
  estado?: "idle" | "error" | "exito";
};

export function MonsterCharacter({ src, estado = "idle" }: MonsterCharacterProps) {
  const animacion = estado === "error" ? "amb-shake" : estado === "exito" ? "amb-jump" : "";
  return (
    <div className={animacion}>
      <img src={src} alt="" className="h-[220px] w-auto select-none" draggable={false} />
    </div>
  );
}

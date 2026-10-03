import { useEffect, useRef, useState } from "react";

const BASE = "/monster/idle";
// Fotogramas: 1 = mirando al frente, 2 = arriba-izq, 3 = abajo-izq, 4 = abajo-der, 5 = arriba-der.
const FRAMES = [1, 2, 3, 4, 5].map((n) => `${BASE}/${n}.png`);

type MascotaSigueProps = {
  className?: string;
};

/**
 * Mascota que mira hacia donde está el puntero (mouse, lápiz o dedo). La dirección se calcula
 * respecto al centro de la propia mascota, así funciona igual en cualquier lugar de la pantalla.
 */
export function MascotaSigue({ className = "" }: MascotaSigueProps) {
  const ref = useRef<HTMLImageElement>(null);
  const [src, setSrc] = useState(FRAMES[0]);

  useEffect(() => {
    FRAMES.forEach((frame) => {
      const img = new Image();
      img.src = frame;
    });

    function handlePointer(event: PointerEvent) {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const left = event.clientX < centerX;
      const up = event.clientY < centerY;
      setSrc(left ? (up ? FRAMES[1] : FRAMES[2]) : up ? FRAMES[4] : FRAMES[3]);
    }

    window.addEventListener("pointermove", handlePointer, { passive: true });
    window.addEventListener("pointerdown", handlePointer, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointer);
      window.removeEventListener("pointerdown", handlePointer);
    };
  }, []);

  return <img ref={ref} src={src} alt="" aria-hidden="true" className={`select-none ${className}`} draggable={false} />;
}

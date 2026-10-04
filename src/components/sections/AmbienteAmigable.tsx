import type { ReactNode } from "react";

/**
 * Ambiente visual compartido por el login y la recuperación de contraseña: formas decorativas flotantes
 * (estrellas, círculos, libros y lápices en SVG) y las animaciones de la mascota. Todo es CSS/SVG, liviano,
 * y se desactiva con prefers-reduced-motion.
 */

const CSS = `
@keyframes amb-drift {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
  50% { transform: translate3d(12px, -20px, 0) rotate(10deg); }
}
@keyframes amb-twinkle {
  0%, 100% { opacity: var(--o, 0.25); transform: scale(1) rotate(0deg); }
  50% { opacity: calc(var(--o, 0.25) * 1.9); transform: scale(1.15) rotate(12deg); }
}
@keyframes amb-shake {
  0%, 100% { transform: translateX(0); }
  15% { transform: translateX(-10px) rotate(-3deg); }
  30% { transform: translateX(9px) rotate(3deg); }
  45% { transform: translateX(-7px) rotate(-2deg); }
  60% { transform: translateX(6px) rotate(2deg); }
  80% { transform: translateX(-3px); }
}
@keyframes amb-jump {
  0% { transform: translateY(0) scale(1, 1); }
  25% { transform: translateY(0) scale(1.06, 0.92); }
  55% { transform: translateY(-34px) scale(0.96, 1.06); }
  80% { transform: translateY(0) scale(1.05, 0.94); }
  100% { transform: translateY(0) scale(1, 1); }
}
@keyframes amb-rise {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes amb-pop {
  0% { opacity: 0; transform: scale(0.7); }
  70% { transform: scale(1.08); }
  100% { opacity: 1; transform: scale(1); }
}
.amb-item { position: absolute; will-change: transform; animation: amb-drift var(--d, 16s) ease-in-out infinite; animation-delay: var(--dl, 0s); }
.amb-item.amb-star { animation-name: amb-twinkle; }
.amb-shake { animation: amb-shake 600ms ease-in-out both; }
.amb-jump { animation: amb-jump 650ms cubic-bezier(0.3, 0.7, 0.4, 1) both; }
.amb-rise { animation: amb-rise 520ms cubic-bezier(0.22, 1, 0.36, 1) both; }
.amb-pop { animation: amb-pop 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }
@media (prefers-reduced-motion: reduce) {
  .amb-item, .amb-shake, .amb-jump, .amb-rise, .amb-pop { animation: none !important; }
}
`;

type Forma = "star" | "circle" | "book" | "pencil";
type Item = { forma: Forma; left: string; top: string; size: number; color: string; o: number; d: number; dl: number; rot?: number };

const ITEMS: Item[] = [
  { forma: "star", left: "7%", top: "16%", size: 34, color: "#d8a842", o: 0.3, d: 5, dl: 0 },
  { forma: "book", left: "14%", top: "62%", size: 54, color: "#9f171b", o: 0.16, d: 19, dl: 1.5, rot: -12 },
  { forma: "pencil", left: "24%", top: "30%", size: 52, color: "#d8a842", o: 0.28, d: 17, dl: 3, rot: 35 },
  { forma: "circle", left: "30%", top: "84%", size: 26, color: "#9f171b", o: 0.14, d: 14, dl: 2 },
  { forma: "star", left: "42%", top: "8%", size: 22, color: "#9f171b", o: 0.2, d: 6, dl: 1 },
  { forma: "circle", left: "62%", top: "12%", size: 38, color: "#d8a842", o: 0.2, d: 15, dl: 4 },
  { forma: "pencil", left: "78%", top: "70%", size: 56, color: "#9f171b", o: 0.15, d: 18, dl: 2.5, rot: -30 },
  { forma: "star", left: "88%", top: "22%", size: 38, color: "#d8a842", o: 0.3, d: 5.5, dl: 2 },
  { forma: "book", left: "84%", top: "46%", size: 48, color: "#d8a842", o: 0.24, d: 21, dl: 0.5, rot: 14 },
  { forma: "circle", left: "70%", top: "90%", size: 30, color: "#d8a842", o: 0.22, d: 13, dl: 3.5 },
  { forma: "star", left: "52%", top: "78%", size: 24, color: "#d8a842", o: 0.22, d: 7, dl: 4 },
  { forma: "circle", left: "4%", top: "42%", size: 22, color: "#d8a842", o: 0.22, d: 12, dl: 1.2 },
];

function Figura({ forma, color }: { forma: Forma; color: string }) {
  switch (forma) {
    case "star":
      return (
        <svg viewBox="0 0 24 24" width="100%" height="100%" fill={color}>
          <path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z" />
        </svg>
      );
    case "circle":
      return (
        <svg viewBox="0 0 24 24" width="100%" height="100%">
          <circle cx="12" cy="12" r="10" fill={color} />
          <circle cx="12" cy="12" r="5.5" fill="#fff" opacity="0.55" />
        </svg>
      );
    case "book":
      return (
        <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
          <path d="M3 5.5C5.5 4.2 8.5 4.2 12 6c3.5-1.8 6.5-1.8 9-.5V19c-2.5-1.3-5.5-1.3-9 .5-3.5-1.8-6.5-1.8-9-.5z" fill={color} fillOpacity="0.35" />
          <path d="M12 6v13.5" />
        </svg>
      );
    case "pencil":
      return (
        <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
          <path d="M4 20l1.2-4.4L16.6 4.2a1.8 1.8 0 012.5 0l.7.7a1.8 1.8 0 010 2.5L8.4 18.8z" fill={color} fillOpacity="0.35" />
          <path d="M14.8 6l3.2 3.2" />
        </svg>
      );
  }
}

/** Capa de formas flotantes; va dentro de un contenedor `relative overflow-hidden`. */
export function AmbienteAmigable(): ReactNode {
  return (
    <>
      <style>{CSS}</style>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {ITEMS.map((item, i) => (
          <span
            key={i}
            className={`amb-item ${item.forma === "star" ? "amb-star" : ""}`}
            style={
              {
                left: item.left,
                top: item.top,
                width: item.size,
                height: item.size,
                opacity: item.o,
                rotate: item.rot ? `${item.rot}deg` : undefined,
                ["--d" as string]: `${item.d}s`,
                ["--dl" as string]: `${item.dl}s`,
                ["--o" as string]: item.o,
              } as React.CSSProperties
            }
          >
            <Figura forma={item.forma} color={item.color} />
          </span>
        ))}
      </div>
    </>
  );
}

/** Saludo según la hora del día. */
export function saludoDeLaHora(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "¡Buenos días!";
  if (h < 19) return "¡Buenas tardes!";
  return "¡Buenas noches!";
}

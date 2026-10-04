import { AlertTriangle, ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, Mail, Send, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { monserratApi } from "../../api/monserrat";
import { AmbienteAmigable } from "./AmbienteAmigable";
import { MonsterCharacter } from "./MonsterCharacter";

type PasswordResetPageProps = {
  onNavigate: (path: string) => void;
};

const MONSTER_BASE = "/monster";

export function PasswordResetPage({ onNavigate }: PasswordResetPageProps) {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialToken = params.get("token") ?? "";
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [monsterSrc, setMonsterSrc] = useState(`${MONSTER_BASE}/idle/1.png`);
  const [estado, setEstado] = useState<"idle" | "error" | "exito">("idle");
  const estadoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seguirPunteroMouseRef = useRef(true);
  const pausaLecturaHastaRef = useRef(0);
  const coverIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isResetMode = Boolean(initialToken);

  useEffect(() => {
    function handlePointer(event: PointerEvent) {
      if (!seguirPunteroMouseRef.current || Date.now() < pausaLecturaHastaRef.current) return;

      const anchoMitad = window.innerWidth / 2;
      const altoMitad = window.innerHeight / 2;

      if (event.clientX < anchoMitad && event.clientY < altoMitad) {
        setMonsterSrc(`${MONSTER_BASE}/idle/2.png`);
      } else if (event.clientX < anchoMitad && event.clientY > altoMitad) {
        setMonsterSrc(`${MONSTER_BASE}/idle/3.png`);
      } else if (event.clientX > anchoMitad && event.clientY < altoMitad) {
        setMonsterSrc(`${MONSTER_BASE}/idle/5.png`);
      } else {
        setMonsterSrc(`${MONSTER_BASE}/idle/4.png`);
      }
    }

    // Eventos de puntero: funcionan con mouse, lápiz y dedo (celular y tablet).
    window.addEventListener("pointermove", handlePointer, { passive: true });
    window.addEventListener("pointerdown", handlePointer, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointer);
      window.removeEventListener("pointerdown", handlePointer);
      if (coverIntervalRef.current) clearInterval(coverIntervalRef.current);
      if (estadoTimerRef.current) clearTimeout(estadoTimerRef.current);
    };
  }, []);

  const handleTextFocus = () => {
    seguirPunteroMouseRef.current = true; // sigue al puntero; solo se pausa al escribir
  };

  const handleTextBlur = () => {
    seguirPunteroMouseRef.current = true;
  };

  const handleReadInput = (value: string) => {
    pausaLecturaHastaRef.current = Date.now() + 1500;
    const length = value.length;
    if (length >= 0 && length <= 5) {
      setMonsterSrc(`${MONSTER_BASE}/read/1.png`);
    } else if (length >= 6 && length <= 14) {
      setMonsterSrc(`${MONSTER_BASE}/read/2.png`);
    } else if (length >= 15 && length <= 20) {
      setMonsterSrc(`${MONSTER_BASE}/read/3.png`);
    } else {
      setMonsterSrc(`${MONSTER_BASE}/read/3.png`); // solo existen los fotogramas read/1..3
    }
  };

  const handlePasswordFocus = () => {
    seguirPunteroMouseRef.current = false;
    if (coverIntervalRef.current) clearInterval(coverIntervalRef.current);

    let frame = 1;
    coverIntervalRef.current = setInterval(() => {
      setMonsterSrc(`${MONSTER_BASE}/cover/${frame}.png`);
      if (frame < 8) {
        frame++;
      } else if (coverIntervalRef.current) {
        clearInterval(coverIntervalRef.current);
      }
    }, 60);
  };

  const handlePasswordBlur = () => {
    seguirPunteroMouseRef.current = true;
    if (coverIntervalRef.current) clearInterval(coverIntervalRef.current);

    let frame = 7;
    coverIntervalRef.current = setInterval(() => {
      setMonsterSrc(`${MONSTER_BASE}/cover/${frame}.png`);
      if (frame > 1) {
        frame--;
      } else if (coverIntervalRef.current) {
        clearInterval(coverIntervalRef.current);
      }
    }, 60);
  };

  const animarMascota = (nuevo: "error" | "exito") => {
    setEstado(nuevo);
    if (estadoTimerRef.current) clearTimeout(estadoTimerRef.current);
    estadoTimerRef.current = setTimeout(() => setEstado("idle"), 700);
  };

  const mostrarError = (texto: string) => {
    setMessage(null);
    setErrorMessage(texto);
    animarMascota("error");
  };

  const mostrarExito = (texto: string) => {
    setErrorMessage(null);
    setMessage(texto);
    animarMascota("exito");
  };

  const handleRequestReset = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      mostrarError("Escribe el correo con el que está registrada tu cuenta.");
      return;
    }
    setIsBusy(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      await monserratApi.forgotPassword(email.trim());
      mostrarExito("Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.");
      setEmail("");
    } catch (error) {
      mostrarError(error instanceof Error ? error.message : "No fue posible enviar el correo");
    } finally {
      setIsBusy(false);
    }
  };

  const handleResetPassword = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setMessage(null);

    if (newPassword.length < 6) {
      mostrarError("Tu contraseña nueva debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      mostrarError("Las contraseñas no coinciden. Vuelve a escribirlas.");
      return;
    }

    setIsBusy(true);
    try {
      await monserratApi.resetPassword(initialToken, newPassword);
      mostrarExito("¡Listo! Tu contraseña fue actualizada. Ya puedes ingresar con la nueva clave.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      mostrarError(error instanceof Error ? error.message : "No fue posible restablecer la contraseña");
    } finally {
      setIsBusy(false);
    }
  };

  const campo =
    "group flex items-center gap-2.5 rounded-2xl border-2 border-monserrat-gold/40 bg-white px-4 shadow-sm transition focus-within:border-monserrat-red focus-within:shadow-[0_0_0_4px_rgba(159,23,27,0.08)]";
  const icono = "text-monserrat-gold transition group-focus-within:text-monserrat-red";
  const entrada =
    "h-12 w-full border-0 bg-transparent text-[15px] text-monserrat-ink outline-none placeholder:text-monserrat-ink/35";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(135deg,_#f8efe1_0%,_#f4e7c9_45%,_#efe4ca_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-[-8%] top-[-10%] h-64 w-64 rounded-full bg-monserrat-gold/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-8%] right-[-8%] h-72 w-72 rounded-full bg-monserrat-red/10 blur-3xl" />
      <AmbienteAmigable />

      <button
        type="button"
        onClick={() => onNavigate("/portal")}
        className="fixed left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-monserrat-ink/12 bg-white/90 px-4 py-2 text-xs font-black text-monserrat-ink/65 backdrop-blur transition hover:text-monserrat-red sm:left-6 sm:top-6"
      >
        <ArrowLeft size={14} />
        Volver al ingreso
      </button>

      <div className="relative z-[1] flex flex-col items-center">
        <div className="relative z-10 -mb-20">
          <MonsterCharacter src={monsterSrc} estado={estado} />
        </div>

        <section className="amb-rise relative w-full max-w-[620px] rounded-[28px] border-2 border-monserrat-gold/35 bg-[#fffdf8] px-7 pb-8 pt-16 text-center shadow-[0_24px_70px_rgba(31,27,24,0.15)] sm:w-[560px] sm:px-10 sm:pb-12 sm:pt-20 lg:px-14 lg:pb-14">
          <div className="mb-6 flex items-center gap-3 text-left">
            <img src="/logo-montserrat.png" alt="" className="h-11 w-auto object-contain" draggable={false} />
            <div>
              <h1 className="text-xl font-black leading-tight text-monserrat-ink">
                {isResetMode ? "Nueva contraseña" : "Recuperar contraseña"}
              </h1>
              <p className="text-xs font-semibold text-monserrat-ink/55">
                {isResetMode ? "Elige una clave fácil de recordar y segura." : "Te enviaremos un enlace a tu correo."}
              </p>
            </div>
          </div>

          {message && (
            <div role="status" className="amb-pop mb-5 flex items-start gap-2.5 rounded-2xl border-2 border-green-200 bg-green-50 px-4 py-3 text-left text-sm font-bold text-green-800">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {errorMessage && (
            <div role="alert" className="amb-pop mb-5 flex items-start gap-2.5 rounded-2xl border-2 border-monserrat-red/25 bg-[#fdf0f0] px-4 py-3 text-left text-sm font-bold text-monserrat-red">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isResetMode ? (
            <form onSubmit={handleResetPassword} noValidate className="text-left">
              <label htmlFor="reset-nueva" className="mb-1.5 block text-sm font-bold text-monserrat-ink/70">Nueva contraseña</label>
              <div className={`mb-4 ${campo}`}>
                <Lock size={18} className={icono} />
                <input
                  id="reset-nueva"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  onFocus={handlePasswordFocus}
                  onBlur={handlePasswordBlur}
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                  className={entrada}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="rounded-lg p-1 text-monserrat-gold transition hover:text-monserrat-red"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <label htmlFor="reset-confirmar" className="mb-1.5 block text-sm font-bold text-monserrat-ink/70">Confirmar contraseña</label>
              <div className={`mb-5 ${campo}`}>
                <Lock size={18} className={icono} />
                <input
                  id="reset-confirmar"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  onFocus={handlePasswordFocus}
                  onBlur={handlePasswordBlur}
                  autoComplete="new-password"
                  placeholder="Repite tu contraseña"
                  className={entrada}
                />
              </div>

              <PrimaryButton isBusy={isBusy} label="Actualizar contraseña" busyLabel="Actualizando…" icon={<ShieldCheck size={18} />} />
            </form>
          ) : (
            <form onSubmit={handleRequestReset} noValidate className="text-left">
              <label htmlFor="reset-correo" className="mb-1.5 block text-sm font-bold text-monserrat-ink/70">Correo registrado</label>
              <div className={`mb-5 ${campo}`}>
                <Mail size={18} className={icono} />
                <input
                  id="reset-correo"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    handleReadInput(event.target.value);
                  }}
                  onFocus={handleTextFocus}
                  onBlur={handleTextBlur}
                  autoComplete="email"
                  placeholder="correo@ejemplo.com"
                  className={entrada}
                />
              </div>

              <PrimaryButton isBusy={isBusy} label="Enviar enlace" busyLabel="Enviando…" icon={<Send size={18} />} />
            </form>
          )}

          <button
            type="button"
            onClick={() => onNavigate("/portal")}
            className="mt-5 w-full text-sm font-black text-monserrat-red transition hover:text-monserrat-redDark"
          >
            Volver al ingreso
          </button>
        </section>
      </div>
    </main>
  );
}

function PrimaryButton({
  isBusy,
  label,
  busyLabel,
  icon
}: {
  isBusy: boolean;
  label: string;
  busyLabel: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={isBusy}
      className="inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-monserrat-red text-base font-black text-white shadow-[0_10px_24px_rgba(159,23,27,0.2)] transition hover:bg-monserrat-redDark disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isBusy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : icon}
      {isBusy ? busyLabel : label}
    </button>
  );
}

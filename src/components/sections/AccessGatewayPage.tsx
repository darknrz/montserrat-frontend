import { AlertTriangle, Eye, EyeOff, Lock, ShieldCheck, Sparkles, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { monserratApi } from "../../api/monserrat";
import type { LoginResponse } from "../../types";
import { isAdminRole } from "../../types";
import { AmbienteAmigable, saludoDeLaHora } from "./AmbienteAmigable";
import { MonsterCharacter } from "./MonsterCharacter";

type AccessGatewayPageProps = {
  onNavigate: (path: string) => void;
};

const MONSTER_BASE = "/monster";

export function AccessGatewayPage({ onNavigate }: AccessGatewayPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  // Estado visual de la mascota: "error" (niega con la cabeza) y "exito" (salta de alegría).
  const [estado, setEstado] = useState<"idle" | "error" | "exito">("idle");
  const [capsLock, setCapsLock] = useState(false);
  const estadoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [monsterSrc, setMonsterSrc] = useState(`${MONSTER_BASE}/idle/1.png`);
  const seguirPunteroMouseRef = useRef(true);
  // Mientras se escribe en un campo de texto la mascota "lee"; pasado este instante vuelve a seguir el puntero.
  const pausaLecturaHastaRef = useRef(0);
  const coverIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Precarga todos los fotogramas de la mascota para que las animaciones no parpadeen.
  useEffect(() => {
    const frames = [
      ...[1, 2, 3, 4, 5].map((n) => `${MONSTER_BASE}/idle/${n}.png`),
      ...[1, 2, 3].map((n) => `${MONSTER_BASE}/read/${n}.png`),
      ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `${MONSTER_BASE}/cover/${n}.png`),
    ];
    frames.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    return () => {
      if (coverIntervalRef.current) clearInterval(coverIntervalRef.current);
      if (estadoTimerRef.current) clearTimeout(estadoTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const adminSession = readSession("monserrat_admin_session");
    if (isAdminRole(adminSession?.rol)) {
      onNavigate("/portal");
      return;
    }

    const academicSession = readSession("monserrat_academic_session");
    if (academicSession?.rol === "DOCENTE" || academicSession?.rol === "ALUMNO") {
      onNavigate("/portal");
    }
  }, [onNavigate]);

  // Sigue el puntero (mouse, lápiz o dedo) dividiendo la pantalla completa en 4 cuadrantes.
  // Se usan eventos de puntero: en celular y tablet reaccionan al tocar y al arrastrar el dedo.
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

    window.addEventListener("pointermove", handlePointer, { passive: true });
    window.addEventListener("pointerdown", handlePointer, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointer);
      window.removeEventListener("pointerdown", handlePointer);
    };
  }, []);

  // Con el campo de usuario activo la mascota sigue al puntero; solo se pausa al escribir.
  const handleUsernameFocus = () => {
    seguirPunteroMouseRef.current = true;
  };

  const handleUsernameBlur = () => {
    seguirPunteroMouseRef.current = true;
  };

  const handleUsernameKeyUp = (value: string) => {
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

  const mostrarError = (mensaje: string) => {
    setErrorMessage(mensaje);
    setEstado("error");
    if (estadoTimerRef.current) clearTimeout(estadoTimerRef.current);
    estadoTimerRef.current = setTimeout(() => setEstado("idle"), 700);
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (isBusy) return;

    // Validación amable (sin los globos del navegador).
    if (!username.trim()) {
      mostrarError("Escribe tu DNI o tu usuario para entrar.");
      return;
    }
    if (!password) {
      mostrarError("Escribe tu contraseña.");
      return;
    }

    setIsBusy(true);
    setErrorMessage(null);

    try {
      const response = await monserratApi.login(username.trim(), password);

      const esAdmin = isAdminRole(response.rol);
      const esAcademico = response.rol === "DOCENTE" || response.rol === "ALUMNO";
      if (!esAdmin && !esAcademico) {
        throw new Error("Rol no permitido");
      }

      if (esAdmin) {
        window.localStorage.removeItem("monserrat_academic_session");
        window.localStorage.setItem("monserrat_admin_session", JSON.stringify(response));
      } else {
        window.localStorage.removeItem("monserrat_admin_session");
        window.localStorage.setItem("monserrat_academic_session", JSON.stringify(response));
      }

      // Celebración corta antes de entrar al portal.
      setEstado("exito");
      await new Promise((resolve) => setTimeout(resolve, 700));
      if (window.location.pathname === "/portal") {
        window.location.reload();
      } else {
        onNavigate("/portal");
      }
    } catch (error) {
      mostrarError(error instanceof Error ? error.message : "Credenciales incorrectas");
    } finally {
      setIsBusy(false);
    }
  };

  const campo =
    "group flex items-center gap-2.5 rounded-2xl border-2 border-monserrat-gold/40 bg-white px-4 shadow-sm transition focus-within:border-monserrat-red focus-within:shadow-[0_0_0_4px_rgba(159,23,27,0.08)]";
  const icono = "text-monserrat-gold transition group-focus-within:text-monserrat-red";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(135deg,_#f8efe1_0%,_#f4e7c9_45%,_#efe4ca_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-[-8%] top-[-10%] h-64 w-64 rounded-full bg-monserrat-gold/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-8%] right-[-8%] h-72 w-72 rounded-full bg-monserrat-red/10 blur-3xl" />
      <AmbienteAmigable />

      <a
        href="/"
        className="fixed left-4 top-4 z-10 inline-flex rounded-full border border-monserrat-ink/12 bg-white/90 px-4 py-2 text-xs font-black text-monserrat-ink/65 backdrop-blur sm:left-6 sm:top-6"
      >
        Volver al sitio público
      </a>

      <div className="relative z-[1] flex flex-col items-center">
        <div className="amb-rise mb-2 text-center">
          {estado === "exito" ? (
            <p key="ok" className="amb-pop inline-flex items-center gap-2 rounded-full bg-monserrat-red px-5 py-1.5 text-sm font-black text-white shadow-[0_10px_24px_rgba(159,23,27,0.25)]">
              <Sparkles size={15} /> ¡Bienvenido! Entrando…
            </p>
          ) : (
            <>
              <p className="text-[22px] font-black leading-tight text-monserrat-ink sm:text-[26px]">{saludoDeLaHora()}</p>
              <p className="text-sm font-semibold text-monserrat-ink/60">¿Listo para aprender hoy?</p>
            </>
          )}
        </div>

        <div className="relative z-10 -mb-20">
          <MonsterCharacter src={monsterSrc} estado={estado} />
        </div>

        <form
          onSubmit={handleLogin}
          noValidate
          className="amb-rise relative w-full max-w-[620px] rounded-[28px] border-2 border-monserrat-gold/35 bg-[#fffdf8] px-7 pb-8 pt-16 text-center shadow-[0_24px_70px_rgba(31,27,24,0.15)] sm:w-[560px] sm:px-10 sm:pb-12 sm:pt-20 lg:px-14 lg:pb-14"
        >
          <div className="mb-6 flex items-center justify-center gap-3">
            <img src="/logo-montserrat.png" alt="" className="h-11 w-auto object-contain" draggable={false} />
            <div className="text-left">
              <h1 className="text-xl font-black leading-tight text-monserrat-ink">Portal Monserrat</h1>
              <p className="text-xs font-semibold text-monserrat-ink/55">Ingresa con tu DNI y tu contraseña</p>
            </div>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="amb-pop mb-5 flex items-start gap-2.5 rounded-2xl border-2 border-monserrat-red/25 bg-[#fdf0f0] px-4 py-3 text-left text-sm font-bold text-monserrat-red"
            >
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <label htmlFor="login-usuario" className="mb-1.5 block text-left text-sm font-bold text-monserrat-ink/70">
            Usuario
          </label>
          <div className={`mb-5 ${campo}`}>
            <User size={18} className={icono} />
            <input
              id="login-usuario"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                handleUsernameKeyUp(event.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              onFocus={handleUsernameFocus}
              onBlur={handleUsernameBlur}
              placeholder="Tu DNI o usuario"
              autoComplete="username"
              inputMode="text"
              className="h-12 w-full border-0 bg-transparent text-[15px] text-monserrat-ink outline-none placeholder:text-monserrat-ink/35"
            />
          </div>

          <label htmlFor="login-clave" className="mb-1.5 block text-left text-sm font-bold text-monserrat-ink/70">
            Contraseña
          </label>
          <div className={`mb-2 ${campo}`}>
            <Lock size={18} className={icono} />
            <input
              id="login-clave"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              onFocus={handlePasswordFocus}
              onBlur={() => {
                handlePasswordBlur();
                setCapsLock(false);
              }}
              onKeyDown={(event) => setCapsLock(event.getModifierState("CapsLock"))}
              onKeyUp={(event) => setCapsLock(event.getModifierState("CapsLock"))}
              placeholder="Tu contraseña"
              autoComplete="current-password"
              className="h-12 w-full border-0 bg-transparent text-[15px] text-monserrat-ink outline-none placeholder:text-monserrat-ink/35"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="rounded-lg p-1 text-monserrat-gold transition hover:text-monserrat-red focus-visible:outline-2"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {capsLock && (
            <p role="status" className="amb-pop mb-1 flex items-center gap-1.5 text-left text-xs font-black text-[#8a6a14]">
              <AlertTriangle size={13} /> Tienes las mayúsculas activadas (Bloq Mayús).
            </p>
          )}

          <div className="text-right">
            <button
              type="button"
              onClick={() => onNavigate("/restablecer-password")}
              className="text-sm font-black text-monserrat-red/75 transition hover:text-monserrat-red"
            >
              Olvidé mi contraseña
            </button>
          </div>

          <button
            type="submit"
            disabled={isBusy}
            className="mt-6 inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-monserrat-red text-base font-black text-white shadow-[0_10px_24px_rgba(159,23,27,0.2)] transition hover:bg-monserrat-redDark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBusy ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <ShieldCheck size={18} />
            )}
            {isBusy ? (estado === "exito" ? "¡Bienvenido!" : "Verificando…") : "Ingresar"}
          </button>

          {/* Ayuda para la primera vez: coincide con el alta de alumnos y docentes (usuario = DNI, clave inicial = DNI). */}
          <div className="mt-5 rounded-2xl border-2 border-monserrat-gold/30 bg-[#fff7e3] px-4 py-3 text-left text-[13px] font-semibold leading-5 text-monserrat-ink/70">
            <span className="font-black text-monserrat-ink">¿Primera vez?</span> Si eres alumno o docente, tu usuario es tu
            DNI y tu contraseña inicial también es tu DNI. El sistema te pedirá cambiarla al entrar.
          </div>
        </form>
      </div>
    </main>
  );
}

function readSession(key: string): LoginResponse | null {
  const stored = window.localStorage.getItem(key);
  return stored ? (JSON.parse(stored) as LoginResponse) : null;
}

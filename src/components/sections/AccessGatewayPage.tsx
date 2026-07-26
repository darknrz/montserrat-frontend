import { Eye, EyeOff, Lock, ShieldCheck, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { monserratApi } from "../../api/monserrat";
import type { LoginResponse } from "../../types";
import { FeedbackModal } from "../ui/FeedbackModal";
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

  const [monsterSrc, setMonsterSrc] = useState(`${MONSTER_BASE}/idle/1.png`);
  const seguirPunteroMouseRef = useRef(true);
  const coverIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const adminSession = readSession("monserrat_admin_session");
    if (adminSession?.rol === "ADMIN") {
      onNavigate("/portal");
      return;
    }

    const academicSession = readSession("monserrat_academic_session");
    if (academicSession?.rol === "DOCENTE" || academicSession?.rol === "ALUMNO") {
      onNavigate("/portal");
    }
  }, [onNavigate]);

  // Sigue el cursor dividiendo la pantalla completa en 4 cuadrantes
  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      if (!seguirPunteroMouseRef.current) return;

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

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleUsernameFocus = () => {
    seguirPunteroMouseRef.current = false;
  };

  const handleUsernameBlur = () => {
    seguirPunteroMouseRef.current = true;
  };

  const handleUsernameKeyUp = (value: string) => {
    const length = value.length;
    if (length >= 0 && length <= 5) {
      setMonsterSrc(`${MONSTER_BASE}/read/1.png`);
    } else if (length >= 6 && length <= 14) {
      setMonsterSrc(`${MONSTER_BASE}/read/2.png`);
    } else if (length >= 15 && length <= 20) {
      setMonsterSrc(`${MONSTER_BASE}/read/3.png`);
    } else {
      setMonsterSrc(`${MONSTER_BASE}/read/4.png`);
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

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setIsBusy(true);
    setErrorMessage(null);

    try {
      const response = await monserratApi.login(username, password);

      if (response.rol === "ADMIN") {
        window.localStorage.removeItem("monserrat_academic_session");
        window.localStorage.setItem("monserrat_admin_session", JSON.stringify(response));
        if (window.location.pathname === "/portal") {
          window.location.reload();
        } else {
          onNavigate("/portal");
        }
        return;
      }

      if (response.rol === "DOCENTE" || response.rol === "ALUMNO") {
        window.localStorage.removeItem("monserrat_admin_session");
        window.localStorage.setItem("monserrat_academic_session", JSON.stringify(response));
        if (window.location.pathname === "/portal") {
          window.location.reload();
        } else {
          onNavigate("/portal");
        }
        return;
      }

      throw new Error("Rol no permitido");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Credenciales incorrectas");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(135deg,_#f8efe1_0%,_#f4e7c9_45%,_#efe4ca_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-[-8%] top-[-10%] h-64 w-64 rounded-full bg-monserrat-gold/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-8%] right-[-8%] h-72 w-72 rounded-full bg-monserrat-red/10 blur-3xl" />

      <a
        href="/"
        className="fixed left-4 top-4 z-10 inline-flex rounded-full border border-monserrat-ink/12 bg-white/90 px-4 py-2 text-xs font-black text-monserrat-ink/65 backdrop-blur sm:left-6 sm:top-6"
      >
        Volver al sitio publico
      </a>

      <FeedbackModal
        isOpen={Boolean(errorMessage)}
        title="No fue posible ingresar"
        message={errorMessage ?? ""}
        onClose={() => setErrorMessage(null)}
      />

      <div className="flex flex-col items-center">
        <div className="relative z-10 -mb-20">
          <MonsterCharacter src={monsterSrc} />
        </div>

        <form
          onSubmit={handleLogin}
          className="relative w-full max-w-[620px] rounded-[28px] border border-monserrat-red/20 bg-[#fffdf8] px-7 py-8 text-center shadow-[0_24px_70px_rgba(31,27,24,0.15)] sm:w-[560px] sm:px-10 sm:py-12 lg:px-14 lg:py-14"
        >
          <label className="mb-1.5 block text-left text-sm font-bold text-monserrat-ink/70">Usuario</label>
          <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-monserrat-red/20 bg-white/80 px-4 shadow-sm">
            <User size={17} className="text-monserrat-red/60" />
            <input
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                handleUsernameKeyUp(event.target.value);
              }}
              onFocus={handleUsernameFocus}
              onBlur={handleUsernameBlur}
              placeholder="giovanni.developer@gmail.com"
              autoComplete="off"
              required
              className="h-12 w-full border-0 text-[15px] text-monserrat-ink outline-none"
            />
          </div>

          <label className="mb-1.5 block text-left text-sm font-bold text-monserrat-ink/70">Contraseña</label>
          <div className="mb-2 flex items-center gap-2.5 rounded-2xl border border-monserrat-red/20 bg-white/80 px-4 shadow-sm">
            <Lock size={17} className="text-monserrat-red/60" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onFocus={handlePasswordFocus}
              onBlur={handlePasswordBlur}
              placeholder="*******"
              required
              className="h-12 w-full border-0 text-[15px] text-monserrat-ink outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-monserrat-red/50 transition hover:text-monserrat-red"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          <button
            disabled={isBusy}
            className="mt-6 inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-monserrat-red text-base font-black text-white shadow-[0_10px_24px_rgba(159,23,27,0.2)] transition hover:bg-monserrat-redDark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBusy ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <ShieldCheck size={18} />
            )}
            {isBusy ? "Verificando…" : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}

function readSession(key: string): LoginResponse | null {
  const stored = window.localStorage.getItem(key);
  return stored ? (JSON.parse(stored) as LoginResponse) : null;
}
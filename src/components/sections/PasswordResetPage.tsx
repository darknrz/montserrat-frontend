import { ArrowLeft, Eye, EyeOff, Lock, Mail, Send, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { monserratApi } from "../../api/monserrat";
import { FeedbackModal } from "../ui/FeedbackModal";
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
  const seguirPunteroMouseRef = useRef(true);
  const coverIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isResetMode = Boolean(initialToken);

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
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (coverIntervalRef.current) clearInterval(coverIntervalRef.current);
    };
  }, []);

  const handleTextFocus = () => {
    seguirPunteroMouseRef.current = false;
  };

  const handleTextBlur = () => {
    seguirPunteroMouseRef.current = true;
  };

  const handleReadInput = (value: string) => {
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

  const handleRequestReset = async (event: FormEvent) => {
    event.preventDefault();
    setIsBusy(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      await monserratApi.forgotPassword(email);
      setMessage("Si el correo esta registrado, recibiras un enlace para restablecer tu contrasena.");
      setEmail("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No fue posible enviar el correo");
    } finally {
      setIsBusy(false);
    }
  };

  const handleResetPassword = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage("Las contrasenas no coinciden");
      return;
    }

    setIsBusy(true);
    try {
      await monserratApi.resetPassword(initialToken, newPassword);
      setMessage("Tu contrasena fue actualizada. Ya puedes ingresar con la nueva clave.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No fue posible restablecer la contrasena");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(135deg,_#f8efe1_0%,_#f4e7c9_45%,_#efe4ca_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => onNavigate("/portal")}
        className="fixed left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-monserrat-ink/12 bg-white/90 px-4 py-2 text-xs font-black text-monserrat-ink/65 backdrop-blur transition hover:text-monserrat-red sm:left-6 sm:top-6"
      >
        <ArrowLeft size={14} />
        Volver al ingreso
      </button>

      <FeedbackModal
        isOpen={Boolean(errorMessage)}
        title="No se pudo completar"
        message={errorMessage ?? ""}
        onClose={() => setErrorMessage(null)}
      />

      <div className="flex flex-col items-center">
        <div className="relative z-10 -mb-20">
          <MonsterCharacter src={monsterSrc} />
        </div>

        <section className="relative w-full max-w-[620px] rounded-[28px] border border-monserrat-red/20 bg-[#fffdf8] px-7 py-8 text-center shadow-[0_24px_70px_rgba(31,27,24,0.15)] sm:w-[560px] sm:px-10 sm:py-12 lg:px-14 lg:py-14">
          <div className="mb-7 pt-6 text-left">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-monserrat-red text-white shadow-[0_10px_22px_rgba(159,23,27,0.18)]">
              <Lock size={20} />
            </div>
            <h1 className="text-2xl font-black text-monserrat-ink">
              {isResetMode ? "Nueva contrasena" : "Recuperar contrasena"}
            </h1>
            <p className="mt-1 text-sm font-semibold leading-6 text-monserrat-ink/60">
              {isResetMode ? "Define una clave segura para tu cuenta." : "Te enviaremos un enlace de restablecimiento."}
            </p>
          </div>

          {message && (
            <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-left text-sm font-semibold text-green-800">
              {message}
            </div>
          )}

          {isResetMode ? (
            <form onSubmit={handleResetPassword} className="text-left">
              <label className="mb-1.5 block text-sm font-bold text-monserrat-ink/70">Nueva contrasena</label>
              <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-monserrat-red/20 bg-white/80 px-4 shadow-sm focus-within:border-monserrat-red">
                <Lock size={17} className="text-monserrat-red/60" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  onFocus={handlePasswordFocus}
                  onBlur={handlePasswordBlur}
                  minLength={6}
                  required
                  className="h-12 w-full border-0 text-[15px] text-monserrat-ink outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-monserrat-red/50 transition hover:text-monserrat-red"
                  aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>

              <label className="mb-1.5 block text-sm font-bold text-monserrat-ink/70">Confirmar contrasena</label>
              <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-monserrat-red/20 bg-white/80 px-4 shadow-sm focus-within:border-monserrat-red">
                <Lock size={17} className="text-monserrat-red/60" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  onFocus={handlePasswordFocus}
                  onBlur={handlePasswordBlur}
                  minLength={6}
                  required
                  className="h-12 w-full border-0 text-[15px] text-monserrat-ink outline-none"
                />
              </div>

              <PrimaryButton isBusy={isBusy} label="Actualizar contrasena" busyLabel="Actualizando..." icon={<ShieldCheck size={18} />} />
            </form>
          ) : (
            <form onSubmit={handleRequestReset} className="text-left">
              <label className="mb-1.5 block text-sm font-bold text-monserrat-ink/70">Correo registrado</label>
              <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-monserrat-red/20 bg-white/80 px-4 shadow-sm focus-within:border-monserrat-red">
                <Mail size={17} className="text-monserrat-red/60" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    handleReadInput(event.target.value);
                  }}
                  onFocus={handleTextFocus}
                  onBlur={handleTextBlur}
                  placeholder="correo@ejemplo.com"
                  required
                  className="h-12 w-full border-0 text-[15px] text-monserrat-ink outline-none"
                />
              </div>

              <PrimaryButton isBusy={isBusy} label="Enviar enlace" busyLabel="Enviando..." icon={<Send size={18} />} />
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
      disabled={isBusy}
      className="inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-monserrat-red text-base font-black text-white shadow-[0_10px_24px_rgba(159,23,27,0.2)] transition hover:bg-monserrat-redDark disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isBusy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : icon}
      {isBusy ? busyLabel : label}
    </button>
  );
}

import { GraduationCap, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { monserratApi } from "../../api/monserrat";
import type { LoginResponse } from "../../types";
import { SectionHeader } from "../ui/SectionHeader";

type AccessGatewayPageProps = {
  onNavigate: (path: string) => void;
};

export function AccessGatewayPage({ onNavigate }: AccessGatewayPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

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

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setIsBusy(true);
    setStatus(null);

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
      setStatus(error instanceof Error ? error.message : "Credenciales incorrectas");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-monserrat-cream px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <a href="/" className="inline-flex rounded-full border border-monserrat-ink/12 bg-white px-4 py-2 text-xs font-black text-monserrat-ink/65">
          Volver al sitio publico
        </a>
        <SectionHeader eyebrow="Montserrat" title="Acceso institucional" description="Ingresa con tus credenciales y el sistema te enviara a tu interfaz segun el rol." />

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <form onSubmit={handleLogin} className="grid gap-4 rounded-[20px] border border-monserrat-ink/10 bg-white p-7 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-monserrat-red text-white">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className="font-serif text-xl font-black text-monserrat-ink">Ingresar</h2>
                <p className="text-xs font-semibold text-monserrat-ink/55">Admin, docente o alumno.</p>
              </div>
            </div>

            <label className="grid gap-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-monserrat-ink/50">
              Usuario
              <input value={username} onChange={(event) => setUsername(event.target.value)} className="admin-input" autoComplete="username" required />
            </label>
            <label className="grid gap-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-monserrat-ink/50">
              Contrasena
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="admin-input" autoComplete="current-password" required />
            </label>

            <button disabled={isBusy} className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-monserrat-red px-5 py-3 text-sm font-black text-white disabled:opacity-60">
              <ShieldCheck size={16} />
              Entrar
            </button>

            {status && <p className="rounded-[12px] border border-monserrat-red/15 bg-monserrat-red/6 px-4 py-2.5 text-xs font-bold text-monserrat-red">{status}</p>}
          </form>

          <div className="grid gap-4">
            <RoleCard icon={<ShieldCheck size={18} />} title="Admin" text="Accede al panel completo de gestion." />
            <RoleCard icon={<GraduationCap size={18} />} title="Docente" text="Registra asistencia, notas y revisa tus cursos." />
            <RoleCard icon={<UserRound size={18} />} title="Alumno" text="Consulta tus cursos, tus notas y tu estado academico." />
          </div>
        </div>
      </div>
    </main>
  );
}

function RoleCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-[20px] border border-monserrat-ink/10 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-monserrat-cream text-monserrat-ink">
          {icon}
        </div>
        <h3 className="font-serif text-lg font-black text-monserrat-ink">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-6 text-monserrat-ink/65">{text}</p>
    </div>
  );
}

function readSession(key: string): LoginResponse | null {
  const stored = window.localStorage.getItem(key);
  return stored ? (JSON.parse(stored) as LoginResponse) : null;
}

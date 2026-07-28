import { BadgeCheck, BookOpen, CheckCircle2, ClipboardCheck, Clock, Edit3, GraduationCap, LogOut, Plus, Save, School, ShieldCheck, UserCheck, UserRound, UserX, WalletCards, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { monserratApi } from "../../api/monserrat";
import type { AsignacionAcademica, AsistenciaAcademica, LoginResponse, NotaAcademica, PerfilAcademico, UsuarioAcademico, PensionEstado, PensionMensual } from "../../types";
import { SectionHeader } from "../ui/SectionHeader";
import DocentePerfil from "./docente/DocentePerfil";
import DocenteCursos from "./docente/DocenteCursos";
import DocenteAsistencias from "./docente/DocenteAsistencias";
import DocenteNotas from "./docente/DocenteNotas";
import AlumnoPerfil from "./alumno/AlumnoPerfil";
import AlumnoCursos from "./alumno/AlumnoCursos";
import AlumnoAsistencias from "./alumno/AlumnoAsistencias";
import AlumnoNotas from "./alumno/AlumnoNotas";
import AlumnoPensionDetalle from "./alumno/AlumnoPensionDetalle";

type Tab = "perfil" | "cursos" | "asistencia" | "notas" | "pension";

const emptyPerfil: PerfilAcademico = {
  id: 0,
  dni: "",
  nombre: "",
  rol: "",
  telefono: "",
  fotoUrl: "",
  grado: "",
  seccion: "",
  materia: "",
  pensionPagada: false
};

export function PortalAcademicoPage() {
  const [session, setSession] = useState<LoginResponse | null>(() => {
    const stored = window.localStorage.getItem("monserrat_academic_session");
    return stored ? (JSON.parse(stored) as LoginResponse) : null;
  });
  const [perfil, setPerfil] = useState<PerfilAcademico>(emptyPerfil);
  const [asignaciones, setAsignaciones] = useState<AsignacionAcademica[]>([]);
  const [asistencias, setAsistencias] = useState<AsistenciaAcademica[]>([]);
  const [notas, setNotas] = useState<NotaAcademica[]>([]);
  const [tab, setTab] = useState<Tab>("perfil");
  const [status, setStatus] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const token = session?.token ?? "";
  const isDocente = session?.rol === "DOCENTE";
  const isAlumno = session?.rol === "ALUMNO";
  const nivelActual = perfil.nivelEducativo || (isDocente ? "SECUNDARIA" : "PRIMARIA");

  const salonRows = useMemo(() => {
    const grouped = new Map<string, { nivel: string; grado?: string; seccion?: string; alumnos: string[]; cursos: string[] }>();
    asignaciones.forEach((item) => {
      const key = `${item.nivelEducativo ?? ""}-${item.grado ?? ""}-${item.seccion ?? ""}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          nivel: item.nivelEducativo ?? "",
          grado: item.grado,
          seccion: item.seccion,
          alumnos: [],
          cursos: []
        });
      }
      const current = grouped.get(key)!;
      if (item.alumnoDni && !current.alumnos.includes(item.alumnoDni)) {
        current.alumnos.push(item.alumnoDni);
      }
      if (item.curso && !current.cursos.includes(item.curso)) {
        current.cursos.push(item.curso);
      }
    });
    return Array.from(grouped.values()).map((item) => ({
      ...item,
      salon: `${gradoCorto(item.grado ?? "")} ${item.seccion ?? ""}`.trim(),
      nivelLabel: item.nivel ? labelFromEnum(item.nivel) : "Sin nivel"
    }));
  }, [asignaciones]);

  const salonActualDetalle = useMemo(() => {
    // Para docentes: obtener salon real de las asignaciones
    if (isDocente && salonRows.length > 0) {
      const primerSalon = salonRows[0];
      return { titulo: primerSalon.salon || "Sin salon", nivel: primerSalon.nivelLabel };
    }
    // Para alumnos: usar datos del perfil
    const grado = labelFromEnum(perfil.grado ?? "");
    const seccion = perfil.seccion ?? "";
    const titulo = grado || seccion ? `${grado} ${seccion}`.trim() : "Sin salon asignado";
    const nivel = perfil.nivelEducativo ? labelFromEnum(perfil.nivelEducativo) : "Alumno";
    return { titulo, nivel };
  }, [isDocente, perfil.grado, perfil.nivelEducativo, perfil.seccion, salonRows]);

  const ultimaNota = notas[0] ?? null;
  const ultimaAsistencia = asistencias[0] ?? null;

  useEffect(() => {
    if (session?.debeCambiarContrasena) {
      setCurrentPassword(session.username);
      return;
    }

    setCurrentPassword("");
  }, [session?.debeCambiarContrasena, session?.username]);

  const loadPortal = useCallback(async () => {
    if (!token) return;
    const perfilData = await monserratApi.perfilAcademico(token);
    setPerfil(perfilData);

    if (session?.rol === "DOCENTE") {
      const [asignacionesData, asistenciasData, notasData] = await Promise.all([
        monserratApi.asignacionesDocente(token),
        monserratApi.asistenciasDocente(token),
        monserratApi.notasDocente(token)
      ]);
      setAsignaciones(asignacionesData);
      setAsistencias(asistenciasData);
      setNotas(notasData);
    }

    if (session?.rol === "ALUMNO") {
      const [notasData, asignacionesData, asistenciasData] = await Promise.all([
        monserratApi.notasAlumno(token),
        monserratApi.asignacionesAlumno(token),
        monserratApi.asistenciasAlumno(token)
      ]);
      setNotas(notasData);
      setAsignaciones(asignacionesData);
      setAsistencias(asistenciasData);
    }
  }, [session?.rol, token]);

  useEffect(() => {
    void loadPortal().catch((error: unknown) => setStatus(error instanceof Error ? error.message : "No se pudo cargar el portal"));
  }, [loadPortal]);

  // Derived states for qualitative grading in Primaria
  const logout = () => {
    window.localStorage.removeItem("monserrat_academic_session");
    window.localStorage.removeItem("monserrat_admin_session");
    window.location.reload();
  };

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    setIsBusy(true);
    setStatus(null);
    try {
      await monserratApi.cambiarPasswordAcademico(currentPassword, newPassword, token);
      const updated = { ...session, debeCambiarContrasena: false } as LoginResponse;
      window.localStorage.setItem("monserrat_academic_session", JSON.stringify(updated));
      setSession(updated);
      setCurrentPassword("");
      setNewPassword("");
      setStatus("Contrasena actualizada correctamente");
      await loadPortal();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo cambiar la contrasena");
    } finally {
      setIsBusy(false);
    }
  };

  const tabs = [
    { id: "perfil" as const, label: "Perfil", icon: UserRound, visible: true },
    { id: "cursos" as const, label: "Cursos", icon: BookOpen, visible: isDocente || isAlumno },
    { id: "asistencia" as const, label: "Asistencia", icon: ClipboardCheck, visible: isDocente || isAlumno },
    { id: "notas" as const, label: "Notas", icon: GraduationCap, visible: true },
    { id: "pension" as const, label: "Pension", icon: WalletCards, visible: isAlumno }
  ].filter((item) => item.visible);
  const activeTab = tabs.find((item) => item.id === tab) ?? tabs[0];

  if (!session) {
    return null;
  }

  if (session.debeCambiarContrasena) {
    return (
      <PortalShell>
        <form onSubmit={submitPassword} className="mx-auto grid max-w-[460px] gap-4 rounded-[12px] border border-black/12 bg-white p-7">
          <h2 className="font-serif text-xl font-black text-monserrat-ink">Cambio obligatorio de contrasena</h2>
          <p className="text-sm font-semibold text-monserrat-ink/60">Por seguridad, cambia la contrasena inicial antes de continuar.</p>
          <Field label="Contrasena actual"><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="admin-input" required /></Field>
          <Field label="Nueva contrasena"><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="admin-input" required /></Field>
          <button disabled={isBusy} className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-monserrat-ink py-3 text-sm font-black text-white hover:bg-monserrat-ink/85 disabled:opacity-60"><Save size={16} /> Guardar</button>
          {status && <Alert>{status}</Alert>}
          <button type="button" onClick={logout} className="text-xs font-black text-monserrat-ink/50">Cerrar sesion</button>
        </form>
      </PortalShell>
    );
  }

  return (
    <PortalShell>
      <div className="overflow-hidden rounded-[12px] border border-black/12 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/12 bg-[#f6f6f5] px-5 py-4">
          <div className="flex items-center gap-3">
            {perfil.fotoUrl ? <img src={perfil.fotoUrl} alt={perfil.nombre} className="h-12 w-12 rounded-[10px] object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-monserrat-ink text-white"><UserRound size={22} /></div>}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-ink/45">{session.rol}</p>
              <h2 className="font-serif text-xl font-black text-monserrat-ink">{perfil.nombre || session.nombre}</h2>
            </div>
          </div>
          <button onClick={logout} className="inline-flex items-center gap-2 rounded-full border border-black/12 bg-[#e9e9e8] px-4 py-2 text-xs font-bold text-monserrat-ink/65 hover:bg-[#dededc]"><LogOut size={14} /> Cerrar sesion</button>
        </div>

        <div className="grid min-h-[70vh] lg:grid-cols-[236px_minmax(0,1fr)]">
          <aside className="border-b border-black/12 bg-[#f2f2f1] p-3 lg:border-b-0 lg:border-r">
            <div className="grid gap-1.5">
              <p className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">
                Secciones
              </p>
              <nav className="admin-table-scroll flex gap-1 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
                {tabs.map((item) => {
                  const Icon = item.icon;
                  const active = item.id === tab;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id)}
                      className={`flex shrink-0 items-center gap-2 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-bold transition lg:w-full ${
                        active
                          ? "bg-[#e3e3e1] text-monserrat-ink"
                          : "text-monserrat-ink/58 hover:bg-[#e8e8e6] hover:text-monserrat-ink"
                      }`}
                    >
                      <Icon size={15} className={active ? "text-monserrat-ink" : "text-monserrat-ink/45"} />
                      <span className="whitespace-nowrap">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="mt-4 hidden rounded-[10px] border border-black/10 bg-white p-3 lg:block">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">Vista actual</p>
              <p className="mt-1 text-sm font-black text-monserrat-ink">{activeTab.label}</p>
              <p className="mt-1 text-[11px] font-semibold text-monserrat-ink/45">
                {isDocente ? "Portal docente" : "Portal alumno"}
              </p>
            </div>
          </aside>

          <div className="min-w-0 p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">
                  {isDocente ? "Docente" : "Alumno"}
                </p>
                <h3 className="text-[22px] font-black text-monserrat-ink">{activeTab.label}</h3>
              </div>
            </div>

            {status && <Alert>{status}</Alert>}

            {tab === "perfil" && (
              isDocente ? <DocentePerfil token={token} /> : <AlumnoPerfil token={token} />
            )}

            {tab === "cursos" && (
              isDocente ? <DocenteCursos token={token} /> : <AlumnoCursos token={token} />
            )}

            {tab === "asistencia" && (
              isDocente ? <DocenteAsistencias token={token} /> : <AlumnoAsistencias token={token} />
            )}

            {tab === "notas" && (
              isDocente ? <DocenteNotas token={token} /> : <AlumnoNotas token={token} />
            )}

            {tab === "pension" && isAlumno && <AlumnoPensionDetalle token={token} />}
          </div>
        </div>
      </div>
    </PortalShell>
  );
}

function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f6f6f5] px-4 py-10 text-monserrat-ink sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1600px]">
        <a href="/" className="mb-5 inline-flex rounded-full border border-black/12 bg-[#e9e9e8] px-4 py-2 text-xs font-black text-monserrat-ink/65 hover:bg-[#dededc]">Volver al sitio publico</a>

        {children}
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-monserrat-ink/50">{label}{children}</label>;
}

function Alert({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 rounded-[10px] border border-black/12 bg-[#e9e9e8] px-4 py-2.5 text-xs font-bold text-monserrat-ink/70">{children}</p>;
}

function gradoCorto(grado: string) {
  return labelFromEnum(grado.replace(/_PRIMARIA|_SECUNDARIA/gi, ""));
}

function labelFromEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

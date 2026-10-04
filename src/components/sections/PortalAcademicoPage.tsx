import { BadgeCheck, BookOpen, CheckCircle2, ClipboardCheck, Clock, Edit3, GraduationCap, LogOut, Plus, Save, School, ShieldCheck, UserCheck, UserRound, UserX, WalletCards, X } from "lucide-react";
import { MascotaSigue } from "../ui/MascotaSigue";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { monserratApi } from "../../api/monserrat";
import type { AsignacionAcademica, AsistenciaAcademica, LoginResponse, NotaAcademica, PerfilAcademico, UsuarioAcademico, PensionEstado, PensionMensual } from "../../types";
import { SectionHeader } from "../ui/SectionHeader";
import DocentePerfil from "./docente/DocentePerfil";
import DocenteCursos from "./docente/DocenteCursos";
import DocenteNotas from "./docente/DocenteNotas";
import AlumnoPerfil from "./alumno/AlumnoPerfil";
import AlumnoCursos from "./alumno/AlumnoCursos";
import AlumnoAsistencias from "./alumno/AlumnoAsistencias";
import AlumnoNotas from "./alumno/AlumnoNotas";
import AlumnoPensionDetalle from "./alumno/AlumnoPensionDetalle";
import { primerNombre, saludo } from "./alumno/kidTheme";
import { applyAcademicoConfigToRegistry, type AcademicoConfig } from "./admin/adminShared";
import { useAcademicoRegistry } from "./admin/academicoRegistry";

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
  // Refresca los nombres de grados y salones cuando cambia la configuración (registro académico).
  useAcademicoRegistry();
  useEffect(() => {
    if (!token) return;
    monserratApi
      .academicoConfiguracion<AcademicoConfig>(token)
      .then((config) => applyAcademicoConfigToRegistry(config))
      .catch(() => undefined); // si falla se usan los nombres por defecto
  }, [token]);
  const isDocente = session?.rol === "DOCENTE";
  const isAlumno = session?.rol === "ALUMNO";
  const kid = isAlumno || isDocente; // mismo estilo amigable para alumno y docente
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
      setStatus("Contraseña actualizada correctamente");
      await loadPortal();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo cambiar la contraseña");
    } finally {
      setIsBusy(false);
    }
  };

  const tabs = [
    { id: "perfil" as const, label: "Perfil", icon: UserRound, visible: true },
    { id: "cursos" as const, label: "Cursos", icon: BookOpen, visible: isDocente || isAlumno },
    { id: "asistencia" as const, label: "Asistencia", icon: ClipboardCheck, visible: isAlumno },
    { id: "notas" as const, label: "Notas", icon: GraduationCap, visible: true },
    { id: "pension" as const, label: "Pagos", icon: WalletCards, visible: isAlumno }
  ].filter((item) => item.visible);
  const activeTab = tabs.find((item) => item.id === tab) ?? tabs[0];

  if (!session) {
    return null;
  }

  if (session.debeCambiarContrasena) {
    return (
      <PortalShell kid={kid} pro={!kid}>
        <form onSubmit={submitPassword} className={kid
          ? "kid-card kid-rise mx-auto grid max-w-[480px] gap-4 p-8"
          : "pro-card pro-rise mx-auto grid max-w-[460px] gap-4 p-7"}>
          {kid && <MascotaSigue className="kid-bob mx-auto h-28 w-auto" />}
          <h2 className="font-serif text-xl font-black text-monserrat-ink">Cambio obligatorio de contraseña</h2>
          <p className="text-sm font-semibold text-monserrat-ink/60">Por seguridad, cambia la contraseña inicial antes de continuar.</p>
          <Field label="Contraseña actual"><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="admin-input" required /></Field>
          <Field label="Nueva contraseña"><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="admin-input" required /></Field>
          <button disabled={isBusy} className={kid ? "kid-btn" : "pro-btn"}><Save size={16} /> Guardar</button>
          {status && <Alert>{status}</Alert>}
          <button type="button" onClick={logout} className="text-xs font-black text-monserrat-ink/50">Cerrar sesión</button>
        </form>
      </PortalShell>
    );
  }

  return (
    <PortalShell kid={kid} pro={!kid}>
      <div className={kid
        ? "kid-card overflow-hidden !rounded-[32px]"
        : "pro-card pro-rise overflow-hidden"}>
        {kid ? (
          <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-monserrat-gold/30 bg-[linear-gradient(120deg,#fff7e3_0%,#fdecc4_100%)] px-6 py-4">
            <div className="flex items-center gap-4">
              <MascotaSigue className="kid-bob h-20 w-auto" />
              <div className="kid-rise">
                <p className="text-[13px] font-black uppercase tracking-[0.12em] text-monserrat-red">{isDocente ? "Portal del docente" : "Portal del alumno"}</p>
                <h2 className="text-[26px] font-black leading-tight text-monserrat-ink sm:text-[30px]">
                  {saludo()}, {(perfil.nombres ? primerNombre(perfil.nombre || session.nombre, perfil.nombres) : "") || (isDocente ? "profe" : "estudiante")}!
                </h2>
                <p className="text-sm font-semibold text-monserrat-ink/60">{isDocente ? "¿Qué quieres gestionar hoy?" : "¿Qué quieres ver hoy?"}</p>
              </div>
            </div>
            <button onClick={logout} className="kid-btn-soft"><LogOut size={16} /> Cerrar sesión</button>
          </div>
        ) : (
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-monserrat-gold/30 bg-[linear-gradient(120deg,#fffaf0_0%,#f9eecf_100%)] px-5 py-4">
          <div className="flex items-center gap-3">
            {perfil.fotoUrl ? <img src={perfil.fotoUrl} alt={perfil.nombre} className="h-12 w-12 rounded-[14px] border border-monserrat-gold/40 object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-monserrat-red text-white shadow-[0_6px_14px_rgba(159,23,27,0.25)]"><UserRound size={22} /></div>}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-red">Portal docente</p>
              <h2 className="text-xl font-black text-monserrat-ink">{perfil.nombre || session.nombre}</h2>
            </div>
          </div>
          <button onClick={logout} className="pro-btn-soft"><LogOut size={15} /> Cerrar sesión</button>
        </div>
        )}

        <div className={`grid min-h-[70vh] ${kid ? "lg:grid-cols-[260px_minmax(0,1fr)]" : "lg:grid-cols-[236px_minmax(0,1fr)]"}`}>
          <aside className={kid ? "border-b-2 border-monserrat-gold/25 bg-[#fff9ec] p-3 lg:border-b-0 lg:border-r-2" : "border-b border-monserrat-gold/25 bg-[#fbf4e4] p-3 lg:border-b-0 lg:border-r"}>
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
                      className={kid
                        ? `flex min-h-[52px] shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] font-black transition lg:w-full ${
                            active
                              ? "bg-monserrat-red text-white shadow-[0_8px_20px_rgba(159,23,27,0.25)]"
                              : "bg-white/70 text-monserrat-ink/70 hover:bg-white hover:text-monserrat-red"
                          }`
                        : `flex min-h-[42px] shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-bold transition lg:w-full ${
                            active
                              ? "pro-nav-active"
                              : "text-monserrat-ink/70 hover:bg-[#f4ead2] hover:text-monserrat-ink"
                          }`}
                    >
                      <Icon size={kid ? 22 : 16} className={kid ? (active ? "text-white" : "text-monserrat-red") : active ? "text-white" : "text-monserrat-red/70"} />
                      <span className="whitespace-nowrap">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className={`mt-4 hidden rounded-xl border border-monserrat-gold/30 bg-white p-3 ${kid ? "" : "lg:block"}`}>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">Vista actual</p>
              <p className="mt-1 text-sm font-black text-monserrat-ink">{activeTab.label}</p>
              <p className="mt-1 text-[11px] font-semibold text-monserrat-ink/45">
                {isDocente ? "Portal docente" : "Portal alumno"}
              </p>
            </div>
          </aside>

          <div className={`min-w-0 p-5 ${kid ? "bg-[#fffdf8] sm:p-7" : "bg-[#fffdf8]"}`}>
            <div className={`mb-5 flex items-center justify-between gap-3 ${kid ? "hidden" : ""}`}>
              <div>
                {!kid && (
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">Docente</p>
                )}
                <h3 className={kid ? "text-[28px] font-black text-monserrat-ink" : "text-[22px] font-black text-monserrat-ink"}>{activeTab.label}</h3>
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
              <AlumnoAsistencias token={token} />
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

function PortalShell({ children, kid = false, pro = false }: { children: React.ReactNode; kid?: boolean; pro?: boolean }) {
  return (
    <main className={`relative min-h-screen overflow-hidden px-4 py-10 text-monserrat-ink sm:px-6 lg:px-10 ${kid ? "kid-page" : pro ? "pro-page" : "bg-[#eef1f4]"}`}>
      {(kid || pro) && (
        <>
          <div className="pointer-events-none absolute left-[-8%] top-[-10%] h-72 w-72 rounded-full bg-monserrat-gold/25 blur-3xl" />
          <div className="pointer-events-none absolute bottom-[-8%] right-[-8%] h-80 w-80 rounded-full bg-monserrat-red/10 blur-3xl" />
        </>
      )}
      <div className="relative mx-auto max-w-[1600px]">
        <a href="/" className={kid
          ? "kid-btn-soft mb-5"
          : pro
            ? "pro-btn-soft mb-5"
            : "mb-5 inline-flex rounded-full border border-[#dde1e6] bg-white px-4 py-2 text-xs font-black text-monserrat-ink/65 shadow-sm hover:bg-[#f2f4f6]"}>Volver al sitio público</a>

        {children}
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-monserrat-ink/50">{label}{children}</label>;
}

function Alert({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 rounded-xl border border-monserrat-gold/35 bg-[#fbf4e4] px-4 py-2.5 text-xs font-bold text-monserrat-ink/75">{children}</p>;
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
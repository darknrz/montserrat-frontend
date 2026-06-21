import { BadgeCheck, BookOpen, CheckCircle2, ClipboardCheck, GraduationCap, LogOut, Save, School, ShieldCheck, UserRound, WalletCards } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { monserratApi } from "../../api/monserrat";
import type { AsignacionAcademica, AsistenciaAcademica, LoginResponse, NotaAcademica, PensionEstado, PerfilAcademico, UsuarioAcademico } from "../../types";
import { SectionHeader } from "../ui/SectionHeader";

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
  const [alumnos, setAlumnos] = useState<UsuarioAcademico[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionAcademica[]>([]);
  const [asistencias, setAsistencias] = useState<AsistenciaAcademica[]>([]);
  const [notas, setNotas] = useState<NotaAcademica[]>([]);
  const [pension, setPension] = useState<PensionEstado | null>(null);
  const [tab, setTab] = useState<Tab>("perfil");
  const [status, setStatus] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [asistenciaForm, setAsistenciaForm] = useState({ alumnoDni: "", fecha: new Date().toISOString().slice(0, 10), estado: "PRESENTE", observacion: "" });
  const [notaForm, setNotaForm] = useState({ id: 0, alumnoDni: "", curso: "", periodo: "", tipoEvaluacion: "EXAMEN", valor: 0, observacion: "" });

  const token = session?.token ?? "";
  const isDocente = session?.rol === "DOCENTE";
  const isAlumno = session?.rol === "ALUMNO";
  const nivelActual = perfil.nivelEducativo || (isDocente ? "SECUNDARIA" : "PRIMARIA");

  const cursosDisponibles = useMemo(() => {
    return asignaciones.reduce<string[]>((items, asignacion) => {
      if (!items.includes(asignacion.curso)) {
        items.push(asignacion.curso);
      }
      return items;
    }, []);
  }, [asignaciones]);

  const salonActualDetalle = useMemo(() => {
    const grado = labelFromEnum(perfil.grado ?? "");
    const seccion = perfil.seccion ?? "";
    const titulo = grado || seccion ? `${grado} ${seccion}`.trim() : "Sin salon asignado";
    const nivel = perfil.nivelEducativo ? labelFromEnum(perfil.nivelEducativo) : (isDocente ? "Docente" : "Alumno");
    return { titulo, nivel };
  }, [isDocente, perfil.grado, perfil.nivelEducativo, perfil.seccion]);

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
      if (item.alumnoNombre && !current.alumnos.includes(item.alumnoNombre)) current.alumnos.push(item.alumnoNombre);
      if (item.curso && !current.cursos.includes(item.curso)) current.cursos.push(item.curso);
    });
    return Array.from(grouped.values()).map((item) => ({
      ...item,
      salon: `${labelFromEnum(item.grado ?? "")} ${item.seccion ?? ""}`.trim(),
      nivelLabel: item.nivel ? labelFromEnum(item.nivel) : "Sin nivel"
    }));
  }, [asignaciones]);

  const cursosDelAlumno = useMemo(() => {
    const unique = new Map<string, string>();
    asignaciones.forEach((item) => {
      if (!unique.has(item.curso)) unique.set(item.curso, item.docenteNombre);
    });
    return Array.from(unique.entries()).map(([curso, docente]) => ({ curso, docente }));
  }, [asignaciones]);

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
      const [alumnosData, asignacionesData, asistenciasData, notasData] = await Promise.all([
        monserratApi.alumnosDocenteAcademicos(token),
        monserratApi.asignacionesDocente(token),
        monserratApi.asistenciasDocente(token),
        monserratApi.notasDocente(token)
      ]);
      setAlumnos(alumnosData);
      setAsignaciones(asignacionesData);
      setAsistencias(asistenciasData);
      setNotas(notasData);
      setAsistenciaForm((current) => ({ ...current, alumnoDni: current.alumnoDni || alumnosData[0]?.dni || "" }));
      setNotaForm((current) => ({ ...current, alumnoDni: current.alumnoDni || alumnosData[0]?.dni || "", curso: current.curso || asignacionesData[0]?.curso || "" }));
    }

    if (session?.rol === "ALUMNO") {
      const [notasData, pensionData, asignacionesData] = await Promise.all([
        monserratApi.notasAlumno(token),
        monserratApi.pensionAlumno(token),
        monserratApi.asignacionesAlumno(token)
      ]);
      setNotas(notasData);
      setPension(pensionData);
      setAsignaciones(asignacionesData);
    }
  }, [session?.rol, token]);

  useEffect(() => {
    void loadPortal().catch((error: unknown) => setStatus(error instanceof Error ? error.message : "No se pudo cargar el portal"));
  }, [loadPortal]);

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

  const submitPerfil = async (event: FormEvent) => {
    event.preventDefault();
    setIsBusy(true);
    setStatus(null);
    try {
      const updated = await monserratApi.updatePerfilAcademico(perfil, token);
      setPerfil(updated);
      setStatus("Perfil actualizado");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo actualizar el perfil");
    } finally {
      setIsBusy(false);
    }
  };

  const submitAsistencia = async (event: FormEvent) => {
    event.preventDefault();
    setIsBusy(true);
    setStatus(null);
    try {
      await monserratApi.createAsistencia(asistenciaForm, token);
      setAsistenciaForm((current) => ({ ...current, observacion: "" }));
      await loadPortal();
      setStatus("Asistencia registrada");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo registrar la asistencia");
    } finally {
      setIsBusy(false);
    }
  };

  const submitNota = async (event: FormEvent) => {
    event.preventDefault();
    setIsBusy(true);
    setStatus(null);
    try {
      const payload = { alumnoDni: notaForm.alumnoDni, curso: notaForm.curso, periodo: notaForm.periodo, tipoEvaluacion: notaForm.tipoEvaluacion, valor: Number(notaForm.valor), observacion: notaForm.observacion };
      if (notaForm.id) await monserratApi.updateNota(notaForm.id, payload, token);
      else await monserratApi.createNota(payload, token);
      setNotaForm({ id: 0, alumnoDni: "", curso: asignaciones[0]?.curso ?? "", periodo: "", tipoEvaluacion: "EXAMEN", valor: 0, observacion: "" });
      await loadPortal();
      setStatus("Nota guardada");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo guardar la nota");
    } finally {
      setIsBusy(false);
    }
  };

  const tabs = [
    { id: "perfil" as const, label: "Perfil", visible: true },
    { id: "cursos" as const, label: "Cursos", visible: isDocente || isAlumno },
    { id: "asistencia" as const, label: "Asistencia", visible: isDocente },
    { id: "notas" as const, label: "Notas", visible: true },
    { id: "pension" as const, label: "Pension", visible: isAlumno }
  ].filter((item) => item.visible);

  if (!session) {
    return null;
  }

  if (session.debeCambiarContrasena) {
    return (
      <PortalShell>
        <form onSubmit={submitPassword} className="mx-auto grid max-w-[460px] gap-4 rounded-[20px] border border-monserrat-ink/10 bg-white p-7 shadow-sm">
          <h2 className="font-serif text-xl font-black text-monserrat-ink">Cambio obligatorio de contrasena</h2>
          <p className="text-sm font-semibold text-monserrat-ink/60">Por seguridad, cambia la contrasena inicial antes de continuar.</p>
          <Field label="Contrasena actual"><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="admin-input" required /></Field>
          <Field label="Nueva contrasena"><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="admin-input" required /></Field>
          <button disabled={isBusy} className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-monserrat-red py-3 text-sm font-black text-white disabled:opacity-60"><Save size={16} /> Guardar</button>
          {status && <Alert>{status}</Alert>}
          <button type="button" onClick={logout} className="text-xs font-black text-monserrat-ink/50">Cerrar sesion</button>
        </form>
      </PortalShell>
    );
  }

  return (
    <PortalShell>
      <div className="overflow-hidden rounded-[22px] border border-monserrat-ink/10 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-monserrat-ink/8 px-5 py-4">
          <div className="flex items-center gap-3">
            {perfil.fotoUrl ? <img src={perfil.fotoUrl} alt={perfil.nombre} className="h-12 w-12 rounded-[12px] object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-monserrat-red text-white"><UserRound size={22} /></div>}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-red">{session.rol}</p>
              <h2 className="font-serif text-xl font-black text-monserrat-ink">{perfil.nombre || session.nombre}</h2>
            </div>
          </div>
          <button onClick={logout} className="inline-flex items-center gap-2 rounded-full border border-monserrat-ink/12 px-4 py-2 text-xs font-bold text-monserrat-ink/60"><LogOut size={14} /> Cerrar sesion</button>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-monserrat-ink/8 bg-monserrat-cream/40 px-5 py-3">
          {tabs.map((item) => (
            <button key={item.id} onClick={() => setTab(item.id)} className={`rounded-full px-4 py-2 text-xs font-black ${tab === item.id ? "bg-monserrat-red text-white" : "text-monserrat-ink/60 hover:bg-white"}`}>
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {status && <Alert>{status}</Alert>}

          <div className="mb-5 grid gap-3 rounded-[18px] border border-monserrat-ink/8 bg-monserrat-cream/35 p-4 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
            <div className="rounded-[14px] bg-white px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">Mi salon</p>
              <p className="mt-1 text-lg font-black text-monserrat-ink">{salonActualDetalle.titulo}</p>
              <p className="text-[11px] font-semibold text-monserrat-ink/50">{salonActualDetalle.nivel}</p>
            </div>
            <div className="rounded-[14px] bg-white px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">Nivel</p>
              <p className="mt-1 text-lg font-black text-monserrat-ink">{labelFromEnum(nivelActual)}</p>
              <p className="text-[11px] font-semibold text-monserrat-ink/50">{isDocente ? "Docente" : "Alumno"}</p>
            </div>
            <div className="rounded-[14px] bg-white px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">Ultima nota</p>
              <p className="mt-1 text-lg font-black text-monserrat-ink">{ultimaNota ? `${labelFromEnum(ultimaNota.curso)} ${ultimaNota.valor}` : "Sin notas"}</p>
              <p className="text-[11px] font-semibold text-monserrat-ink/50">{ultimaNota?.docenteNombre ?? ""}</p>
            </div>
            <div className="rounded-[14px] bg-white px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">Ultima asistencia</p>
              <p className="mt-1 text-lg font-black text-monserrat-ink">{ultimaAsistencia ? labelFromEnum(ultimaAsistencia.estado) : "Sin registro"}</p>
              <p className="text-[11px] font-semibold text-monserrat-ink/50">{ultimaAsistencia?.fecha ?? ""}</p>
            </div>
          </div>

          {tab === "perfil" && (
            <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
              <div className="grid content-start gap-4 rounded-[18px] border border-monserrat-ink/8 bg-monserrat-cream/35 p-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-ink/45">Ficha rapida</p>
                  <h3 className="mt-1 font-serif text-2xl font-black text-monserrat-ink">{perfil.nombre || session.nombre}</h3>
                  <p className="mt-1 text-sm font-semibold text-monserrat-ink/55">{isDocente ? "Docente" : "Alumno"} · {labelFromEnum(nivelActual)}</p>
                </div>
                <div className="grid gap-3">
                  <SummaryItem label="Salon" value={salonActualDetalle.titulo} />
                  <SummaryItem label="Telefono" value={perfil.telefono || "No registrado"} />
                  <SummaryItem label="Asignaciones" value={String(asignaciones.length)} />
                </div>
              </div>

              <form onSubmit={submitPerfil} className="grid gap-4 rounded-[18px] border border-monserrat-ink/8 bg-white p-5 shadow-sm md:grid-cols-2">
                <Field label="Nombre"><input value={perfil.nombre ?? ""} onChange={(event) => setPerfil({ ...perfil, nombre: event.target.value })} className="admin-input" required /></Field>
                <Field label="Telefono"><input value={perfil.telefono ?? ""} onChange={(event) => setPerfil({ ...perfil, telefono: event.target.value })} className="admin-input" /></Field>
                <Field label="Foto URL"><input value={perfil.fotoUrl ?? ""} onChange={(event) => setPerfil({ ...perfil, fotoUrl: event.target.value })} className="admin-input" /></Field>
                {isDocente && <Field label="Materia"><input value={perfil.materia ?? ""} onChange={(event) => setPerfil({ ...perfil, materia: event.target.value })} className="admin-input" /></Field>}
                {isAlumno && <Field label="Grado"><input value={perfil.grado ?? ""} onChange={(event) => setPerfil({ ...perfil, grado: event.target.value })} className="admin-input" /></Field>}
                {isAlumno && <Field label="Seccion"><input value={perfil.seccion ?? ""} onChange={(event) => setPerfil({ ...perfil, seccion: event.target.value })} className="admin-input" /></Field>}
                <div className="md:col-span-2 flex flex-wrap gap-3">
                  <button disabled={isBusy} className="inline-flex items-center gap-2 rounded-[12px] bg-monserrat-red px-5 py-2.5 text-sm font-black text-white disabled:opacity-60"><Save size={16} /> Guardar perfil</button>
                </div>
              </form>
            </div>
          )}

          {tab === "cursos" && (
            <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
              <div className="grid gap-4">
                {isDocente ? (
                  <SimpleTable
                    title="Salones que atiendo"
                    headers={["Salon", "Nivel", "Alumnos", "Cursos"]}
                    rows={salonRows.map((item) => [item.salon || "Sin salon", item.nivelLabel, String(item.alumnos.length), String(item.cursos.length)])}
                  />
                ) : (
                  <SimpleTable
                    title="Mis cursos"
                    headers={["Curso", "Docente"]}
                    rows={cursosDelAlumno.map((item) => [labelFromEnum(item.curso), item.docente])}
                  />
                )}
              </div>
              <div className="grid gap-4 rounded-[16px] border border-monserrat-ink/8 bg-monserrat-cream/35 p-5">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-monserrat-ink/50">{isDocente ? "Resumen docente" : "Resumen alumno"}</p>
                <div className="grid gap-3">
                  <SummaryItem label={isDocente ? "Alumnos" : "Cursos"} value={String(isDocente ? alumnos.length : cursosDelAlumno.length)} />
                  <SummaryItem label="Nivel" value={labelFromEnum(nivelActual)} />
                  <SummaryItem label="Salon" value={salonActualDetalle.titulo} />
                  {isAlumno && <SummaryItem label="Pagos" value={pension?.pagada ? "Al dia" : "Pendiente"} />}
                </div>
              </div>
            </div>
          )}

          {tab === "asistencia" && isDocente && (
            <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
              <form onSubmit={submitAsistencia} className="grid content-start gap-3 rounded-[16px] border border-monserrat-ink/8 bg-monserrat-cream/35 p-4">
                <h3 className="font-serif text-lg font-black text-monserrat-ink">Registrar asistencia</h3>
                <Field label="Alumno">
                  <select value={asistenciaForm.alumnoDni} onChange={(event) => setAsistenciaForm({ ...asistenciaForm, alumnoDni: event.target.value })} className="admin-input" required>
                    <option value="">Selecciona</option>
                    {alumnos.map((alumno) => <option key={alumno.dni} value={alumno.dni}>{alumno.nombre}</option>)}
                  </select>
                </Field>
                <Field label="Fecha"><input type="date" value={asistenciaForm.fecha} onChange={(event) => setAsistenciaForm({ ...asistenciaForm, fecha: event.target.value })} className="admin-input" required /></Field>
                <Field label="Estado"><select value={asistenciaForm.estado} onChange={(event) => setAsistenciaForm({ ...asistenciaForm, estado: event.target.value })} className="admin-input"><option value="PRESENTE">Presente</option><option value="AUSENTE">Ausente</option><option value="TARDANZA">Tardanza</option><option value="JUSTIFICADO">Justificado</option></select></Field>
                <Field label="Observacion"><textarea value={asistenciaForm.observacion} onChange={(event) => setAsistenciaForm({ ...asistenciaForm, observacion: event.target.value })} className="admin-input" /></Field>
                <button disabled={isBusy} className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-monserrat-red py-2.5 text-sm font-black text-white"><ClipboardCheck size={16} /> Guardar</button>
              </form>
              <SimpleTable title="Ultimas asistencias" headers={["Fecha", "Alumno", "Estado"]} rows={asistencias.map((item) => [item.fecha, item.alumnoNombre, labelFromEnum(item.estado)])} />
            </div>
          )}

          {tab === "notas" && (
            <div className={isDocente ? "grid gap-5 lg:grid-cols-[320px_1fr]" : "grid gap-5"}>
              {isDocente && (
                <form onSubmit={submitNota} className="grid content-start gap-3 rounded-[16px] border border-monserrat-ink/8 bg-monserrat-cream/35 p-4">
                  <h3 className="font-serif text-lg font-black text-monserrat-ink">{notaForm.id ? "Editar nota" : "Registrar nota"}</h3>
                  <Field label="Alumno">
                    <select value={notaForm.alumnoDni} onChange={(event) => setNotaForm({ ...notaForm, alumnoDni: event.target.value })} className="admin-input" required>
                      <option value="">Selecciona</option>
                      {alumnos.map((alumno) => <option key={alumno.dni} value={alumno.dni}>{alumno.nombre}</option>)}
                    </select>
                  </Field>
                  <Field label="Curso">
                    {cursosDisponibles.length > 0 ? (
                      <select value={notaForm.curso} onChange={(event) => setNotaForm({ ...notaForm, curso: event.target.value })} className="admin-input" required>
                        <option value="">Selecciona</option>
                        {cursosDisponibles.map((curso) => <option key={curso} value={curso}>{curso}</option>)}
                      </select>
                    ) : (
                      <input value={notaForm.curso} onChange={(event) => setNotaForm({ ...notaForm, curso: event.target.value })} className="admin-input" required />
                    )}
                  </Field>
                  <Field label="Tipo de evaluacion">
                    <select value={notaForm.tipoEvaluacion} onChange={(event) => setNotaForm({ ...notaForm, tipoEvaluacion: event.target.value })} className="admin-input" required>
                      <option value="EXAMEN">Examen</option>
                      <option value="PRACTICA">Practica</option>
                      <option value="TAREA">Tarea</option>
                      <option value="PARTICIPACION">Participacion</option>
                      <option value="PROYECTO">Proyecto</option>
                    </select>
                  </Field>
                  <Field label="Periodo"><input value={notaForm.periodo} onChange={(event) => setNotaForm({ ...notaForm, periodo: event.target.value })} className="admin-input" required /></Field>
                  <Field label="Nota"><input type="number" min="0" max="20" step="0.1" value={notaForm.valor} onChange={(event) => setNotaForm({ ...notaForm, valor: Number(event.target.value) })} className="admin-input" required /></Field>
                  <Field label="Observacion"><textarea value={notaForm.observacion} onChange={(event) => setNotaForm({ ...notaForm, observacion: event.target.value })} className="admin-input" /></Field>
                  <button disabled={isBusy} className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-monserrat-red py-2.5 text-sm font-black text-white"><GraduationCap size={16} /> Guardar</button>
                </form>
              )}
              <SimpleTable
                title={isDocente ? "Notas registradas" : "Mis notas"}
                headers={isDocente ? ["Alumno", "Curso", "Tipo", "Nota"] : ["Curso", "Tipo", "Nota", "Docente"]}
                rows={notas.map((nota) => isDocente ? [nota.alumnoNombre, labelFromEnum(nota.curso), labelFromEnum(nota.tipoEvaluacion ?? ""), String(nota.valor)] : [labelFromEnum(nota.curso), labelFromEnum(nota.tipoEvaluacion ?? ""), String(nota.valor), nota.docenteNombre])}
                onRowClick={isDocente ? (index) => {
                  const nota = notas[index];
                  setNotaForm({ id: nota.id, alumnoDni: nota.alumnoDni, curso: nota.curso, periodo: nota.periodo, tipoEvaluacion: nota.tipoEvaluacion ?? "EXAMEN", valor: nota.valor, observacion: nota.observacion ?? "" });
                } : undefined}
              />
            </div>
          )}

          {tab === "pension" && isAlumno && (
            <div className="grid max-w-xl gap-4 rounded-[16px] border border-monserrat-ink/8 bg-monserrat-cream/35 p-5">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-[12px] ${pension?.pagada ? "bg-emerald-600" : "bg-monserrat-red"} text-white`}>
                  {pension?.pagada ? <CheckCircle2 size={22} /> : <WalletCards size={22} />}
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-monserrat-ink/50">Estado de pension</p>
                  <h3 className="font-serif text-2xl font-black text-monserrat-ink">{pension?.pagada ? "Pagado" : "Pendiente"}</h3>
                </div>
              </div>
              {pension?.observacion && <p className="rounded-[12px] bg-white px-4 py-3 text-sm font-semibold text-monserrat-ink/65">{pension.observacion}</p>}
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  );
}

function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-monserrat-cream px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <a href="/" className="inline-flex rounded-full border border-monserrat-ink/12 bg-white px-4 py-2 text-xs font-black text-monserrat-ink/65">Volver al sitio publico</a>
        <SectionHeader eyebrow="Montserrat" title="Sistema academico" description="Acceso para docentes y alumnos." />
        {children}
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-monserrat-ink/50">{label}{children}</label>;
}

function Alert({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 rounded-[12px] border border-monserrat-red/15 bg-monserrat-red/6 px-4 py-2.5 text-xs font-bold text-monserrat-red">{children}</p>;
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-white px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">{label}</p>
      <p className="mt-1 text-lg font-black text-monserrat-ink">{value}</p>
    </div>
  );
}

function labelFromEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function SimpleTable({ title, headers, rows, onRowClick }: { title?: string; headers: string[]; rows: string[][]; onRowClick?: (index: number) => void }) {
  return (
    <div className="overflow-hidden rounded-[16px] border border-monserrat-ink/8">
      {title && <div className="border-b border-monserrat-ink/8 bg-monserrat-cream/40 px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-monserrat-ink/50">{title}</div>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-[12.5px]">
          <thead className="bg-monserrat-ink text-monserrat-cream">
            <tr>{headers.map((header) => <th key={header} className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-monserrat-cream/70">{header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={headers.length} className="py-10 text-center text-sm font-semibold text-monserrat-ink/40">Sin registros</td></tr> : rows.map((row, index) => (
              <tr key={index} onClick={() => onRowClick?.(index)} className={`border-t border-monserrat-ink/6 ${onRowClick ? "cursor-pointer hover:bg-monserrat-cream/35" : ""}`}>
                {row.map((value, cellIndex) => <td key={cellIndex} className="px-4 py-3 font-semibold text-monserrat-ink/75">{value}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}






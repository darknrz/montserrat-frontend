import { CheckCircle2, Pencil, Plus, Trash2, X, XCircle } from "lucide-react";
import { useAnioActivo } from "../../../hooks/useAnioActivo";
import { useEffect, useMemo, useState } from "react";
import { monserratApi } from "../../../api/monserrat";
import type { Taller, TallerCatalogo, UsuarioAcademico } from "../../../types";
import { GRADOS_PRIMARIA, GRADOS_SECUNDARIA, SALONES, formatGrado, formatSalon } from "./adminShared";

type TalleresTabProps = {
  usuariosAcademicos: UsuarioAcademico[];
  token: string;
  setErrorMessage: (msg: string | null) => void;
  labelAcademico: (id: string) => string;
};

// Destinos a los que se puede aplicar un taller: salones (CICLADO I, ...) o grados completos.
const tokenSalon = (salon: string) => `SALON:${salon}`;
const tokenGrado = (grado: string) => `GRADO:${grado}`;
const ALL_GRADOS: string[] = [...GRADOS_PRIMARIA, ...GRADOS_SECUNDARIA];
const nivelDe = (a: UsuarioAcademico) => (a.grado === "INICIAL" ? "INICIAL" : a.nivelEducativo ?? "");

const clampMonto = (raw: string) => {
  if (raw === "") return "";
  const n = Number(raw);
  return Number.isFinite(n) && n < 0 ? "0" : raw;
};
const bloquearNegativos = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "-" || e.key === "e" || e.key === "E") e.preventDefault();
};

export function TalleresTab({ usuariosAcademicos, token, setErrorMessage }: TalleresTabProps) {
  const [catalogo, setCatalogo] = useState<TallerCatalogo[]>([]);
  const [registros, setRegistros] = useState<Taller[]>([]);
  const anioActivo = useAnioActivo(token);
  const [anio, setAnio] = useState(anioActivo);
  const [search, setSearch] = useState("");
  const [nivelFiltro, setNivelFiltro] = useState("");
  const [gradoFiltro, setGradoFiltro] = useState("");
  const [salonFiltro, setSalonFiltro] = useState("");
  const [borradores, setBorradores] = useState<Record<string, string>>({});

  // Formulario crear / editar taller
  const [formAbierto, setFormAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [monto, setMonto] = useState("");
  const [destinos, setDestinos] = useState<string[]>([]);

  const alumnos = useMemo(() => usuariosAcademicos.filter((u) => u.rol === "ALUMNO"), [usuariosAcademicos]);

  const CURRENT_YEAR = anioActivo;
  useEffect(() => setAnio(anioActivo), [anioActivo]);
  const START_YEAR = 2021;
  const YEARS = Array.from({ length: CURRENT_YEAR - START_YEAR + 2 }, (_, i) => String(CURRENT_YEAR + 1 - i));

  const cargar = () => {
    if (!token) return;
    Promise.all([monserratApi.talleresCatalogo(anio, token), monserratApi.talleresAcademicos(anio, token)])
      .then(([cat, regs]) => {
        setCatalogo(cat);
        setRegistros(regs);
        setBorradores({});
      })
      .catch((error: unknown) =>
        setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar los talleres")
      );
  };

  useEffect(cargar, [anio, token]);

  const registroPor = useMemo(() => {
    const map = new Map<string, Taller>();
    registros.forEach((r) => {
      if (r.catalogoId != null) map.set(`${r.alumnoDni}|${r.catalogoId}`, r);
    });
    return map;
  }, [registros]);

  const aplicaA = (taller: TallerCatalogo, alumno: UsuarioAcademico) => {
    if (registroPor.has(`${alumno.dni}|${taller.id}`)) return true;
    const salon = formatSalon(alumno.grado, alumno.seccion);
    if (salon && taller.aplicaA.includes(tokenSalon(salon))) return true;
    return Boolean(alumno.grado && taller.aplicaA.includes(tokenGrado(alumno.grado)));
  };

  const filas = useMemo(() => {
    const term = search.trim().toLowerCase();
    return alumnos.filter((a) => {
      if (
        term &&
        ![a.codigo, a.dni, a.nombre, a.grado, a.seccion].filter(Boolean).some((v) => String(v).toLowerCase().includes(term))
      ) {
        return false;
      }
      if (nivelFiltro && nivelDe(a) !== nivelFiltro) return false;
      if (gradoFiltro && a.grado !== gradoFiltro) return false;
      if (salonFiltro && formatSalon(a.grado, a.seccion) !== salonFiltro) return false;
      return true;
    });
  }, [alumnos, search, nivelFiltro, gradoFiltro, salonFiltro]);

  const gradosOpciones = ALL_GRADOS.filter((g) => {
    if (!nivelFiltro) return true;
    if (nivelFiltro === "INICIAL") return g === "INICIAL";
    if (nivelFiltro === "PRIMARIA") return g.endsWith("_PRIMARIA");
    return g.endsWith("_SECUNDARIA");
  });

  // Totales sobre lo visible
  const resumen = useMemo(() => {
    let total = 0;
    let pagados = 0;
    filas.forEach((a) =>
      catalogo.forEach((t) => {
        if (!aplicaA(t, a)) return;
        total += 1;
        if (registroPor.get(`${a.dni}|${t.id}`)?.pagada) pagados += 1;
      })
    );
    return { total, pagados };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filas, catalogo, registroPor]);

  // ---- Catalogo ----
  const resetForm = () => {
    setFormAbierto(false);
    setEditandoId(null);
    setNombre("");
    setMonto("");
    setDestinos([]);
  };

  const editar = (t: TallerCatalogo) => {
    setEditandoId(t.id);
    setNombre(t.nombre);
    setMonto(String(t.monto));
    setDestinos(t.aplicaA);
    setFormAbierto(true);
  };

  const toggleDestino = (token: string) =>
    setDestinos((cur) => (cur.includes(token) ? cur.filter((d) => d !== token) : [...cur, token]));

  const guardarTaller = async () => {
    const montoNum = Number(monto);
    if (!nombre.trim() || monto === "" || !Number.isFinite(montoNum) || montoNum < 0) {
      setErrorMessage("Ingresa un nombre de taller y un monto valido (no negativo)");
      return;
    }
    const data = { anio, nombre: nombre.trim(), monto: montoNum, aplicaA: destinos };
    try {
      if (editandoId != null) {
        await monserratApi.updateTallerCatalogo(editandoId, data, token);
      } else {
        await monserratApi.createTallerCatalogo(data, token);
      }
      resetForm();
      cargar();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar el taller");
    }
  };

  const eliminarTaller = async (t: TallerCatalogo) => {
    if (!window.confirm(`Eliminar el taller "${t.nombre}" y los pagos registrados de todos los alumnos?`)) return;
    try {
      await monserratApi.deleteTallerCatalogo(t.id, token);
      cargar();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo eliminar el taller");
    }
  };

  // ---- Pagos por celda ----
  const guardarPago = async (
    alumno: UsuarioAcademico,
    taller: TallerCatalogo,
    patch: { montoPagado?: number | null; pagada?: boolean }
  ) => {
    try {
      const saved = await monserratApi.registrarPagoTaller(
        { alumnoDni: alumno.dni, catalogoId: taller.id, ...patch },
        token
      );
      setRegistros((cur) => [...cur.filter((r) => !(r.alumnoDni === saved.alumnoDni && r.catalogoId === saved.catalogoId)), saved]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar el pago");
    }
  };

  const cell = "px-2 py-1.5 text-center";
  const th = "px-2 py-2.5 text-[10px] font-black uppercase tracking-wide text-monserrat-ink/40";

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="pro-card pro-rise px-5 py-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wide text-monserrat-ink/40">Talleres {anio}</p>
          <p className="mt-1 text-2xl font-black text-monserrat-ink">
            {resumen.pagados} <span className="text-sm font-semibold text-monserrat-ink/40">/ {resumen.total} pagados</span>
          </p>
          <p className="text-[11px] font-semibold text-monserrat-ink/40">
            {catalogo.length} taller{catalogo.length === 1 ? "" : "es"} · {filas.length} alumnos en vista
          </p>
        </div>
      </div>

      {/* Catalogo de talleres */}
      <div className="pro-card pro-rise p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-black text-monserrat-ink">Talleres del {anio}</p>
            <p className="text-[11px] text-monserrat-ink/45">
              Crea cada taller una sola vez (nombre y monto) y elige los salones o grados a los que se aplica; los
              alumnos lo reciben automaticamente.
            </p>
          </div>
          <button
            type="button"
            onClick={() => (formAbierto ? resetForm() : setFormAbierto(true))}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#d8a842]/35 px-3 py-1.5 text-[12px] font-black text-monserrat-ink/60 hover:bg-monserrat-cream/40"
          >
            {formAbierto ? <X size={13} /> : <Plus size={13} />} {formAbierto ? "Cancelar" : "Nuevo taller"}
          </button>
        </div>

        {formAbierto && (
          <div className="mt-3 grid gap-3 rounded-[10px] border border-dashed border-monserrat-ink/15 bg-[#f4ead2] p-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[200px] flex-1">
                <label className="text-[10px] font-black uppercase tracking-wide text-monserrat-ink/40">Nombre</label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Taller de Robotica"
                  className="admin-input mt-1"
                />
              </div>
              <div className="w-[130px]">
                <label className="text-[10px] font-black uppercase tracking-wide text-monserrat-ink/40">Monto (S/)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={monto}
                  onKeyDown={bloquearNegativos}
                  onChange={(e) => setMonto(clampMonto(e.target.value))}
                  placeholder="0.00"
                  className="admin-input mt-1"
                />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-monserrat-ink/40">Salones que llevan este taller</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {SALONES.map((s) => {
                  const activo = destinos.includes(tokenSalon(s));
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleDestino(tokenSalon(s))}
                      className={`rounded-full border px-3 py-1 text-[11px] font-black transition ${
                        activo
                          ? "border-monserrat-red/30 bg-monserrat-red text-white"
                          : "border-[#d8a842]/35 bg-white text-monserrat-ink/50 hover:bg-monserrat-cream/40"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] font-black uppercase tracking-wide text-monserrat-ink/40">
                O grados completos
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {ALL_GRADOS.map((g) => {
                  const activo = destinos.includes(tokenGrado(g));
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleDestino(tokenGrado(g))}
                      className={`rounded-full border px-3 py-1 text-[11px] font-black transition ${
                        activo
                          ? "border-monserrat-red/30 bg-monserrat-red text-white"
                          : "border-[#d8a842]/35 bg-white text-monserrat-ink/50 hover:bg-monserrat-cream/40"
                      }`}
                    >
                      {formatGrado(g)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => void guardarTaller()}
                className="rounded-[10px] bg-monserrat-red px-4 py-2 text-[12px] font-black text-white hover:bg-monserrat-redDark"
              >
                {editandoId != null ? "Guardar cambios" : "Crear taller"}
              </button>
            </div>
          </div>
        )}

        {catalogo.length === 0 ? (
          <p className="mt-3 text-[12px] font-semibold text-monserrat-ink/35">Aun no hay talleres creados para {anio}.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {catalogo.map((t) => (
              <div key={t.id} className="flex items-start gap-2 rounded-[10px] border border-[#d8a842]/25 bg-[#f4ead2] px-3 py-2">
                <div className="min-w-0">
                  <p className="text-[12px] font-black text-monserrat-ink">{t.nombre}</p>
                  <p className="text-[11px] text-monserrat-ink/45">S/ {Number(t.monto).toFixed(2)}</p>
                  <p className="max-w-[260px] text-[10px] font-semibold text-monserrat-ink/40">
                    {t.aplicaA.length === 0
                      ? "Sin salones asignados"
                      : t.aplicaA.map((d) => (d.startsWith("GRADO:") ? formatGrado(d.slice(6)) : d.slice(6))).join(", ")}
                  </p>
                </div>
                <button type="button" onClick={() => editar(t)} aria-label="Editar taller" className="text-monserrat-ink/35 hover:text-monserrat-ink">
                  <Pencil size={13} />
                </button>
                <button type="button" onClick={() => void eliminarTaller(t)} aria-label="Eliminar taller" className="text-monserrat-ink/30 hover:text-red-600">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="pro-card pro-rise p-3 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[1fr_140px_140px_150px_110px]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar alumno por nombre, DNI o codigo"
            className="admin-input"
          />
          <select
            value={nivelFiltro}
            onChange={(e) => {
              setNivelFiltro(e.target.value);
              setGradoFiltro("");
            }}
            className="admin-input"
          >
            <option value="">Todos los niveles</option>
            <option value="INICIAL">Inicial</option>
            <option value="PRIMARIA">Primaria</option>
            <option value="SECUNDARIA">Secundaria</option>
          </select>
          <select value={gradoFiltro} onChange={(e) => setGradoFiltro(e.target.value)} className="admin-input">
            <option value="">Todos los grados</option>
            {gradosOpciones.map((g) => (
              <option key={g} value={g}>
                {formatGrado(g)}
              </option>
            ))}
          </select>
          <select value={salonFiltro} onChange={(e) => setSalonFiltro(e.target.value)} className="admin-input">
            <option value="">Todos los salones</option>
            {SALONES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className="admin-input">
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla: talleres como columnas, alumnos como filas */}
      <div className="overflow-hidden pro-card pro-rise shadow-sm">
        {filas.length === 0 ? (
          <div className="py-12 text-center text-[13px] font-semibold text-monserrat-ink/30">Sin alumnos con esos filtros</div>
        ) : catalogo.length === 0 ? (
          <div className="py-12 text-center text-[13px] font-semibold text-monserrat-ink/30">
            Crea un taller para empezar a registrar pagos.
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-[#d8a842]/25 bg-white text-left">
                  <th className={`${th} sticky left-0 z-20 min-w-[200px] bg-white px-4 text-left`}>Alumno</th>
                  <th className={`${th} text-left`}>Grado</th>
                  <th className={`${th} text-left`}>Salón</th>
                  {catalogo.map((t) => (
                    <th key={t.id} className={`${th} min-w-[150px] text-center normal-case`}>
                      <span className="block text-[11px] font-black uppercase tracking-wide text-monserrat-ink/60">{t.nombre}</span>
                      <span className="block text-[10px] font-semibold text-monserrat-ink/40">S/ {Number(t.monto).toFixed(2)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((alumno) => (
                  <tr key={alumno.dni || alumno.codigo || alumno.nombre} className="border-t border-monserrat-ink/6 hover:bg-monserrat-cream/20">
                    <td className="sticky left-0 z-10 bg-white px-4 py-2">
                      <p className="font-black text-monserrat-ink">{alumno.nombre}</p>
                      <p className="text-[10px] text-monserrat-ink/40">{alumno.dni}</p>
                    </td>
                    <td className="px-2 py-2 text-monserrat-ink/60">{formatGrado(alumno.grado)}</td>
                    <td className="px-2 py-2 text-monserrat-ink/60">{formatSalon(alumno.grado, alumno.seccion)}</td>
                    {catalogo.map((t) => {
                      if (!aplicaA(t, alumno)) {
                        return (
                          <td key={t.id} className={`${cell} text-monserrat-ink/20`}>
                            —
                          </td>
                        );
                      }
                      const reg = registroPor.get(`${alumno.dni}|${t.id}`);
                      const key = `${alumno.dni}|${t.id}`;
                      const pagada = Boolean(reg?.pagada);
                      const valor = borradores[key] ?? (reg?.montoPagado != null ? String(reg.montoPagado) : "");
                      return (
                        <td key={t.id} className={cell}>
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={valor}
                              placeholder="0.00"
                              onKeyDown={bloquearNegativos}
                              onChange={(e) => {
                                const v = clampMonto(e.target.value);
                                setBorradores((c) => ({ ...c, [key]: v }));
                              }}
                              onBlur={() => {
                                const raw = borradores[key];
                                if (raw === undefined) return;
                                setBorradores((c) => {
                                  const { [key]: _omit, ...rest } = c;
                                  return rest;
                                });
                                const n = raw.trim() === "" ? 0 : Math.max(0, Number(raw));
                                if (!Number.isFinite(n)) return;
                                void guardarPago(alumno, t, { montoPagado: n });
                              }}
                              className="admin-input h-8 w-[84px] py-0 text-[12px]"
                            />
                            <button
                              type="button"
                              onClick={() => void guardarPago(alumno, t, { pagada: !pagada })}
                              title={pagada ? "Pagado — clic para marcar pendiente" : "Pendiente — clic para marcar pagado (monto completo)"}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-[8px] border transition ${
                                pagada
                                  ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                                  : "border-[#d8a842]/35 bg-monserrat-cream/40 text-monserrat-ink/40"
                              }`}
                            >
                              {pagada ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default TalleresTab;

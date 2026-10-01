import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { monserratApi } from "../../../api/monserrat";
import type { Matricula, UsuarioAcademico } from "../../../types";
import { formatGrado, formatSalon } from "./adminShared";

type MatriculaTabProps = {
  usuariosAcademicos: UsuarioAcademico[];
  token: string;
  setErrorMessage: (msg: string | null) => void;
  gradosActivosPorNivel: (nivel?: string) => string[];
  labelAcademico: (id: string) => string;
};

export function MatriculaTab({
  usuariosAcademicos,
  token,
  setErrorMessage,
  gradosActivosPorNivel,
  labelAcademico,
}: MatriculaTabProps) {
  const [matriculas, setMatriculas] = useState<Matricula[]>([]);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [search, setSearch] = useState("");
  const [nivelFiltro, setNivelFiltro] = useState("");
  const [gradoFiltro, setGradoFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<"all" | "paid" | "pend">("all");
  const [montosBorrador, setMontosBorrador] = useState<Record<string, string>>({});

  const alumnos = useMemo(
    () => usuariosAcademicos.filter((u) => u.rol === "ALUMNO"),
    [usuariosAcademicos]
  );

  const CURRENT_YEAR = new Date().getFullYear();
  const START_YEAR = 2021;
  const YEARS = Array.from({ length: CURRENT_YEAR - START_YEAR + 2 }, (_, i) => String(CURRENT_YEAR + 1 - i));

  const cargar = () => {
    if (!token) return;
    monserratApi
      .matriculasAcademicas(anio, token)
      .then(setMatriculas)
      .catch((error: unknown) =>
        setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar la matricula")
      );
  };

  useEffect(cargar, [anio, token]);

  const matriculaPorAlumno = useMemo(() => {
    const map = new Map<string, Matricula>();
    matriculas.forEach((m) => map.set(m.alumnoDni, m));
    return map;
  }, [matriculas]);

  const filas = useMemo(() => {
    const term = search.trim().toLowerCase();
    return alumnos
      .filter((alumno) => {
        if (
          term &&
          ![alumno.codigo, alumno.dni, alumno.nombre, alumno.nivelEducativo, alumno.grado, alumno.seccion]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(term))
        ) {
          return false;
        }
        const nivelAlumno = alumno.grado === "INICIAL" ? "INICIAL" : alumno.nivelEducativo;
        if (nivelFiltro && nivelAlumno !== nivelFiltro) return false;
        if (gradoFiltro && alumno.grado !== gradoFiltro) return false;
        return true;
      })
      .map((alumno) => ({ alumno, matricula: matriculaPorAlumno.get(alumno.dni) }))
      .filter(({ matricula }) => {
        if (estadoFiltro === "all") return true;
        const pagada = Boolean(matricula?.pagada);
        return estadoFiltro === "paid" ? pagada : !pagada;
      });
  }, [alumnos, search, nivelFiltro, gradoFiltro, estadoFiltro, matriculaPorAlumno]);

  const pagadas = filas.filter(({ matricula }) => matricula?.pagada).length;

  // Si el admin edita el monto y de inmediato togglea el estado, ambas
  // peticiones salen casi juntas y cada una desconoce el cambio de la otra.
  // Este ref guarda el ultimo valor "intentado" (no solo el confirmado por el
  // servidor) para que la segunda peticion siempre parta del valor correcto,
  // sin importar en que orden respondan.
  const pendientePorAlumno = useRef<Map<string, { monto: number | null; pagada: boolean; observacion?: string }>>(
    new Map()
  );

  const guardar = async (alumno: UsuarioAcademico, patch: { pagada?: boolean; monto?: number | null }) => {
    if (patch.monto != null && patch.monto < 0) patch = { ...patch, monto: 0 };
    const actual = matriculaPorAlumno.get(alumno.dni);
    const base = pendientePorAlumno.current.get(alumno.dni) ?? {
      monto: actual?.monto ?? null,
      pagada: Boolean(actual?.pagada),
      observacion: actual?.observacion ?? "",
    };
    const next = {
      monto: patch.monto !== undefined ? patch.monto : base.monto,
      pagada: patch.pagada !== undefined ? patch.pagada : base.pagada,
      observacion: base.observacion,
    };
    pendientePorAlumno.current.set(alumno.dni, next);
    try {
      const saved = await monserratApi.updateMatriculaAcademica(
        { alumnoDni: alumno.dni, anio, ...next },
        token
      );
      setMatriculas((current) => {
        const others = current.filter((m) => m.alumnoDni !== saved.alumnoDni);
        return [...others, saved];
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar la matricula");
    }
  };

  const gradosDelNivel = nivelFiltro === "INICIAL"
    ? ["INICIAL"]
    : nivelFiltro
      ? gradosActivosPorNivel(nivelFiltro).filter((g) => g !== "INICIAL")
      : [];

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[14px] border border-monserrat-ink/8 bg-white px-5 py-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wide text-monserrat-ink/40">Matriculados {anio}</p>
          <p className="mt-1 text-2xl font-black text-monserrat-ink">
            {pagadas} <span className="text-sm font-semibold text-monserrat-ink/40">/ {filas.length}</span>
          </p>
        </div>
      </div>

      <div className="rounded-[14px] border border-monserrat-ink/8 bg-white p-3 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[1fr_150px_150px_auto]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre, DNI o codigo"
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
          <select
            value={gradoFiltro}
            onChange={(e) => setGradoFiltro(e.target.value)}
            className="admin-input"
            disabled={!nivelFiltro}
          >
            <option value="">Todos los grados</option>
            {gradosDelNivel.map((g) => (
              <option key={g} value={g}>
                {formatGrado(g) || labelAcademico(g)}
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
        <div className="mt-3 flex flex-wrap gap-2">
          {(["all", "paid", "pend"] as const).map((s) => {
            const labels = { all: "Todos", paid: "✓ Matriculados", pend: "⏳ Sin matricular" };
            const active = estadoFiltro === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setEstadoFiltro(s)}
                className={`rounded-full border px-3 py-1 text-[12px] font-black transition-all ${
                  active
                    ? "bg-monserrat-ink text-white border-monserrat-ink/20"
                    : "bg-transparent text-monserrat-ink/40 border-monserrat-ink/10 hover:bg-monserrat-cream/40"
                }`}
              >
                {labels[s]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-monserrat-ink/8 bg-white shadow-sm">
        {filas.length === 0 ? (
          <div className="py-12 text-center text-[13px] font-semibold text-monserrat-ink/30">
            Sin alumnos con esos filtros
          </div>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-monserrat-ink/8 text-left">
                <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-monserrat-ink/40">Alumno</th>
                <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-monserrat-ink/40">Grado</th>
                <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-monserrat-ink/40">Salón</th>
                <th className="w-[140px] px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-monserrat-ink/40">Monto (S/)</th>
                <th className="w-[140px] px-3 py-2.5 text-center text-[10px] font-black uppercase tracking-wide text-monserrat-ink/40">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ alumno, matricula }) => {
                const pagada = Boolean(matricula?.pagada);
                const montoKey = alumno.dni;
                const montoValor = montosBorrador[montoKey] ?? (matricula?.monto != null ? String(matricula.monto) : "");
                return (
                  <tr key={alumno.dni} className="border-t border-monserrat-ink/6 hover:bg-monserrat-cream/20">
                    <td className="px-4 py-2.5">
                      <p className="font-black text-monserrat-ink">{alumno.nombre}</p>
                      <p className="text-[11px] text-monserrat-ink/40">{alumno.dni}</p>
                    </td>
                    <td className="px-3 py-2.5 text-monserrat-ink/60">{formatGrado(alumno.grado)}</td>
                    <td className="px-3 py-2.5 text-monserrat-ink/60">{formatSalon(alumno.grado, alumno.seccion)}</td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={montoValor}
                        onKeyDown={(e) => {
                          if (e.key === "-" || e.key === "e" || e.key === "E") e.preventDefault();
                        }}
                        onChange={(e) => {
                          const v = e.target.value;
                          setMontosBorrador((c) => ({ ...c, [montoKey]: v !== "" && Number(v) < 0 ? "0" : v }));
                        }}
                        onBlur={() => {
                          const raw = montosBorrador[montoKey];
                          if (raw === undefined) return;
                          const parsed = raw.trim() === "" || !Number.isFinite(Number(raw)) ? null : Math.max(0, Number(raw));
                          void guardar(alumno, { monto: parsed });
                        }}
                        className="admin-input h-8 w-full py-0 text-[12px]"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => void guardar(alumno, { pagada: !pagada })}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-black transition ${
                          pagada
                            ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                            : "border-monserrat-ink/12 bg-monserrat-cream/40 text-monserrat-ink/50"
                        }`}
                      >
                        {pagada ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        {pagada ? "Matriculado" : "Pendiente"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default MatriculaTab;

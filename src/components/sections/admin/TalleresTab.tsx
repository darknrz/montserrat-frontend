import { CheckCircle2, Plus, Trash2, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { monserratApi } from "../../../api/monserrat";
import type { Taller, UsuarioAcademico } from "../../../types";

type TalleresTabProps = {
  usuariosAcademicos: UsuarioAcademico[];
  token: string;
  setErrorMessage: (msg: string | null) => void;
  labelAcademico: (id: string) => string;
};

export function TalleresTab({ usuariosAcademicos, token, setErrorMessage, labelAcademico }: TalleresTabProps) {
  const [talleres, setTalleres] = useState<Taller[]>([]);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [search, setSearch] = useState("");
  const [formAbiertoPara, setFormAbiertoPara] = useState<string | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoMonto, setNuevoMonto] = useState("");

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
      .talleresAcademicos(anio, token)
      .then(setTalleres)
      .catch((error: unknown) =>
        setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar los talleres")
      );
  };

  useEffect(cargar, [anio, token]);

  const talleresPorAlumno = useMemo(() => {
    const map = new Map<string, Taller[]>();
    talleres.forEach((t) => {
      const list = map.get(t.alumnoDni) ?? [];
      list.push(t);
      map.set(t.alumnoDni, list);
    });
    return map;
  }, [talleres]);

  const alumnosFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return alumnos;
    return alumnos.filter((alumno) =>
      [alumno.codigo, alumno.dni, alumno.nombre, alumno.grado, alumno.seccion]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [alumnos, search]);

  // Sin busqueda: solo alumnos con al menos un taller, para no saturar la
  // vista con 177 filas vacias. Buscando por nombre/DNI, se muestran todos
  // los que calcen (aunque no tengan talleres aun) para poder agregarles uno.
  const hayBusqueda = search.trim().length > 0;
  const filasVisibles = useMemo(
    () =>
      hayBusqueda
        ? alumnosFiltrados
        : alumnosFiltrados.filter((a) => (talleresPorAlumno.get(a.dni)?.length ?? 0) > 0 || formAbiertoPara === a.dni),
    [alumnosFiltrados, talleresPorAlumno, formAbiertoPara, hayBusqueda]
  );

  const totalTalleres = talleres.length;
  const totalPagados = talleres.filter((t) => t.pagada).length;

  const togglePagado = async (taller: Taller) => {
    try {
      const saved = await monserratApi.updateTallerAcademico(
        taller.id,
        {
          alumnoDni: taller.alumnoDni,
          anio: taller.anio,
          nombre: taller.nombre,
          monto: taller.monto,
          pagada: !taller.pagada,
          observacion: taller.observacion,
        },
        token
      );
      setTalleres((current) => current.map((t) => (t.id === saved.id ? saved : t)));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo actualizar el taller");
    }
  };

  const eliminar = async (taller: Taller) => {
    try {
      await monserratApi.deleteTallerAcademico(taller.id, token);
      setTalleres((current) => current.filter((t) => t.id !== taller.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo eliminar el taller");
    }
  };

  const agregar = async (alumno: UsuarioAcademico) => {
    const monto = Number(nuevoMonto);
    if (!nuevoNombre.trim() || !Number.isFinite(monto) || monto < 0) {
      setErrorMessage("Ingresa un nombre de taller y un monto valido");
      return;
    }
    try {
      const creado = await monserratApi.createTallerAcademico(
        { alumnoDni: alumno.dni, anio, nombre: nuevoNombre.trim(), monto, pagada: false },
        token
      );
      setTalleres((current) => [...current, creado]);
      setNuevoNombre("");
      setNuevoMonto("");
      setFormAbiertoPara(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo crear el taller");
    }
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[14px] border border-monserrat-ink/8 bg-white px-5 py-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wide text-monserrat-ink/40">Talleres {anio}</p>
          <p className="mt-1 text-2xl font-black text-monserrat-ink">
            {totalPagados} <span className="text-sm font-semibold text-monserrat-ink/40">/ {totalTalleres} pagados</span>
          </p>
        </div>
      </div>

      <div className="rounded-[14px] border border-monserrat-ink/8 bg-white p-3 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar alumno por nombre, DNI o codigo"
            className="admin-input"
          />
          <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className="admin-input">
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        {!search.trim() && (
          <p className="mt-2 text-[11px] font-semibold text-monserrat-ink/40">
            Se muestran solo los alumnos con talleres registrados. Busca por nombre para agregarle uno a un alumno nuevo.
          </p>
        )}
      </div>

      <div className="grid gap-3">
        {filasVisibles.length === 0 ? (
          <div className="rounded-[14px] border border-monserrat-ink/8 bg-white py-12 text-center text-[13px] font-semibold text-monserrat-ink/30">
            Sin alumnos con esos filtros
          </div>
        ) : (
          filasVisibles.map((alumno) => {
            const talleresAlumno = talleresPorAlumno.get(alumno.dni) ?? [];
            const formAbierto = formAbiertoPara === alumno.dni;
            return (
              <div key={alumno.dni} className="rounded-[14px] border border-monserrat-ink/8 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-black text-monserrat-ink">{alumno.nombre}</p>
                    <p className="text-[11px] text-monserrat-ink/40">
                      {alumno.dni} · {labelAcademico(alumno.grado ?? "")}
                      {alumno.seccion ? ` · ${alumno.seccion}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormAbiertoPara(formAbierto ? null : alumno.dni)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-monserrat-ink/12 px-3 py-1.5 text-[12px] font-black text-monserrat-ink/60 hover:bg-monserrat-cream/40"
                  >
                    <Plus size={13} /> Agregar taller
                  </button>
                </div>

                {formAbierto && (
                  <div className="mt-3 flex flex-wrap items-end gap-2 rounded-[10px] border border-dashed border-monserrat-ink/15 bg-[#f2f2f1] p-3">
                    <div className="min-w-[180px] flex-1">
                      <label className="text-[10px] font-black uppercase tracking-wide text-monserrat-ink/40">Detalle</label>
                      <input
                        value={nuevoNombre}
                        onChange={(e) => setNuevoNombre(e.target.value)}
                        placeholder="Ej. Taller de Robotica"
                        className="admin-input mt-1"
                      />
                    </div>
                    <div className="w-[120px]">
                      <label className="text-[10px] font-black uppercase tracking-wide text-monserrat-ink/40">Monto (S/)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={nuevoMonto}
                        onChange={(e) => setNuevoMonto(e.target.value)}
                        placeholder="0.00"
                        className="admin-input mt-1"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void agregar(alumno)}
                      className="rounded-[10px] bg-monserrat-ink px-4 py-2 text-[12px] font-black text-white hover:bg-monserrat-ink/85"
                    >
                      Guardar
                    </button>
                  </div>
                )}

                {talleresAlumno.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {talleresAlumno.map((taller) => (
                      <div
                        key={taller.id}
                        className="flex items-center gap-2 rounded-[10px] border border-monserrat-ink/8 bg-[#f2f2f1] px-3 py-2"
                      >
                        <div>
                          <p className="text-[12px] font-black text-monserrat-ink">{taller.nombre}</p>
                          <p className="text-[11px] text-monserrat-ink/45">S/ {taller.monto.toFixed(2)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void togglePagado(taller)}
                          title={taller.pagada ? "Pagado — clic para marcar pendiente" : "Pendiente — clic para marcar pagado"}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-black transition ${
                            taller.pagada
                              ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                              : "border-monserrat-ink/12 bg-white text-monserrat-ink/50"
                          }`}
                        >
                          {taller.pagada ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {taller.pagada ? "Pagado" : "Pendiente"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void eliminar(taller)}
                          aria-label="Eliminar taller"
                          className="text-monserrat-ink/30 hover:text-red-600"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default TalleresTab;

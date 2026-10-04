import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { useReveal } from "../../hooks/useReveal";
import type { Ingresante } from "../../types";

import { EstadoAmable } from "../ui/EstadoAmable";
import { Pagination } from "../ui/Pagination";
import { SectionHeader } from "../ui/SectionHeader";

const PAGE_SIZE = 6;
const CHIP_BASE = "rounded-full border-2 px-3.5 py-1.5 text-[12px] font-extrabold transition";
const CHIP_ON = "border-monserrat-red bg-monserrat-red text-white";
const CHIP_OFF = "border-monserrat-gold/35 bg-white text-monserrat-ink/70 hover:border-monserrat-red/40 hover:text-monserrat-red";

type IngresantesProps = {
  ingresantes: Ingresante[];
};

const unicos = (valores: (string | undefined)[]) =>
  Array.from(new Set(valores.filter((v): v is string => Boolean(v && v.trim()))));

export function Ingresantes({ ingresantes }: IngresantesProps) {
  const ref = useReveal<HTMLElement>();
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("Todos");
  const [uni, setUni] = useState("");
  const [seleccion, setSeleccion] = useState("Todos");
  const [page, setPage] = useState(1);

  // Las opciones de filtro salen de los datos reales (nada de años o universidades fijos).
  const years = useMemo(() => ["Todos", ...unicos(ingresantes.map((i) => i.anio)).sort((a, b) => Number(b) - Number(a))], [ingresantes]);
  const universidades = useMemo(() => unicos(ingresantes.map((i) => i.universidadSiglas)).sort(), [ingresantes]);
  const selecciones = useMemo(() => ["Todos", ...unicos(ingresantes.map((i) => i.tipoSeleccion))], [ingresantes]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return ingresantes.filter((i) => {
      const matchYear = year === "Todos" || i.anio === year;
      const matchUni = !uni || i.universidadSiglas === uni;
      const matchSel = seleccion === "Todos" || i.tipoSeleccion === seleccion;
      const matchQ = !q || [i.nombre, i.carrera, i.universidad, i.universidadSiglas].some((v) => v?.toLowerCase().includes(q));
      return matchYear && matchUni && matchSel && matchQ;
    });
  }, [ingresantes, query, year, uni, seleccion]);

  // Sin ingresantes publicados la sección no existe (tampoco su enlace en el menú).
  if (ingresantes.length === 0) return null;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetAll = () => {
    setQuery("");
    setYear("Todos");
    setUni("");
    setSeleccion("Todos");
    setPage(1);
  };
  const changeFilter = (fn: () => void) => {
    fn();
    setPage(1);
  };
  const hasActiveFilters = query || year !== "Todos" || uni || seleccion !== "Todos";

  // Con pocos ingresantes (una sola página) no hacen falta buscador ni filtros.
  const mostrarFiltros = ingresantes.length > PAGE_SIZE;
  const gruposDeFiltro = [years.length > 2, universidades.length > 1, selecciones.length > 2];

  return (
    <section id="ingresantes" ref={ref} className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="reveal">
          <SectionHeader
            eyebrow="Orgullo Monserrat"
            title="Nuestros Ingresantes"
            description="Estudiantes que alcanzaron su sueño universitario formados en nuestra institución."
          />
        </div>

        {mostrarFiltros && (
          <div className="reveal kid-card mt-10 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex flex-1 items-center gap-2.5 rounded-2xl border-2 border-monserrat-gold/35 bg-white px-4 py-2.5 focus-within:border-monserrat-red/60">
                <Search size={16} className="flex-shrink-0 text-monserrat-ink/45" aria-hidden="true" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => changeFilter(() => setQuery(e.target.value))}
                  placeholder="Buscar por nombre, carrera o universidad..."
                  aria-label="Buscar ingresantes"
                  className="flex-1 bg-transparent text-[14px] text-monserrat-ink outline-none placeholder:text-monserrat-ink/45"
                />
                {query && (
                  <button type="button" onClick={() => changeFilter(() => setQuery(""))} aria-label="Borrar búsqueda" className="text-monserrat-ink/50 transition hover:text-monserrat-ink">
                    <X size={15} />
                  </button>
                )}
              </label>
              {hasActiveFilters && (
                <button type="button" onClick={resetAll} className="kid-btn-soft whitespace-nowrap">
                  Limpiar todo
                </button>
              )}
            </div>

            {gruposDeFiltro.some(Boolean) && <div className="my-4 h-px bg-monserrat-gold/25" />}

            <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
              {gruposDeFiltro[0] && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-monserrat-ink/55">Año</span>
                  {years.map((y) => (
                    <button key={y} type="button" aria-pressed={year === y} onClick={() => changeFilter(() => setYear(y))}
                      className={`${CHIP_BASE} ${year === y ? CHIP_ON : CHIP_OFF}`}>
                      {y}
                    </button>
                  ))}
                </div>
              )}

              {gruposDeFiltro[1] && (
                <label className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-monserrat-ink/55">Universidad</span>
                  <select value={uni} onChange={(e) => changeFilter(() => setUni(e.target.value))} className="admin-input !w-auto !rounded-full !py-1.5">
                    <option value="">Todas</option>
                    {universidades.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </label>
              )}

              {gruposDeFiltro[2] && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-monserrat-ink/55">Selección</span>
                  {selecciones.map((s) => (
                    <button key={s} type="button" aria-pressed={seleccion === s} onClick={() => changeFilter(() => setSeleccion(s))}
                      className={`${CHIP_BASE} ${seleccion === s ? CHIP_ON : CHIP_OFF}`}>
                      {s === "Centro Preuniversitario" ? "Pre-uni" : s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {mostrarFiltros && (
          <p className="mt-4 text-[13px] font-semibold text-monserrat-ink/65" aria-live="polite">
            <span className="font-black text-monserrat-ink">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "ingresante encontrado" : "ingresantes encontrados"}
          </p>
        )}

        {/* Tarjetas: pocas quedan centradas; muchas se reparten en la cuadrícula con paginación */}
        {visible.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-5">
            {visible.map((item, i) => (
              <article
                key={item.id}
                className="reveal kid-card kid-card-hover w-full overflow-hidden sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.85rem)]"
                style={{ ["--i" as string]: i } as React.CSSProperties}
              >
                <div className="relative flex h-56 w-full items-center justify-center overflow-hidden bg-[#fff3d6] p-2">
                  {item.fotoUrl ? (
                    <img src={item.fotoUrl} alt={item.nombre} loading="lazy" className="h-full w-full rounded-[18px] object-contain" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-[18px] bg-monserrat-red text-white">
                      <span className="text-5xl font-black">{item.nombre.slice(0, 1)}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 text-center">
                  <p className="text-[15px] font-black uppercase tracking-[0.04em] text-monserrat-ink">{item.nombre}</p>
                  {item.universidadSiglas && (
                    <p className="mt-2 inline-flex rounded-full bg-monserrat-red/10 px-3 py-0.5 text-[12px] font-extrabold uppercase tracking-[0.14em] text-monserrat-red">
                      {item.universidadSiglas}
                    </p>
                  )}
                  {item.carrera && <p className="mt-2 text-[14px] leading-snug text-monserrat-ink/80">{item.carrera}</p>}
                  {item.anio && <p className="mt-1 text-[12px] font-bold text-monserrat-ink/55">Ingresó en {item.anio}</p>}
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Los filtros no devolvieron resultados */}
        {filtered.length === 0 && (
          <div className="mt-8">
            <EstadoAmable
              compacto
              titulo="No encontramos ingresantes con esos filtros"
              mensaje="Prueba con otro texto o quita algún filtro."
              accion={{ texto: "Limpiar filtros", onClick: resetAll }}
            />
          </div>
        )}

        {filtered.length > 0 && totalPages > 1 && (
          <div className="mt-6">
            <Pagination currentPage={page} totalPages={totalPages} onChange={setPage} />
          </div>
        )}
      </div>
    </section>
  );
}

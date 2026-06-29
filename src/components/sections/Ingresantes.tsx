import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { universityBadgeClasses } from "../../constants/colors";
import type { Ingresante } from "../../types";

import { Badge } from "../ui/Badge";
import { Pagination } from "../ui/Pagination";
import { SectionHeader } from "../ui/SectionHeader";

const YEARS = ["Todos", "2025", "2024", "2023", "2022"];
const SELECCIONES = ["Todos", "Ordinario", "Centro Preuniversitario"];
const UNIVERSIDADES = [
  "UNMSM",
  "UNI",
  "UNCP",
  "UPLA",
  "UNFV",
  "UNALM",
  "UNH",
  "USMP",
];

const PAGE_SIZE = 6;

type IngresantesProps = {
  ingresantes: Ingresante[];
};

export function Ingresantes({ ingresantes }: IngresantesProps) {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("Todos");
  const [uni, setUni] = useState("");
  const [seleccion, setSeleccion] = useState("Todos");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();

    return ingresantes.filter((i) => {
      const matchYear = year === "Todos" || i.anio === year;

      const matchUni =
        !uni || i.universidadSiglas === uni;

      const matchSel =
        seleccion === "Todos" ||
        i.tipoSeleccion === seleccion;

      const matchQ =
        !q ||
        [
          i.nombre,
          i.carrera,
          i.universidad,
          i.universidadSiglas,
        ].some((v) =>
          v?.toLowerCase().includes(q)
        );

      return (
        matchYear &&
        matchUni &&
        matchSel &&
        matchQ
      );
    });
  }, [ingresantes, query, year, uni, seleccion]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  const visible = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

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

  const hasActiveFilters =
    query ||
    year !== "Todos" ||
    uni ||
    seleccion !== "Todos";

  return (
    <section
      id="ingresantes"
      className="bg-monserrat-cream px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Orgullo Monserrat"
          title="Nuestros Ingresantes"
          description="Estudiantes que alcanzaron su sueño universitario formados en nuestra institución."
        />

        {/* PANEL FILTROS */}
        <div className="mt-10 rounded-[20px] border border-monserrat-ink/8 bg-white p-4 shadow-[0_2px_8px_rgba(28,20,16,0.04)]">

          {/* BUSCADOR */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-monserrat-ink/10 bg-monserrat-cream/60 px-3.5 py-2">
              <Search
                size={15}
                className="flex-shrink-0 text-monserrat-ink/35"
              />

              <input
                type="text"
                value={query}
                onChange={(e) =>
                  changeFilter(() =>
                    setQuery(e.target.value)
                  )
                }
                placeholder="Buscar por nombre, carrera o universidad..."
                className="flex-1 bg-transparent text-[13px] text-monserrat-ink outline-none placeholder:text-monserrat-ink/40"
              />

              {query && (
                <button
                  type="button"
                  onClick={() =>
                    changeFilter(() => setQuery(""))
                  }
                  className="text-monserrat-ink/40 transition hover:text-monserrat-ink"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAll}
                className="whitespace-nowrap rounded-xl border border-monserrat-ink/10 px-4 py-2 text-[11px] font-bold text-monserrat-ink/50 transition hover:border-monserrat-ink/25 hover:text-monserrat-ink"
              >
                Limpiar todo
              </button>
            )}
          </div>

          <div className="my-4 h-px bg-monserrat-ink/6" />

          {/* FILTROS */}
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">

            {/* AÑO */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-monserrat-ink/40">
                Año
              </span>

              {YEARS.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() =>
                    changeFilter(() => setYear(y))
                  }
                  className={`rounded-full border px-3 py-1 text-[11.5px] font-bold transition ${
                    year === y
                      ? "border-monserrat-red bg-monserrat-red text-white"
                      : "border-monserrat-ink/10 text-monserrat-ink/55 hover:border-monserrat-ink/25 hover:text-monserrat-ink"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>

            {/* UNIVERSIDAD */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-monserrat-ink/40">
                Universidad
              </span>

              <select
                value={uni}
                onChange={(e) =>
                  changeFilter(() =>
                    setUni(e.target.value)
                  )
                }
                className="rounded-full border border-monserrat-ink/10 bg-monserrat-cream/60 py-1 pl-3 pr-7 text-[12px] font-bold text-monserrat-ink/60 outline-none"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%231C1410' stroke-width='2' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition:
                    "right 8px center",
                  appearance: "none",
                }}
              >
                <option value="">Todas</option>

                {UNIVERSIDADES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            {/* SELECCIÓN */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-monserrat-ink/40">
                Selección
              </span>

              {SELECCIONES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    changeFilter(() =>
                      setSeleccion(s)
                    )
                  }
                  className={`rounded-full border px-3 py-1 text-[11.5px] font-bold transition ${
                    seleccion === s
                      ? "border-monserrat-red bg-monserrat-red text-white"
                      : "border-monserrat-ink/10 text-monserrat-ink/55 hover:border-monserrat-ink/25 hover:text-monserrat-ink"
                  }`}
                >
                  {s ===
                  "Centro Preuniversitario"
                    ? "Pre-uni"
                    : s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RESULTADOS */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] font-semibold text-monserrat-ink/50">
            <span className="font-black text-monserrat-ink">
              {filtered.length}
            </span>{" "}
            ingresantes encontrados
          </p>

          {/* TAGS */}
          <div className="flex flex-wrap gap-2">
            {year !== "Todos" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-monserrat-red/8 px-3 py-1 text-[11px] font-bold text-monserrat-red">
                {year}

                <X
                  size={11}
                  className="cursor-pointer"
                  onClick={() =>
                    changeFilter(() =>
                      setYear("Todos")
                    )
                  }
                />
              </span>
            )}

            {uni && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-monserrat-red/8 px-3 py-1 text-[11px] font-bold text-monserrat-red">
                {uni}

                <X
                  size={11}
                  className="cursor-pointer"
                  onClick={() =>
                    changeFilter(() =>
                      setUni("")
                    )
                  }
                />
              </span>
            )}

            {seleccion !== "Todos" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-monserrat-red/8 px-3 py-1 text-[11px] font-bold text-monserrat-red">
                {seleccion}

                <X
                  size={11}
                  className="cursor-pointer"
                  onClick={() =>
                    changeFilter(() =>
                      setSeleccion("Todos")
                    )
                  }
                />
              </span>
            )}
          </div>
        </div>

        {/* CARDS */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-[22px] border border-monserrat-ink/8 bg-white shadow-[0_2px_16px_rgba(28,20,16,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(28,20,16,0.12)]"
            >
              <div className="relative h-56 w-full overflow-hidden bg-monserrat-cream/20">
                {item.fotoUrl ? (
                  <img
                    src={item.fotoUrl}
                    alt={item.nombre}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-monserrat-red text-white">
                    <span className="text-3xl font-black">{item.nombre.slice(0, 1)}</span>
                  </div>
                )}
              </div>

              <div className="p-5">
                <p className="text-[14px] font-black uppercase tracking-[0.06em] text-monserrat-ink">
                  {item.nombre}
                </p>
                <p className="mt-2 text-[12px] font-bold uppercase tracking-[0.16em] text-monserrat-ink/50">
                  {item.universidadSiglas}
                </p>
                <p className="mt-2 text-[13px] leading-snug text-monserrat-ink/80">
                  {item.carrera}
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full bg-monserrat-red/10 px-3 py-1 text-[11px] font-bold text-monserrat-red">
                    {item.anio}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-monserrat-ink/5 px-3 py-1 text-[11px] font-bold text-monserrat-ink">
                    <span className="h-2.5 w-2.5 rounded-full bg-monserrat-gold" />
                    {item.tipoSeleccion}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* SIN RESULTADOS */}
        {filtered.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-monserrat-ink/10 bg-white py-14 text-center">
            <p className="text-sm font-semibold text-monserrat-ink/60">
              No se encontraron ingresantes
            </p>

            <p className="mt-1 text-xs text-monserrat-ink/40">
              Intenta cambiar los filtros o el texto de búsqueda.
            </p>
          </div>
        )}

        {/* PAGINACIÓN */}
        {filtered.length > 0 && (
          <div className="mt-6">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onChange={setPage}
            />
          </div>
        )}
      </div>
    </section>
  );
}
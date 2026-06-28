import { BookOpen, GraduationCap, School, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";
import { ConfigPanel, SalonConfigPanel, AdminMetric } from "./adminComponents";
import {
  defaultAcademicoConfig,
  type AcademicoConfig,
  type ConfigView,
  type SalonItem,
} from "./adminShared";

type ConfiguracionTabProps = {
  academicoConfig: AcademicoConfig;
  saveAcademicoConfig: (next: AcademicoConfig) => void;
  updateSalonConfig: (target: SalonItem, patch: Partial<SalonItem>) => void;
  addSalonConfig: (nivel: string, grado: string, seccion: string, aula: string) => void;
  deleteSalonConfig: (target: SalonItem) => void;
  gradosActivosPorNivel: (nivel?: string) => string[];
  seccionesActivasPorNivel: (nivel?: string) => string[];
  labelAcademico: (id: string) => string;
  cursosPrimariaActivos: string[];
  cursosSecundariaActivos: string[];
};

export function ConfiguracionTab({
  academicoConfig,
  saveAcademicoConfig,
  updateSalonConfig,
  addSalonConfig,
  deleteSalonConfig,
  gradosActivosPorNivel,
  seccionesActivasPorNivel,
  labelAcademico,
  cursosPrimariaActivos,
  cursosSecundariaActivos,
}: ConfiguracionTabProps) {
  const [configView, setConfigView] = useState<ConfigView>("primaria-cursos");

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-4">
        <AdminMetric
          icon={<BookOpen size={18} />}
          label="Cursos primaria"
          value={String(cursosPrimariaActivos.length)}
        />
        <AdminMetric
          icon={<School size={18} />}
          label="Grados primaria"
          value={String(gradosActivosPorNivel("PRIMARIA").length)}
        />
        <AdminMetric
          icon={<GraduationCap size={18} />}
          label="Cursos secundaria"
          value={String(cursosSecundariaActivos.length)}
        />
        <AdminMetric
          icon={<Users size={18} />}
          label="Grados secundaria"
          value={String(gradosActivosPorNivel("SECUNDARIA").length)}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
        <div className="grid content-start gap-2 rounded-[16px] border border-monserrat-ink/8 bg-white p-3 shadow-sm">
          <p className="px-2 pt-1 text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">
            Primaria
          </p>
          {[
            {
              id: "primaria-cursos" as const,
              icon: <BookOpen size={16} />,
              title: "Cursos",
              count: academicoConfig.cursosPrimaria.length,
            },
            {
              id: "primaria-grados" as const,
              icon: <School size={16} />,
              title: "Grados",
              count: academicoConfig.gradosPrimaria.length,
            },
            {
              id: "primaria-secciones" as const,
              icon: <Users size={16} />,
              title: "Secciones",
              count: academicoConfig.seccionesPrimaria.length,
            },
            {
              id: "primaria-salones" as const,
              icon: <ShieldCheck size={16} />,
              title: "Salones",
              count: academicoConfig.salones.filter((salon) => salon.nivel === "PRIMARIA").length,
            },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setConfigView(item.id)}
              className={`flex items-center justify-between gap-3 rounded-[12px] px-3 py-3 text-left transition ${
                configView === item.id
                  ? "bg-monserrat-red text-white"
                  : "bg-monserrat-cream/45 text-monserrat-ink/65 hover:bg-monserrat-cream"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                {item.icon}
                <span className="truncate text-[13px] font-black">{item.title}</span>
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                  configView === item.id ? "bg-white/18" : "bg-white"
                }`}
              >
                {item.count}
              </span>
            </button>
          ))}
          <p className="px-2 pt-3 text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">
            Secundaria
          </p>
          {[
            {
              id: "secundaria-cursos" as const,
              icon: <BookOpen size={16} />,
              title: "Cursos",
              count: academicoConfig.cursosSecundaria.length,
            },
            {
              id: "secundaria-grados" as const,
              icon: <GraduationCap size={16} />,
              title: "Grados",
              count: academicoConfig.gradosSecundaria.length,
            },
            {
              id: "secundaria-secciones" as const,
              icon: <Users size={16} />,
              title: "Secciones",
              count: academicoConfig.seccionesSecundaria.length,
            },
            {
              id: "secundaria-salones" as const,
              icon: <ShieldCheck size={16} />,
              title: "Salones",
              count: academicoConfig.salones.filter((salon) => salon.nivel === "SECUNDARIA").length,
            },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setConfigView(item.id)}
              className={`flex items-center justify-between gap-3 rounded-[12px] px-3 py-3 text-left transition ${
                configView === item.id
                  ? "bg-monserrat-red text-white"
                  : "bg-monserrat-cream/45 text-monserrat-ink/65 hover:bg-monserrat-cream"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                {item.icon}
                <span className="truncate text-[13px] font-black">{item.title}</span>
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                  configView === item.id ? "bg-white/18" : "bg-white"
                }`}
              >
                {item.count}
              </span>
            </button>
          ))}

        </div>

        <div className="min-w-0">
          {configView === "primaria-cursos" && (
            <ConfigPanel
              title="Cursos de primaria"
              items={academicoConfig.cursosPrimaria}
              onChange={(items) => saveAcademicoConfig({ ...academicoConfig, cursosPrimaria: items })}
            />
          )}
          {configView === "primaria-secciones" && (
            <ConfigPanel
              title="Secciones de primaria"
              items={academicoConfig.seccionesPrimaria}
              onChange={(items) =>
                saveAcademicoConfig({ ...academicoConfig, seccionesPrimaria: items })
              }
            />
          )}
          {configView === "primaria-grados" && (
            <ConfigPanel
              title="Grados de primaria"
              items={academicoConfig.gradosPrimaria}
              onChange={(items) => saveAcademicoConfig({ ...academicoConfig, gradosPrimaria: items })}
            />
          )}
          {configView === "secundaria-cursos" && (
            <ConfigPanel
              title="Cursos de secundaria"
              items={academicoConfig.cursosSecundaria}
              onChange={(items) =>
                saveAcademicoConfig({ ...academicoConfig, cursosSecundaria: items })
              }
            />
          )}
          {configView === "secundaria-secciones" && (
            <ConfigPanel
              title="Secciones de secundaria"
              items={academicoConfig.seccionesSecundaria}
              onChange={(items) =>
                saveAcademicoConfig({ ...academicoConfig, seccionesSecundaria: items })
              }
            />
          )}
          {configView === "secundaria-grados" && (
            <ConfigPanel
              title="Grados de secundaria"
              items={academicoConfig.gradosSecundaria}
              onChange={(items) =>
                saveAcademicoConfig({ ...academicoConfig, gradosSecundaria: items })
              }
            />
          )}
          {(configView === "primaria-salones" || configView === "secundaria-salones") && (
            <SalonConfigPanel
              nivel={configView === "secundaria-salones" ? "SECUNDARIA" : "PRIMARIA"}
              salones={academicoConfig.salones.filter(
                (salon) =>
                  salon.nivel === (configView === "secundaria-salones" ? "SECUNDARIA" : "PRIMARIA")
              )}
              addSalon={(grado, seccion, aula) =>
                addSalonConfig(
                  configView === "secundaria-salones" ? "SECUNDARIA" : "PRIMARIA",
                  grado,
                  seccion,
                  aula
                )
              }
              updateSalon={updateSalonConfig}
              deleteSalon={deleteSalonConfig}
              gradosActivosPorNivel={gradosActivosPorNivel}
              seccionesActivas={seccionesActivasPorNivel(
                configView === "secundaria-salones" ? "SECUNDARIA" : "PRIMARIA"
              )}
              labelAcademico={labelAcademico}
            />
          )}
        </div>
      </div>
    </div>
  );
}

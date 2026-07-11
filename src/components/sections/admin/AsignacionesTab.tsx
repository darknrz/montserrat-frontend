import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Plus } from "lucide-react";
import { monserratApi } from "../../../api/monserrat";
import type { AsignacionAcademica, UsuarioAcademico } from "../../../types";
import {
  AdminField,
  RosterPanel,
  CompetenciaPickerModal,
  CompetenciaDocenteBoard,
  ElegirDocenteModal,
  matrixKey,
} from "./adminComponents";

import {
  NIVELES,
  defaultGrado,
  aulaPorGradoSeccion,
  labelFromEnum,
  type AcademicoConfig,
  getGradosPorNivelAcademico,
} from "./adminShared";

type AsignacionesTabProps = {
  usuariosAcademicos: UsuarioAcademico[];
  asignacionesAcademicas: AsignacionAcademica[];
  setAsignacionesAcademicas: React.Dispatch<React.SetStateAction<AsignacionAcademica[]>>;
  academicoConfig: AcademicoConfig;
  token: string;
  isBusy: boolean;
  runAdminAction: (action: () => Promise<void>, successMessage: string) => void;
  cursosActivosPorNivel: (nivel?: string) => string[];
  seccionesActivasPorNivel: (nivel?: string) => string[];
  gradosActivosPorNivel: (nivel?: string) => string[];
  salonesActivosPorNivel: (nivel?: string) => string[];
  labelAcademico: (id: string) => string;
  saveAcademicoConfig: (next: AcademicoConfig) => void;
};

const emptyAsignacion = {
  docenteDni: "",
  alumnoDni: "",
  curso: "MATEMATICA",
  nivelEducativo: "PRIMARIA",
  grado: "PRIMERO_PRIMARIA",
  seccion: "A",
  activo: true,
};

export function AsignacionesTab({
  usuariosAcademicos,
  asignacionesAcademicas,
  setAsignacionesAcademicas,
  academicoConfig,
  token,
  isBusy,
  runAdminAction,
  cursosActivosPorNivel,
  seccionesActivasPorNivel,
  gradosActivosPorNivel,
  salonesActivosPorNivel,
  labelAcademico,
  saveAcademicoConfig,
}: AsignacionesTabProps) {
  const [editingAsignacionAcademica, setEditingAsignacionAcademica] =
    useState<AsignacionAcademica | null>(null);
  const [asignacionAcademicaForm, setAsignacionAcademicaForm] = useState(emptyAsignacion);
  const [selectedNivelAcademico, setSelectedNivelAcademico] = useState<string>("");

  const getNivelesAcademicosPorNivelEducativo = (nivelEducativo: "PRIMARIA" | "SECUNDARIA") => {
    const todos = academicoConfig.nivelesAcademicos ?? [];
    return todos.filter((n) => {
      if (!n.active) return false;
      const grados = getGradosPorNivelAcademico(n.id);
      return grados.some((g) => {
        if (nivelEducativo === "PRIMARIA") {
          return g.endsWith("_PRIMARIA");
        } else {
          return g.endsWith("_SECUNDARIA");
        }
      });
    });
  };

  useEffect(() => {
    if (!selectedNivelAcademico && academicoConfig.nivelesAcademicos?.length) {
      const activeNiveles = getNivelesAcademicosPorNivelEducativo(
        asignacionAcademicaForm.nivelEducativo as "PRIMARIA" | "SECUNDARIA"
      );
      if (activeNiveles.length > 0) {
        setSelectedNivelAcademico(activeNiveles[0].id);
      }
    }
  }, [academicoConfig.nivelesAcademicos, asignacionAcademicaForm.nivelEducativo, selectedNivelAcademico]);

  // Synchronize selectedNivelAcademico when the selected grade changes
  useEffect(() => {
    const currentGrado = asignacionAcademicaForm.grado;
    if (!currentGrado) return;

    if (selectedNivelAcademico) {
      const gradesInCurrentLevel = getGradosPorNivelAcademico(selectedNivelAcademico);
      if (gradesInCurrentLevel.includes(currentGrado)) {
        return; // Already matched
      }
    }

    const levelsContainingGrado = (academicoConfig.nivelesAcademicos ?? []).filter((n) =>
      n.active && getGradosPorNivelAcademico(n.id).includes(currentGrado)
    );
    if (levelsContainingGrado.length > 0) {
      setSelectedNivelAcademico(levelsContainingGrado[0].id);
    }
  }, [asignacionAcademicaForm.grado, academicoConfig.nivelesAcademicos, selectedNivelAcademico]);

  const handleNivelAcademicoSelect = (nivelAcademicoId: string) => {
    setSelectedNivelAcademico(nivelAcademicoId);
    const educationalLevel = asignacionAcademicaForm.nivelEducativo;
    const matchingGrados = getGradosPorNivelAcademico(nivelAcademicoId).filter(g => 
      educationalLevel === "SECUNDARIA" ? g.endsWith("_SECUNDARIA") : g.endsWith("_PRIMARIA")
    );
    if (matchingGrados.length > 0) {
      const targetGrado = matchingGrados[0];
      if (educationalLevel === "SECUNDARIA") {
        handleGradoSelectSecundaria(targetGrado);
      } else {
        handleGradoSelect(targetGrado);
      }
    }
  };
  const [aulaNumero, setAulaNumero] = useState("101");
  const [tutorSecundariaDni, setTutorSecundariaDni] = useState("");
  const [selectedCompetenciaPorCurso, setSelectedCompetenciaPorCurso] = useState<Record<string, string>>({});
  const [selectedCompetenciaPorCursoSecundaria, setSelectedCompetenciaPorCursoSecundaria] = useState<Record<string, string>>({});
  const [addingCompetenciaCurso, setAddingCompetenciaCurso] = useState<string | null>(null);
  const [addingCompetenciaCursoSecundaria, setAddingCompetenciaCursoSecundaria] = useState<string | null>(null);
  const [elegirDocenteFor, setElegirDocenteFor] = useState<string | null>(null);
  const [elegirDocenteForSecundaria, setElegirDocenteForSecundaria] = useState<string | null>(null);

  useEffect(() => {
    const matchingSalon = academicoConfig.salones.find(
      (s) =>
        s.nivel === asignacionAcademicaForm.nivelEducativo &&
        s.grado === asignacionAcademicaForm.grado &&
        s.seccion === asignacionAcademicaForm.seccion
    );
    if (matchingSalon) {
      setAulaNumero(matchingSalon.aula);
    } else {
      const activeSalons = academicoConfig.salones.filter(
        (s) => s.active && s.nivel === asignacionAcademicaForm.nivelEducativo
      );
      setAulaNumero(activeSalons[0]?.aula ?? "");
    }
  }, [
    academicoConfig.salones,
    asignacionAcademicaForm.nivelEducativo,
    asignacionAcademicaForm.grado,
    asignacionAcademicaForm.seccion,
  ]);

  const docentes = useMemo(
    () => usuariosAcademicos.filter((u) => u.rol === "DOCENTE"),
    [usuariosAcademicos]
  );
  const alumnos = useMemo(
    () => usuariosAcademicos.filter((u) => u.rol === "ALUMNO"),
    [usuariosAcademicos]
  );
  const docentesPrimaria = useMemo(
    () =>
      docentes.filter((u) => {
        const nivel = (u.nivelEducativo ?? "").toUpperCase();
        return nivel === "PRIMARIA" || (!nivel && u.rol === "DOCENTE");
      }),
    [docentes]
  );
  const docentesSecundaria = useMemo(
    () =>
      docentes.filter((u) => {
        const nivel = (u.nivelEducativo ?? "").toUpperCase();
        return nivel === "SECUNDARIA" || (!nivel && u.rol === "DOCENTE");
      }),
    [docentes]
  );

  const alumnosDelAula = useMemo(
    () =>
      alumnos.filter(
        (u) =>
          u.nivelEducativo === asignacionAcademicaForm.nivelEducativo &&
          u.grado === asignacionAcademicaForm.grado &&
          u.seccion === asignacionAcademicaForm.seccion
      ),
    [alumnos, asignacionAcademicaForm.grado, asignacionAcademicaForm.nivelEducativo, asignacionAcademicaForm.seccion]
  );

  const docentesDelCurso = useMemo(() => {
    const docentesBase =
      asignacionAcademicaForm.nivelEducativo !== "SECUNDARIA" ? docentesPrimaria : docentesSecundaria;

    if (!asignacionAcademicaForm.curso) return docentesBase;

    const docentesFiltrados = docentesBase.filter((u) => {
      const materia = (u.materia ?? "").trim().toUpperCase();
      const curso = asignacionAcademicaForm.curso?.trim().toUpperCase();
      return !materia || materia === curso;
    });

    return docentesFiltrados.length > 0 ? docentesFiltrados : docentesBase;
  }, [asignacionAcademicaForm.curso, asignacionAcademicaForm.nivelEducativo, docentesPrimaria, docentesSecundaria]);

  const asignacionesDelAula = useMemo(
    () =>
      asignacionesAcademicas.filter(
        (a) =>
          a.nivelEducativo === asignacionAcademicaForm.nivelEducativo &&
          a.grado === asignacionAcademicaForm.grado &&
          a.seccion === asignacionAcademicaForm.seccion
      ),
    [asignacionesAcademicas, asignacionAcademicaForm.grado, asignacionAcademicaForm.nivelEducativo, asignacionAcademicaForm.seccion]
  );

  const profesoresDelAula = useMemo(() => {
    const byDni = new Map<string, AsignacionAcademica>();
    asignacionesDelAula.forEach((asignacion) => byDni.set(asignacion.docenteDni, asignacion));
    return Array.from(byDni.values());
  }, [asignacionesDelAula]);

  const tutorSecundariaVisible = useMemo(() => {
    const selected = docentesSecundaria.find((docente) => docente.dni === tutorSecundariaDni);
    return selected?.nombre ?? profesoresDelAula[0]?.docenteNombre ?? "Sin tutor";
  }, [docentesSecundaria, profesoresDelAula, tutorSecundariaDni]);

  const cursosPrimariaActivos = useMemo(
    () => academicoConfig.cursosPrimaria.filter((item) => item.active).map((item) => item.id),
    [academicoConfig.cursosPrimaria]
  );

  const competenciasPrimaria = useMemo(
    () => academicoConfig.competenciasPrimaria.filter((item) => item.active),
    [academicoConfig.competenciasPrimaria]
  );

  // Mapa curso -> ids de competencias vinculadas a esa área curricular.
  // Cada competencia solo puede estar en UN curso a la vez (ver
  // toggleCompetenciaForCurso más abajo, que garantiza esa exclusividad).
  const competenciasPorCurso = academicoConfig.competenciasPorCursoPrimaria ?? {};

  // Competencias vinculadas al área curricular seleccionada (columna 3).
  // Si el área no tiene ninguna vinculada, queda vacía y se ofrece "Vincular".
  const competenciasDelCurso = useMemo(() => {
    if (!asignacionAcademicaForm.curso) return [];
    const ids = competenciasPorCurso[asignacionAcademicaForm.curso] ?? [];
    return competenciasPrimaria.filter((c) => ids.includes(c.id));
  }, [competenciasPorCurso, competenciasPrimaria, asignacionAcademicaForm.curso]);

  const cursoActual = asignacionAcademicaForm.curso ?? "";
  const selectedCompetencia = selectedCompetenciaPorCurso[cursoActual] ?? "";

  useEffect(() => {
    if (!cursoActual) return;

    const competenciasIds = competenciasDelCurso.map((c) => c.id);
    const seleccionActual = selectedCompetenciaPorCurso[cursoActual] ?? "";

    if (seleccionActual && competenciasIds.includes(seleccionActual)) return;

    const siguienteCompetencia = competenciasIds[0] ?? "";
    setSelectedCompetenciaPorCurso((prev) => {
      if (prev[cursoActual] === siguienteCompetencia) return prev;
      return { ...prev, [cursoActual]: siguienteCompetencia };
    });
  }, [competenciasDelCurso, cursoActual, selectedCompetenciaPorCurso]);

  // SECUNDARIA - Competencias
  const cursosSecundariaActivos = useMemo(
    () => academicoConfig.cursosSecundaria.filter((item) => item.active).map((item) => item.id),
    [academicoConfig.cursosSecundaria]
  );

  const competenciasSecundaria = useMemo(
    () => academicoConfig.competenciasSecundaria.filter((item) => item.active),
    [academicoConfig.competenciasSecundaria]
  );

  // Mapa curso -> ids de competencias vinculadas a esa área curricular en secundaria
  const competenciasPorCursoSecundaria = academicoConfig.competenciasPorCursoSecundaria ?? {};

  // Competencias vinculadas al área curricular seleccionada en secundaria
  const competenciasDelCursoSecundaria = useMemo(() => {
    if (!asignacionAcademicaForm.curso) return [];
    const ids = competenciasPorCursoSecundaria[asignacionAcademicaForm.curso] ?? [];
    return competenciasSecundaria.filter((c) => ids.includes(c.id));
  }, [competenciasPorCursoSecundaria, competenciasSecundaria, asignacionAcademicaForm.curso]);

  const cursoActualSecundaria = asignacionAcademicaForm.curso ?? "";
  const selectedCompetenciaSecundaria = selectedCompetenciaPorCursoSecundaria[cursoActualSecundaria] ?? "";

  useEffect(() => {
    if (!cursoActualSecundaria || asignacionAcademicaForm.nivelEducativo !== "SECUNDARIA") return;

    const competenciasIds = competenciasDelCursoSecundaria.map((c) => c.id);
    const seleccionActual = selectedCompetenciaPorCursoSecundaria[cursoActualSecundaria] ?? "";

    if (seleccionActual && competenciasIds.includes(seleccionActual)) return;

    const siguienteCompetencia = competenciasIds[0] ?? "";
    setSelectedCompetenciaPorCursoSecundaria((prev) => {
      if (prev[cursoActualSecundaria] === siguienteCompetencia) return prev;
      return { ...prev, [cursoActualSecundaria]: siguienteCompetencia };
    });
  }, [competenciasDelCursoSecundaria, cursoActualSecundaria, selectedCompetenciaPorCursoSecundaria, asignacionAcademicaForm.nivelEducativo]);

  // Asignación docente por (grado, curso, competencia) -> dni, vive en academicoConfig
  const docentesPorCompetencia = academicoConfig.docentesPorCompetencia ?? {};

  const claveActual = useMemo(
    () => matrixKey(asignacionAcademicaForm.grado ?? "", asignacionAcademicaForm.curso ?? "", selectedCompetencia),
    [asignacionAcademicaForm.grado, asignacionAcademicaForm.curso, selectedCompetencia]
  );

  const docenteAsignadoActual = docentesPorCompetencia[claveActual];

  const docentePrimariaVisible = useMemo(() => {
    if (!selectedCompetencia) return "Selecciona una competencia";
    const docente = docentesPrimaria.find((d) => d.dni === docenteAsignadoActual);
    return docente?.nombre ?? "Sin docente asignado";
  }, [docenteAsignadoActual, docentesPrimaria, selectedCompetencia]);

  // SECUNDARIA - Mapeos de docentes por competencia
  const docentesPorCompetenciaSecundaria = academicoConfig.docentesPorCompetenciaSecundaria ?? {};

  const claveActualSecundaria = useMemo(
    () => matrixKey(asignacionAcademicaForm.grado ?? "", asignacionAcademicaForm.curso ?? "", selectedCompetenciaSecundaria),
    [asignacionAcademicaForm.grado, asignacionAcademicaForm.curso, selectedCompetenciaSecundaria]
  );

  const docenteAsignadoActualSecundaria = docentesPorCompetenciaSecundaria[claveActualSecundaria];

  const docenteSecundariaVisible = useMemo(() => {
    if (!selectedCompetenciaSecundaria) return "Selecciona una competencia";
    const docente = docentesSecundaria.find((d) => d.dni === docenteAsignadoActualSecundaria);
    return docente?.nombre ?? "Sin docente asignado";
  }, [docenteAsignadoActualSecundaria, docentesSecundaria, selectedCompetenciaSecundaria]);

  const autocompletarPorGradoYSeccion = (grado: string, seccion: string, nivel: string) => {
    const matchingSalon = academicoConfig.salones.find(
      (s) => s.nivel === nivel && s.grado === grado && s.seccion === seccion
    );
    const aula = matchingSalon ? matchingSalon.aula : aulaPorGradoSeccion(nivel, grado, seccion);
    setAulaNumero(aula);

    if (nivel === "PRIMARIA") {
      const curso = asignacionAcademicaForm.curso || cursosActivosPorNivel("PRIMARIA")[0] || "MATEMATICA";
      setAsignacionAcademicaForm({
        ...asignacionAcademicaForm,
        nivelEducativo: "PRIMARIA",
        grado,
        seccion,
        curso,
      });
    } else {
      // SECUNDARIA
      const curso = asignacionAcademicaForm.curso || "MATEMATICA";
      const asignacionCurso = asignacionesAcademicas.find(
        (a) =>
          a.nivelEducativo === "SECUNDARIA" &&
          a.grado === grado &&
          a.seccion === seccion &&
          a.curso === curso &&
          a.activo
      );

      const tutorAula = asignacionesAcademicas.find(
        (a) =>
          a.nivelEducativo === "SECUNDARIA" &&
          a.grado === grado &&
          a.seccion === seccion &&
          a.activo
      );

      setTutorSecundariaDni(tutorAula?.docenteDni ?? "");

      const docenteCurso = docentesSecundaria.find((docente) => docente.materia === curso);

      setAsignacionAcademicaForm({
        ...asignacionAcademicaForm,
        nivelEducativo: "SECUNDARIA",
        grado,
        seccion,
        curso,
        docenteDni: asignacionCurso?.docenteDni ?? docenteCurso?.dni ?? "",
      });
    }
  };

  const handleSalonChange = (aula: string) => {
    setAulaNumero(aula);
    const matchingSalon = academicoConfig.salones.find((s) => s.aula === aula);
    if (matchingSalon) {
      autocompletarPorGradoYSeccion(
        matchingSalon.grado,
        matchingSalon.seccion,
        matchingSalon.nivel
      );
    }
  };

  const submitAsignacionAcademica = (e: FormEvent) => {
    e.preventDefault();
    runAdminAction(async () => {
      const nivelEducativo = asignacionAcademicaForm.nivelEducativo ?? "PRIMARIA";
      if (editingAsignacionAcademica) {
        await monserratApi.updateAsignacionAcademica(
          editingAsignacionAcademica.id,
          {
            docenteDni: asignacionAcademicaForm.docenteDni,
            alumnoDni: asignacionAcademicaForm.alumnoDni,
            curso: asignacionAcademicaForm.curso,
            nivelEducativo,
            grado: asignacionAcademicaForm.grado ?? "",
            seccion: asignacionAcademicaForm.seccion ?? "",
            activo: asignacionAcademicaForm.activo,
          },
          token
        );
      } else {
        await monserratApi.createAsignacionAula(
          {
            docenteDni: asignacionAcademicaForm.docenteDni,
            curso: asignacionAcademicaForm.curso,
            nivelEducativo,
            grado: asignacionAcademicaForm.grado ?? "",
            seccion: asignacionAcademicaForm.seccion ?? "",
            activo: asignacionAcademicaForm.activo,
          },
          token
        );
      }

      const nextSalones = academicoConfig.salones.map((s) => {
        if (s.aula === aulaNumero && s.nivel === nivelEducativo) {
          return {
            ...s,
            grado: asignacionAcademicaForm.grado ?? "",
            seccion: asignacionAcademicaForm.seccion ?? "",
          };
        }
        if (
          s.grado === asignacionAcademicaForm.grado &&
          s.seccion === asignacionAcademicaForm.seccion &&
          s.nivel === nivelEducativo
        ) {
          return { ...s, grado: "", seccion: "" };
        }
        return s;
      });

      saveAcademicoConfig({
        ...academicoConfig,
        salones: nextSalones,
      });

      setAsignacionesAcademicas(await monserratApi.asignacionesAcademicas(token));
      setEditingAsignacionAcademica(null);
      setAsignacionAcademicaForm(emptyAsignacion);
    }, "Asignacion academica guardada");
  };

  const cursosDelAula = useMemo(
    () =>
      cursosActivosPorNivel(asignacionAcademicaForm.nivelEducativo).map((curso) => {
        const asignacion = asignacionesDelAula.find((item) => item.curso === curso);
        return {
          id: curso,
          title: labelAcademico(curso),
          detail: asignacion?.docenteNombre ?? "Sin docente asignado",
          raw: asignacion,
        };
      }),
    [asignacionesDelAula, asignacionAcademicaForm.nivelEducativo, cursosActivosPorNivel, labelAcademico]
  );

  // Vincula/desvincula una competencia a un área curricular de PRIMARIA.
  // Como cada competencia solo puede pertenecer a UN área a la vez, si ya
  // estaba vinculada a otra área, se quita de ahí automáticamente antes de
  // agregarla aquí (efecto "mover" en un solo clic).
  const toggleCompetenciaForCurso = (curso: string, competenciaId: string) => {
    if (!curso) return;
    const map: Record<string, string[]> = {};
    Object.entries(competenciasPorCurso).forEach(([cursoId, ids]) => {
      map[cursoId] = [...(ids ?? [])];
    });

    const destino = new Set(map[curso] ?? []);

    if (destino.has(competenciaId)) {
      destino.delete(competenciaId);
    } else {
      Object.keys(map).forEach((otroCurso) => {
        if (otroCurso !== curso) {
          map[otroCurso] = map[otroCurso].filter((id) => id !== competenciaId);
        }
      });
      destino.add(competenciaId);
    }

    map[curso] = Array.from(destino);
    saveAcademicoConfig({ ...academicoConfig, competenciasPorCursoPrimaria: map });
  };

  const asignarDocenteCompetencia = (docenteDni: string) => {
    if (!asignacionAcademicaForm.grado || !asignacionAcademicaForm.curso || !selectedCompetencia) return;
    const key = matrixKey(asignacionAcademicaForm.grado, asignacionAcademicaForm.curso, selectedCompetencia);
    const next = { ...(academicoConfig.docentesPorCompetencia ?? {}) };
    if (docenteDni) {
      next[key] = docenteDni;
    } else {
      delete next[key];
    }
    saveAcademicoConfig({ ...academicoConfig, docentesPorCompetencia: next });
  };

  const labelDocenteAsignado = (dni: string) =>
    docentesPrimaria.find((d) => d.dni === dni)?.nombre ?? dni;

  const asignarDocenteParaCompetencia = (competenciaId: string, docenteDni: string) => {
    if (!asignacionAcademicaForm.grado || !asignacionAcademicaForm.curso) return;
    const key = matrixKey(asignacionAcademicaForm.grado, asignacionAcademicaForm.curso, competenciaId);
    const next = { ...(academicoConfig.docentesPorCompetencia ?? {}) };
    if (docenteDni) {
      next[key] = docenteDni;
    } else {
      delete next[key];
    }
    saveAcademicoConfig({ ...academicoConfig, docentesPorCompetencia: next });
  };

  // Igual que toggleCompetenciaForCurso pero para SECUNDARIA.
  const toggleCompetenciaForCursoSecundaria = (curso: string, competenciaId: string) => {
    if (!curso) return;
    const map: Record<string, string[]> = {};
    Object.entries(competenciasPorCursoSecundaria).forEach(([cursoId, ids]) => {
      map[cursoId] = [...(ids ?? [])];
    });

    const destino = new Set(map[curso] ?? []);

    if (destino.has(competenciaId)) {
      destino.delete(competenciaId);
    } else {
      Object.keys(map).forEach((otroCurso) => {
        if (otroCurso !== curso) {
          map[otroCurso] = map[otroCurso].filter((id) => id !== competenciaId);
        }
      });
      destino.add(competenciaId);
    }

    map[curso] = Array.from(destino);
    saveAcademicoConfig({ ...academicoConfig, competenciasPorCursoSecundaria: map });
  };

  const labelDocenteAsignadoSecundaria = (dni: string) =>
    docentesSecundaria.find((d) => d.dni === dni)?.nombre ?? dni;

  const asignarDocenteParaCompetenciaSecundaria = (competenciaId: string, docenteDni: string) => {
    if (!asignacionAcademicaForm.grado || !asignacionAcademicaForm.curso) return;
    const key = matrixKey(asignacionAcademicaForm.grado, asignacionAcademicaForm.curso, competenciaId);
    const next = { ...(academicoConfig.docentesPorCompetenciaSecundaria ?? {}) };
    if (docenteDni) {
      next[key] = docenteDni;
    } else {
      delete next[key];
    }
    saveAcademicoConfig({ ...academicoConfig, docentesPorCompetenciaSecundaria: next });
  };

  const handleGradoSelect = (gradoId: string) => {
    const seccion = "A";
    const nivel = "PRIMARIA";
    setAsignacionAcademicaForm({
      ...asignacionAcademicaForm,
      nivelEducativo: nivel,
      grado: gradoId,
      seccion,
    });
    setAulaNumero(aulaPorGradoSeccion(nivel, gradoId, seccion));
  };

  const handleGradoSelectSecundaria = (gradoId: string) => {
    const seccion = "A";
    const nivel = "SECUNDARIA";
    const curso = asignacionAcademicaForm.curso || cursosActivosPorNivel("SECUNDARIA")[0] || "MATEMATICA";
    setAsignacionAcademicaForm({
      ...asignacionAcademicaForm,
      nivelEducativo: nivel,
      grado: gradoId,
      seccion,
      curso,
    });
    setAulaNumero(aulaPorGradoSeccion(nivel, gradoId, seccion));
  };

  const handleAreaSelect = (curso: string) => {
    setAsignacionAcademicaForm({ ...asignacionAcademicaForm, curso });
  };

  const handleEditClick = (item: AsignacionAcademica) => {
    setEditingAsignacionAcademica(item);
    setAsignacionAcademicaForm({
      docenteDni: item.docenteDni,
      alumnoDni: item.alumnoDni ?? "",
      curso: item.curso ?? "MATEMATICA",
      nivelEducativo: item.nivelEducativo ?? "PRIMARIA",
      grado: item.grado ?? "PRIMERO_PRIMARIA",
      seccion: item.seccion ?? "A",
      activo: item.activo ?? true,
    });
  };

  const esSecundaria = asignacionAcademicaForm.nivelEducativo === "SECUNDARIA";

  const cambiarNivel = (nivel: "PRIMARIA" | "SECUNDARIA") => {
    const niveles = getNivelesAcademicosPorNivelEducativo(nivel);
    const defaultNivelAcademico = niveles[0]?.id ?? "";
    setSelectedNivelAcademico(defaultNivelAcademico);

    const matchingGrados = defaultNivelAcademico 
      ? getGradosPorNivelAcademico(defaultNivelAcademico).filter(g => 
          nivel === "SECUNDARIA" ? g.endsWith("_SECUNDARIA") : g.endsWith("_PRIMARIA")
        )
      : [];
    const grado = matchingGrados[0] ?? (nivel === "PRIMARIA" ? "PRIMERO_PRIMARIA" : "PRIMERO_SECUNDARIA");
    const curso = asignacionAcademicaForm.curso || cursosActivosPorNivel(nivel)[0] || "MATEMATICA";

    setAsignacionAcademicaForm({
      ...asignacionAcademicaForm,
      nivelEducativo: nivel,
      grado,
      curso,
    });

    if (nivel === "PRIMARIA") {
      setSelectedCompetenciaPorCurso({});
    } else {
      setSelectedCompetenciaPorCursoSecundaria({});
    }
    setAulaNumero(aulaPorGradoSeccion(nivel, grado, "A"));
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Selector de Nivel */}
      <div className="flex gap-3 pb-4 border-b border-monserrat-ink/10 mb-4 flex-none">
        <button
          onClick={() => cambiarNivel("PRIMARIA")}
          className={`px-5 py-2 rounded-xl text-xs font-black tracking-wide uppercase transition-all duration-300 ${
            !esSecundaria
              ? "bg-monserrat-red text-white shadow-md shadow-monserrat-red/10 scale-105"
              : "bg-monserrat-cream/40 text-monserrat-ink/60 border border-monserrat-ink/8 hover:bg-monserrat-cream/70 hover:text-monserrat-ink"
          }`}
        >
          Primaria
        </button>
        <button
          onClick={() => cambiarNivel("SECUNDARIA")}
          className={`px-5 py-2 rounded-xl text-xs font-black tracking-wide uppercase transition-all duration-300 ${
            esSecundaria
              ? "bg-monserrat-red text-white shadow-md shadow-monserrat-red/10 scale-105"
              : "bg-monserrat-cream/40 text-monserrat-ink/60 border border-monserrat-ink/8 hover:bg-monserrat-cream/70 hover:text-monserrat-ink"
          }`}
        >
          Secundaria
        </button>
      </div>

      <div className="grid gap-5 flex-1 min-h-0 pt-4">
        <div className="grid grid-rows-[auto_1fr] gap-4 h-full min-h-0">

          {esSecundaria ? (
            <div className="grid min-h-0 gap-4 lg:grid-cols-[1fr_1fr_1fr_2fr] h-full">
              <RosterPanel
                title="Nivel Académico"
                empty="No hay niveles académicos activos"
                rows={getNivelesAcademicosPorNivelEducativo("SECUNDARIA").map((n) => ({
                  id: n.id,
                  title: n.label,
                  detail: n.id,
                  raw: n.id,
                }))}
                selectedId={selectedNivelAcademico}
                onSelect={(id) => handleNivelAcademicoSelect(id)}
                className="h-full min-h-0"
                bodyClassName="max-h-none"
              />
              <RosterPanel
                title="Grados"
                empty="No hay grados activos"
                rows={academicoConfig.gradosSecundaria
                  .filter((g) => g.active)
                  .map((grado) => ({
                    id: grado.id,
                    title: labelAcademico(grado.id),
                    detail: grado.label,
                    raw: grado.id,
                  }))}
                selectedId={asignacionAcademicaForm.grado}
                onSelect={(grado) => handleGradoSelectSecundaria(grado)}
                className="h-full min-h-0"
                bodyClassName="max-h-none"
              />
              <RosterPanel
                title="Áreas curriculares"
                empty="No hay áreas activas"
                rows={cursosSecundariaActivos.map((curso) => {
                  const vinculadas = (competenciasPorCursoSecundaria[curso] ?? []).length;
                  return {
                    id: curso,
                    title: labelAcademico(curso),
                    detail: vinculadas > 0 ? `${vinculadas} competencia(s) vinculada(s)` : "Sin competencias vinculadas",
                    raw: curso,
                  };
                })}
                selectedId={asignacionAcademicaForm.curso}
                onSelect={(curso) => handleAreaSelect(curso)}
                className="h-full min-h-0"
                bodyClassName="max-h-none"
              />
              <CompetenciaDocenteBoard
                competencias={competenciasDelCursoSecundaria}
                docentesPorCompetencia={docentesPorCompetenciaSecundaria}
                grado={asignacionAcademicaForm.grado ?? ""}
                curso={asignacionAcademicaForm.curso ?? ""}
                labelDocenteAsignado={labelDocenteAsignadoSecundaria}
                onEditRow={(competenciaId) => setElegirDocenteForSecundaria(competenciaId)}
                onEditCompetencia={() => {
                  if (asignacionAcademicaForm.curso) setAddingCompetenciaCursoSecundaria(asignacionAcademicaForm.curso);
                }}
              />
            </div>
          ) : (
            <div className="grid min-h-0 gap-4 lg:grid-cols-[1fr_1fr_1fr_2fr] h-full">
              <RosterPanel
                title="Nivel Académico"
                empty="No hay niveles académicos activos"
                rows={getNivelesAcademicosPorNivelEducativo("PRIMARIA").map((n) => ({
                  id: n.id,
                  title: n.label,
                  detail: n.id,
                  raw: n.id,
                }))}
                selectedId={selectedNivelAcademico}
                onSelect={(id) => handleNivelAcademicoSelect(id)}
                className="h-full min-h-0"
                bodyClassName="max-h-none"
              />
              <RosterPanel
                title="Grados"
                empty="No hay grados activos"
                rows={academicoConfig.gradosPrimaria
                  .filter((g) => g.active)
                  .map((grado) => ({
                    id: grado.id,
                    title: labelAcademico(grado.id),
                    detail: grado.label,
                    raw: grado.id,
                  }))}
                selectedId={asignacionAcademicaForm.grado}
                onSelect={(grado) => handleGradoSelect(grado)}
                className="h-full min-h-0"
                bodyClassName="max-h-none"
              />
              <RosterPanel
                title="Áreas curriculares"
                empty="No hay áreas activas"
                rows={cursosPrimariaActivos.map((curso) => {
                  const vinculadas = (competenciasPorCurso[curso] ?? []).length;
                  return {
                    id: curso,
                    title: labelAcademico(curso),
                    detail: vinculadas > 0 ? `${vinculadas} competencia(s) vinculada(s)` : "Sin competencias vinculadas",
                    raw: curso,
                  };
                })}
                selectedId={asignacionAcademicaForm.curso}
                onSelect={(curso) => handleAreaSelect(curso)}
                className="h-full min-h-0"
                bodyClassName="max-h-none"
              />
              <CompetenciaDocenteBoard
                competencias={competenciasDelCurso}
                docentesPorCompetencia={docentesPorCompetencia}
                grado={asignacionAcademicaForm.grado ?? ""}
                curso={asignacionAcademicaForm.curso ?? ""}
                labelDocenteAsignado={labelDocenteAsignado}
                onEditRow={(competenciaId) => setElegirDocenteFor(competenciaId)}
                onEditCompetencia={() => {
                  if (asignacionAcademicaForm.curso) setAddingCompetenciaCurso(asignacionAcademicaForm.curso);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {addingCompetenciaCurso && (
        <CompetenciaPickerModal
          curso={addingCompetenciaCurso}
          catalogo={competenciasPrimaria}
          competenciasPorCurso={competenciasPorCurso}
          labelAcademico={labelAcademico}
          onToggle={(competenciaId) => toggleCompetenciaForCurso(addingCompetenciaCurso, competenciaId)}
          onClose={() => setAddingCompetenciaCurso(null)}
        />
      )}

      {elegirDocenteFor && (
        <ElegirDocenteModal
          competenciaLabel={competenciasDelCurso.find((c) => c.id === elegirDocenteFor)?.label ?? ""}
          docentes={docentesDelCurso.map((d) => ({ dni: d.dni, nombre: d.nombre }))}
          docenteActualDni={docentesPorCompetencia[matrixKey(asignacionAcademicaForm.grado ?? "", asignacionAcademicaForm.curso ?? "", elegirDocenteFor)]}
          onSelect={(dni) => {
            asignarDocenteParaCompetencia(elegirDocenteFor, dni);
            setElegirDocenteFor(null);
          }}
          onClose={() => setElegirDocenteFor(null)}
        />
      )}

      {addingCompetenciaCursoSecundaria && (
        <CompetenciaPickerModal
          curso={addingCompetenciaCursoSecundaria}
          catalogo={competenciasSecundaria}
          competenciasPorCurso={competenciasPorCursoSecundaria}
          labelAcademico={labelAcademico}
          onToggle={(competenciaId) => toggleCompetenciaForCursoSecundaria(addingCompetenciaCursoSecundaria, competenciaId)}
          onClose={() => setAddingCompetenciaCursoSecundaria(null)}
        />
      )}

      {elegirDocenteForSecundaria && (
        <ElegirDocenteModal
          competenciaLabel={competenciasDelCursoSecundaria.find((c) => c.id === elegirDocenteForSecundaria)?.label ?? ""}
          docentes={docentesDelCurso.map((d) => ({ dni: d.dni, nombre: d.nombre }))}
          docenteActualDni={docentesPorCompetenciaSecundaria[matrixKey(asignacionAcademicaForm.grado ?? "", asignacionAcademicaForm.curso ?? "", elegirDocenteForSecundaria)]}
          onSelect={(dni) => {
            asignarDocenteParaCompetenciaSecundaria(elegirDocenteForSecundaria, dni);
            setElegirDocenteForSecundaria(null);
          }}
          onClose={() => setElegirDocenteForSecundaria(null)}
        />
      )}
    </div>
  );
}
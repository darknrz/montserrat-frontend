import { useCallback, useEffect, useMemo, useState } from "react";
import { monserratApi } from "./api/monserrat";
import { ChatbotButton } from "./components/chatbot/ChatbotButton";
import { ChatbotWindow } from "./components/chatbot/ChatbotWindow";
import { Layout } from "./components/layout/Layout";
import { AccessGatewayPage } from "./components/sections/AccessGatewayPage";
import { AdminPage } from "./components/sections/AdminPage";
import { AnnouncementPopup } from "./components/sections/AnnouncementPopup";
import { Carrusel } from "./components/sections/Carrusel";
import { DatosGenerales } from "./components/sections/DatosGenerales";
import { Hero } from "./components/sections/Hero";
import { Ingresantes } from "./components/sections/Ingresantes";
import { PasswordResetPage } from "./components/sections/PasswordResetPage";
import { PortalAcademicoPage } from "./components/sections/PortalAcademicoPage";
import { Ubicacion } from "./components/sections/Ubicacion";
import { EstadoAmable } from "./components/ui/EstadoAmable";
import { Skeleton } from "./components/ui/Skeleton";
import { useChatbot } from "./hooks/useChatbot";
import { seccionesVisibles } from "./lib/sitioPublico";
import type { Anuncio, Ingresante, Institution, RedSocial, Video } from "./types";
import { isAdminRole } from "./types";

function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [ingresantes, setIngresantes] = useState<Ingresante[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [redes, setRedes] = useState<RedSocial[]>([]);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [showAnnouncementPopup, setShowAnnouncementPopup] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chatbot = useChatbot();

  // ✅ useMemo movido aquí, antes de cualquier return condicional
  const popupAnnouncements = useMemo(
    () => anuncios.filter((anuncio) => anuncio.mostrarEnPopup !== false),
    [anuncios]
  );

  const loadPageData = useCallback(async () => {
    // Solo la institución es imprescindible: si falla alguna otra fuente (videos, redes…), esa parte del
    // sitio se oculta en silencio en vez de romper toda la página.
    const [institutionRes, ingresantesRes, videosRes, redesRes, anunciosRes] = await Promise.allSettled([
      monserratApi.institution(),
      monserratApi.ingresantes(),
      monserratApi.videos(),
      monserratApi.redesSociales(),
      monserratApi.anuncios(),
    ]);
    if (institutionRes.status !== "fulfilled") throw institutionRes.reason;

    const lista = <T,>(res: PromiseSettledResult<T[]>): T[] => (res.status === "fulfilled" && Array.isArray(res.value) ? res.value : []);

    setInstitution(institutionRes.value);
    setIngresantes(lista(ingresantesRes).filter((item) => item.activo !== false));
    setVideos(lista(videosRes).filter((item) => item.activo !== false).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
    setRedes(lista(redesRes).filter((item) => item.activo !== false).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
    setAnuncios(lista(anunciosRes).filter((item) => item.activo !== false));
    setShowAnnouncementPopup(true);
    setError(null);
  }, []);

  const secciones = useMemo(() => seccionesVisibles(institution, ingresantes, videos), [institution, ingresantes, videos]);

  const navigateTo = useCallback((path: string) => {
    window.history.pushState({}, "", path);
    setPathname(path);
  }, []);

  const readSession = useCallback((key: string) => {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) as { rol?: string } : null;
  }, []);

  useEffect(() => {
    void loadPageData().catch((requestError: unknown) => {
      setError(requestError instanceof Error ? requestError.message : "No se pudo conectar con el backend");
    }).finally(() => {
      setIsLoading(false);
    });
  }, [loadPageData]);

  const reintentar = useCallback(() => {
    setIsLoading(true);
    setError(null);
    void loadPageData()
      .catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : "No se pudo conectar con el servidor");
      })
      .finally(() => setIsLoading(false));
  }, [loadPageData]);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // ✅ Returns condicionales DESPUÉS de todos los hooks
  if (isLoading) {
    // Esqueleto color crema con la forma de la página: no hay saltos de diseño cuando llegan los datos.
    return (
      <div className="kid-page min-h-screen" role="status" aria-label="Cargando">
        <div className="flex h-16 items-center justify-between border-b-2 border-monserrat-gold/25 bg-[#fffaf0]/85 px-6">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="hidden h-9 w-80 lg:block" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 pt-24 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-4">
            <Skeleton className="h-7 w-56 !rounded-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-4/5" />
            <Skeleton className="h-5 w-3/5" />
            <div className="mt-2 flex gap-3">
              <Skeleton className="h-12 w-36" />
              <Skeleton className="h-12 w-36" />
            </div>
          </div>
          <Skeleton className="mx-auto aspect-square w-full max-w-[340px] !rounded-full" />
        </div>
        <span className="sr-only">Cargando la información del colegio…</span>
      </div>
    );
  }

  if (error || !institution) {
    return (
      <div className="kid-page flex min-h-screen items-center justify-center px-4 py-10">
        <EstadoAmable
          titulo="No pudimos cargar la página"
          mensaje="Parece que hay un problema de conexión o el servidor está despertando. Inténtalo de nuevo en unos segundos."
          accion={{ texto: "Reintentar", onClick: reintentar }}
        >
          {error && <p className="max-w-md break-words rounded-2xl bg-white/80 px-4 py-2 text-xs font-semibold text-monserrat-ink/55">{error}</p>}
        </EstadoAmable>
      </div>
    );
  }

  if (pathname === "/portal") {
    const adminSession = readSession("monserrat_admin_session");
    if (isAdminRole(adminSession?.rol)) {
      return (
        <AdminPage
          institution={institution}
          ingresantes={ingresantes}
          videos={videos}
          redes={redes}
          onRefresh={loadPageData}
        />
      );
    }

    const academicSession = readSession("monserrat_academic_session");
    if (academicSession?.rol === "DOCENTE" || academicSession?.rol === "ALUMNO") {
      return <PortalAcademicoPage />;
    }

    return <AccessGatewayPage onNavigate={navigateTo} />;
  }

  if (pathname === "/restablecer-password") {
    return <PasswordResetPage onNavigate={navigateTo} />;
  }

  return (
    <Layout institution={institution} redes={redes} secciones={secciones} onChatbotOpen={() => chatbot.setIsOpen(true)}>
      <Hero institution={institution} ingresantes={ingresantes} videos={videos} secciones={secciones} />
      <Carrusel videos={videos} />
      <Ingresantes ingresantes={ingresantes} />
      <DatosGenerales institution={institution} totalIngresantes={ingresantes.length} />
      <Ubicacion institution={institution} />

      <AnnouncementPopup
        announcements={popupAnnouncements}
        isOpen={showAnnouncementPopup && popupAnnouncements.length > 0}
        onClose={() => setShowAnnouncementPopup(false)}
      />

      {chatbot.isOpen ? (
        <ChatbotWindow
          messages={chatbot.messages}
          input={chatbot.input}
          canSend={chatbot.canSend}
          isConnected={chatbot.isConnected}
          isTyping={chatbot.isTyping}
          onInputChange={chatbot.setInput}
          onSend={chatbot.sendMessage}
          onQuickSend={chatbot.sendMessage}
          onClose={() => chatbot.setIsOpen(false)}
        />
      ) : (
        <ChatbotButton onClick={() => chatbot.setIsOpen(true)} />
      )}
    </Layout>
  );
}

export default App;

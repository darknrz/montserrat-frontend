import { useCallback, useEffect, useState } from "react";
import { monserratApi } from "./api/monserrat";
import { ChatbotButton } from "./components/chatbot/ChatbotButton";
import { ChatbotWindow } from "./components/chatbot/ChatbotWindow";
import { Layout } from "./components/layout/Layout";
import { AdminPage } from "./components/sections/AdminPage";
import { Carrusel } from "./components/sections/Carrusel";
import { DatosGenerales } from "./components/sections/DatosGenerales";
import { Hero } from "./components/sections/Hero";
import { Ingresantes } from "./components/sections/Ingresantes";
import { Ubicacion } from "./components/sections/Ubicacion";
import { useChatbot } from "./hooks/useChatbot";
import type { Ingresante, Institution, RedSocial, Video } from "./types";

function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [ingresantes, setIngresantes] = useState<Ingresante[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [redes, setRedes] = useState<RedSocial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chatbot = useChatbot();

  const loadPageData = useCallback(async () => {
    const [institutionData, ingresantesData, videosData, redesData] = await Promise.all([
      monserratApi.institution(),
      monserratApi.ingresantes(),
      monserratApi.videos(),
      monserratApi.redesSociales()
    ]);

    setInstitution(institutionData);
    setIngresantes(ingresantesData.filter((item) => item.activo !== false));
    setVideos(videosData.filter((item) => item.activo !== false).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
    setRedes(redesData.filter((item) => item.activo !== false).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
    setError(null);
  }, []);

  useEffect(() => {
    void loadPageData().catch((requestError: unknown) => {
      setError(requestError instanceof Error ? requestError.message : "No se pudo conectar con el backend");
    }).finally(() => {
      setIsLoading(false);
    });
  }, [loadPageData]);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-monserrat-cream px-4 text-center">
        <div>
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border-2 border-monserrat-gold bg-monserrat-red text-2xl font-black text-monserrat-gold">
            M
          </div>
          <p className="text-lg font-black text-monserrat-ink">Cargando datos desde la base de datos...</p>
        </div>
      </div>
    );
  }

  if (error || !institution) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-monserrat-cream px-4 text-center">
        <div className="max-w-xl rounded-lg border border-red-200 bg-white p-8 shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-monserrat-red text-2xl font-black text-white">
            M
          </div>
          <h1 className="text-2xl font-black text-monserrat-ink">No se pudo cargar la informacion</h1>
          <p className="mt-4 text-sm leading-6 text-monserrat-ink/70">
            El frontend necesita que el backend este activo en http://localhost:8080 y que los endpoints publicos respondan sin token.
          </p>
          {error && <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
        </div>
      </div>
    );
  }

  if (pathname === "/admin") {
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

  return (
    <Layout institution={institution} redes={redes} onChatbotOpen={() => chatbot.setIsOpen(true)}>
      <Hero institution={institution} ingresantes={ingresantes} videos={videos} />
      <Carrusel videos={videos} />
      <Ingresantes ingresantes={ingresantes} />
      <DatosGenerales institution={institution} />
      <Ubicacion institution={institution} />

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

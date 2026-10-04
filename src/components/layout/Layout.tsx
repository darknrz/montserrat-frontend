import type { PropsWithChildren } from "react";
import type { SeccionId } from "../../lib/sitioPublico";
import type { Institution, RedSocial } from "../../types";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";

type LayoutProps = PropsWithChildren<{
  institution: Institution;
  redes: RedSocial[];
  /** Secciones que realmente se muestran (con datos): el menú y el pie solo enlazan a esas. */
  secciones?: Set<SeccionId>;
  onChatbotOpen: () => void;
}>;

export function Layout({ children, institution, redes, secciones, onChatbotOpen }: LayoutProps) {
  return (
    <div className="kid-page min-h-screen">
      <Navbar institution={institution} secciones={secciones} onChatbotOpen={onChatbotOpen} />
      <main>{children}</main>
      <Footer institution={institution} redes={redes} secciones={secciones} />
    </div>
  );
}

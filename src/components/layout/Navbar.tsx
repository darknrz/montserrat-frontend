import { Menu, MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { hayTexto } from "../../lib/sitioPublico";
import type { SeccionId } from "../../lib/sitioPublico";
import type { Institution } from "../../types";

const LINKS: { id: SeccionId; label: string; href: string }[] = [
  { id: "inicio", label: "Inicio", href: "#inicio" },
  { id: "nosotros", label: "Nosotros", href: "#nosotros" },
  { id: "ingresantes", label: "Ingresantes", href: "#ingresantes" },
  { id: "videos", label: "Galería", href: "#videos" },
  { id: "ubicacion", label: "Ubicación", href: "#ubicacion" },
];

type NavbarProps = {
  institution: Institution;
  secciones?: Set<SeccionId>;
  onChatbotOpen: () => void;
};

export function Navbar({ institution, secciones, onChatbotOpen }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  // Solo se enlazan las secciones que existen (con datos).
  const links = LINKS.filter((l) => !secciones || secciones.has(l.id));

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b-2 border-monserrat-gold/25 bg-[#fffaf0]/85 backdrop-blur-xl">
      <nav className="mx-auto flex h-[64px] max-w-6xl items-center gap-4 px-4 sm:px-6" aria-label="Principal">
        <a href="#inicio" className="mr-auto flex min-w-0 items-center gap-3" aria-label="Ir al inicio">
          <img src="/logo-montserrat.png" alt={institution.nombre || "Logo del colegio"} width={40} height={40} className="h-10 w-auto shrink-0 object-contain" />
          {hayTexto(institution.nombre) && (
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-[13px] font-black leading-tight text-monserrat-ink">{institution.nombre}</p>
              {hayTexto(institution.ciudad) && (
                <p className="truncate text-[11px] font-semibold text-monserrat-ink/60">{institution.ciudad}</p>
              )}
            </div>
          )}
        </a>

        <div className="hidden items-center lg:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href}
              className="nav-link whitespace-nowrap rounded-xl px-3.5 py-2 text-[13px] font-bold text-monserrat-ink/80 transition-colors hover:text-monserrat-red">
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <button type="button" onClick={onChatbotOpen} className="kid-btn-soft !min-h-[40px] !px-4 !py-1.5 !text-[13px]">
            <MessageCircle size={15} /> Chatbot
          </button>
          <a href="/portal" className="kid-btn !min-h-[40px] !px-5 !py-1.5 !text-[13px]">Portal</a>
        </div>

        <button type="button" onClick={() => setMobileOpen((o) => !o)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-monserrat-gold/35 bg-white text-monserrat-ink lg:hidden"
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={mobileOpen}>
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="kid-rise border-t-2 border-monserrat-gold/20 bg-[#fffaf0] px-4 py-4 lg:hidden">
          <div className="grid gap-1.5">
            {links.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                className="rounded-2xl bg-white/80 px-4 py-3 text-[15px] font-black text-monserrat-ink/80 transition hover:text-monserrat-red">
                {link.label}
              </a>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { onChatbotOpen(); setMobileOpen(false); }} className="kid-btn-soft">
                <MessageCircle size={16} /> Chatbot
              </button>
              <a href="/portal" className="kid-btn">Portal</a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

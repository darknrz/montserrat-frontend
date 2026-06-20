import { Menu, MessageCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Institution } from "../../types";

const links = [
  { label: "Inicio",      href: "#inicio" },
  { label: "Nosotros",    href: "#nosotros" },
  { label: "Ingresantes", href: "#ingresantes" },
  { label: "Galería",     href: "#videos" },
  { label: "Ubicación",   href: "#ubicacion" },
];

// Declara qué secciones tienen fondo oscuro
const DARK_SECTIONS = new Set(["#inicio"]);

type NavbarProps = {
  institution: Institution;
  onChatbotOpen: () => void;
};

export function Navbar({ institution, onChatbotOpen }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const sectionIds = links.map((l) => l.href);

    // Mapa de qué secciones están visibles y cuánto
    const visibilityMap = new Map<string, number>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          visibilityMap.set(`#${entry.target.id}`, entry.intersectionRatio);
        });

        // La sección más visible gana
        let maxRatio = 0;
        let dominant = "";
        visibilityMap.forEach((ratio, id) => {
          if (ratio > maxRatio) { maxRatio = ratio; dominant = id; }
        });

        if (dominant) setDark(DARK_SECTIONS.has(dominant));
      },
      { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }
    );

    sectionIds.forEach((href) => {
      const el = document.querySelector(href);
      if (el) observerRef.current!.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  // Clases dinámicas según tema
  const bg       = dark ? "bg-white/8  border-white/12"  : "bg-monserrat-cream/72 border-monserrat-ink/10";
  const logo     = dark ? "text-white"                    : "text-monserrat-ink";
  const logoSub  = dark ? "text-white/50"                 : "text-monserrat-ink/50";
  const linkCls  = dark ? "text-white/75 hover:text-white" : "text-monserrat-ink/75 hover:text-monserrat-ink";
  const adminCls = dark
    ? "border-white/25 text-white/60 hover:border-white/50 hover:text-white"
    : "border-monserrat-ink/18 text-monserrat-ink/60 hover:border-monserrat-ink/35 hover:text-monserrat-ink";
  const hamburgerCls = dark
    ? "border-white/20 text-white"
    : "border-monserrat-ink/15 text-monserrat-ink";

  return (
    <header className={`fixed inset-x-0 top-0 z-40 backdrop-blur-xl transition-colors duration-300 ${bg}`}>
      <nav className="relative mx-auto flex h-[52px] max-w-[1100px] items-center px-6">

        {/* Logo */}
        <a href="#inicio" className="flex items-center gap-2.5 mr-auto">
          {institution.logoUrl ? (
            <img src={institution.logoUrl} alt={institution.nombre}
              className="h-7 w-7 shrink-0 rounded-full border-[1.5px] border-monserrat-gold object-cover" />
          ) : (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[1.5px] border-monserrat-gold bg-monserrat-red text-[11px] font-black text-monserrat-gold">
              M
            </span>
          )}
          <div className="hidden sm:block">
            <p className={`text-[12px] font-black leading-tight transition-colors duration-300 ${logo}`}>
              {institution.nombre}
            </p>
            <p className={`text-[10px] font-medium transition-colors duration-300 ${logoSub}`}>
              {institution.ciudad}
            </p>
          </div>
        </a>

        {/* Links centro */}
        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center lg:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href}
              className={`rounded-lg px-3.5 py-1.5 text-[12px] font-medium whitespace-nowrap transition-colors duration-300 ${linkCls}`}>
              {link.label}
            </a>
          ))}
        </div>

        {/* Acciones derecha */}
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <a href="/portal"
            className={`rounded-full border px-3 py-[5px] text-[11px] font-bold transition-colors duration-300 ${adminCls}`}>
            Portal
          </a>
          <button type="button" onClick={onChatbotOpen}
            className="inline-flex items-center gap-1.5 rounded-full bg-monserrat-red px-3.5 py-[6px] text-[11px] font-black text-white transition hover:bg-monserrat-red/85">
            <MessageCircle size={13} />
            Chatbot
          </button>
        </div>

        {/* Hamburguesa */}
        <button type="button" onClick={() => setMobileOpen((o) => !o)}
          className={`ml-auto inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors duration-300 lg:hidden ${hamburgerCls}`}
          aria-label="Abrir menú">
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      {/* Menú móvil */}
      {mobileOpen && (
        <div className={`border-t px-6 py-4 lg:hidden transition-colors duration-300 ${
          dark ? "border-white/8 bg-monserrat-black/90" : "border-monserrat-ink/8 bg-monserrat-cream/95"
        }`}>
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <a key={link.href} href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-300 ${
                  dark ? "text-white/80 hover:bg-white/8" : "text-monserrat-ink/80 hover:bg-monserrat-ink/5"
                }`}>
                {link.label}
              </a>
            ))}
            <div className={`mt-3 flex gap-2 border-t pt-3 ${dark ? "border-white/8" : "border-monserrat-ink/8"}`}>
              <a href="/portal"
                className={`flex-1 rounded-full border py-2 text-center text-[12px] font-bold transition-colors duration-300 ${adminCls}`}>
                Portal
              </a>
              <button type="button" onClick={() => { onChatbotOpen(); setMobileOpen(false); }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-monserrat-red py-2 text-[12px] font-black text-white">
                <MessageCircle size={13} />
                Chatbot
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

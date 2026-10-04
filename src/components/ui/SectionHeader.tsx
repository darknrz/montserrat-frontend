type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

export function SectionHeader({ eyebrow, title, description, align = "center" }: SectionHeaderProps) {
  const centrado = align === "center";
  return (
    <div className={centrado ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {eyebrow && (
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-monserrat-red/10 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-monserrat-red">
          <span className="h-1.5 w-1.5 rounded-full bg-monserrat-gold" />
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl font-black leading-tight text-monserrat-ink sm:text-4xl md:text-5xl">{title}</h2>
      <span className={`mt-4 block h-1 w-16 rounded-full bg-gradient-to-r from-monserrat-red to-monserrat-gold ${centrado ? "mx-auto" : ""}`} />
      {description && <p className="mt-5 text-base leading-7 text-monserrat-ink/70 md:text-lg">{description}</p>}
    </div>
  );
}

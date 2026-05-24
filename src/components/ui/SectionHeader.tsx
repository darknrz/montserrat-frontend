type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

export function SectionHeader({ eyebrow, title, description, align = "center" }: SectionHeaderProps) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {eyebrow && <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.28em] text-monserrat-red">{eyebrow}</p>}
      <h2 className="text-4xl font-black text-monserrat-ink md:text-5xl">{title}</h2>
      {description && <p className="mt-5 text-base leading-7 text-monserrat-ink/70 md:text-lg">{description}</p>}
    </div>
  );
}

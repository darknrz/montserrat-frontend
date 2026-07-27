import type { Ingresante, Institution, RedSocial, Video } from "../../types";
import { AdminSection } from "./AdminSection";

type AdminPageProps = {
  institution: Institution;
  ingresantes: Ingresante[];
  videos: Video[];
  redes: RedSocial[];
  onRefresh: () => Promise<void>;
};

export function AdminPage({ institution, ingresantes, videos, redes, onRefresh }: AdminPageProps) {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <AdminSection
        institution={institution}
        ingresantes={ingresantes}
        videos={videos}
        redes={redes}
        onRefresh={onRefresh}
      />
    </div>
  );
}

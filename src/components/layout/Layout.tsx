import type { PropsWithChildren } from "react";
import type { Institution, RedSocial } from "../../types";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";

type LayoutProps = PropsWithChildren<{
  institution: Institution;
  redes: RedSocial[];
  onChatbotOpen: () => void;
}>;

export function Layout({ children, institution, redes, onChatbotOpen }: LayoutProps) {
  return (
    <>
      <Navbar institution={institution} onChatbotOpen={onChatbotOpen} />
      <main>{children}</main>
      <Footer institution={institution} redes={redes} />
    </>
  );
}

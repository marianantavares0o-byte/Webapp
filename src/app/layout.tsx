import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexo — Inteligência financeira pessoal",
  description: "Organize seu dinheiro, projete compromissos e acompanhe sua vida financeira em uma experiência clara e sofisticada.",
  applicationName: "Nexo",
  themeColor: "#070C12"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

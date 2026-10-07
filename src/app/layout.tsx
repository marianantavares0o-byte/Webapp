import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexo — Gestão financeira",
  description: "Conecte receitas, despesas e decisões financeiras em um único painel."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
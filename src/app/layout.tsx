"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import "./globals.css";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const publicRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/esqueci-senha") ||
    pathname.startsWith("/redefinir-senha") ||
    pathname.startsWith("/auth");

  useEffect(() => {
    if (publicRoute) {
      setChecking(false);
      return;
    }

    let active = true;

    async function verifySession() {
      const { data } = await createClient().auth.getUser();

      if (!data.user) {
        window.location.replace("/login");
        return;
      }

      if (active) {
        setAuthenticated(true);
        setChecking(false);
      }
    }

    verifySession();

    return () => {
      active = false;
    };
  }, [publicRoute]);

  const canRender = publicRoute || authenticated;

  return (
    <html lang="pt-BR">
      <body>
        {canRender ? children : checking ? <main className="auth-page" /> : null}
      </body>
    </html>
  );
}

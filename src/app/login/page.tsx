"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const ALLOWED_EMAIL = "marianan.tavares0o@gmail.com";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail !== ALLOWED_EMAIL) {
      setError("E-mail ou senha incorretos.");
      return;
    }

    if (password.length < 5 || password.length > 20) {
      setError("A senha deve ter entre 5 e 20 caracteres.");
      return;
    }

    setLoading(true);
    const { error } = await createClient().auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    setLoading(false);

    if (error) {
      setError("E-mail ou senha incorretos.");
      return;
    }

    window.location.href = "/";
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-mark">N</span>
          <strong>Nexo</strong>
        </div>

        <div className="auth-eyebrow">ACESSO RESTRITO</div>
        <h1>Entrar no Nexo</h1>
        <p>Acesse seu planejamento financeiro de forma segura.</p>

        <form onSubmit={submit} className="auth-form">
          <label>
            E-mail
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="seu@email.com"
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              required
              minLength={5}
              maxLength={20}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Digite sua senha"
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button className="primary auth-submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <Link className="auth-link" href="/esqueci-senha">
            Esqueci minha senha
          </Link>
        </form>
      </section>
    </main>
  );
}

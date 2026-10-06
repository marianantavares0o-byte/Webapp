"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (password.length < 5 || password.length > 20) {
      setError("A senha deve ter entre 5 e 20 caracteres.");
      return;
    }
    setLoading(true);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("E-mail ou senha incorretos.");
      return;
    }
    window.location.href = "/";
  }

  return <AuthShell title="Entrar no Fluxo" subtitle="Acesse seu planejamento financeiro.">
    <form onSubmit={submit} className="auth-form">
      <label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" /></label>
      <label>Senha<input type="password" required minLength={5} maxLength={20} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" /></label>
      {error && <p className="auth-error">{error}</p>}
      <button className="primary auth-submit" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
      <Link className="auth-link" href="/esqueci-senha">Esqueci minha senha</Link>
      <div className="auth-divider">ou</div>
      <Link className="auth-secondary" href="/cadastro">Criar uma conta</Link>
    </form>
  </AuthShell>;
}

function AuthShell({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}) {
  return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><span className="brand-mark">F</span><strong>fluxo</strong></div><h1>{title}</h1><p>{subtitle}</p>{children}</section></main>;
}

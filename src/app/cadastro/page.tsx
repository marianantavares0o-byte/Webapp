"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/neon/client";

export default function CadastroPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8 || password.length > 20) {
      setError("A senha deve ter entre 8 e 20 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await createClient().auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setError(
          error.message.toLowerCase().includes("already") ||
          error.message.toLowerCase().includes("exists")
            ? "Este e-mail já possui uma conta. Volte ao início e entre com seu e-mail e senha."
            : error.message
        );
        return;
      }

      if (data.session) {
        window.location.href = "/";
        return;
      }

      setMessage("Conta cadastrada. Volte ao início e entre com seu e-mail e senha para abrir o aplicativo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand"><span className="brand-mark">F</span><strong>fluxo</strong></div>
        <h1>Criar sua conta</h1>
        <p>Seu planejamento financeiro fica separado por usuário.</p>
        <form onSubmit={submit} className="auth-form">
          <label>E-mail<input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>
          <label>Senha<input type="password" required minLength={8} maxLength={20} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" /><small>Entre 8 e 20 caracteres.</small></label>
          <label>Confirmar senha<input type="password" required minLength={8} maxLength={20} value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          {message && <p className="auth-success" role="status">{message}</p>}
          <button className="primary auth-submit" type="submit" disabled={loading}>{loading ? "Criando..." : "Criar conta"}</button>
          <Link className="auth-link" href="/">Voltar ao início para entrar</Link>
        </form>
      </section>
    </main>
  );
}

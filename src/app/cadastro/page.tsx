"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function CadastroPage() {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [confirm,setConfirm]=useState("");
  const [message,setMessage]=useState(""); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);

  async function submit(e:FormEvent){e.preventDefault();setError("");setMessage("");
    if(password.length<5||password.length>20){setError("A senha deve ter entre 5 e 20 caracteres.");return;}
    if(password!==confirm){setError("As senhas não coincidem.");return;}
    setLoading(true);
    const {data,error}=await createClient().auth.signUp({email,password});
    setLoading(false);
    if(error){setError(error.message.includes("already")?"Este e-mail já possui uma conta.":"Não foi possível criar a conta.");return;}
    if(data.session){window.location.href="/";return;}
    setMessage("Conta criada. Verifique seu e-mail para confirmar o cadastro e depois faça login.");
  }

  return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><svg className="brand-mark" viewBox="0 0 48 48" fill="none" aria-hidden="true"><defs><linearGradient id="nexo-mark-gradient" x1="12" y1="14" x2="36" y2="34" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#45e1ad"/><stop offset="100%" stopColor="#5797ff"/></linearGradient></defs><rect x="3.5" y="3.5" width="41" height="41" stroke="url(#nexo-mark-gradient)" strokeWidth="2.4" strokeLinejoin="miter"/><path d="M12 31V14L36 34V14" stroke="url(#nexo-mark-gradient)" strokeWidth="2.7" strokeLinecap="butt" strokeLinejoin="miter"/></svg><strong>Nexo</strong></div><h1>Criar sua conta</h1><p>Seu planejamento financeiro fica separado por usuário.</p>
    <form onSubmit={submit} className="auth-form">
      <label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>
      <label>Senha<input type="password" required minLength={5} maxLength={20} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password"/><small>Entre 5 e 20 caracteres.</small></label>
      <label>Confirmar senha<input type="password" required minLength={5} maxLength={20} value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password"/></label>
      {error&&<p className="auth-error">{error}</p>}{message&&<p className="auth-success">{message}</p>}
      <button className="primary auth-submit" disabled={loading}>{loading?"Criando...":"Criar conta"}</button>
      <Link className="auth-link" href="/login">Já tenho uma conta</Link>
    </form>
  </section></main>;
}
